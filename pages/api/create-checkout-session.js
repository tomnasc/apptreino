import Stripe from 'stripe';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  // Apenas permitir método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Criar cliente Supabase
    const supabase = createServerSupabaseClient({ req, res });
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    console.log('Sessão de usuário válida:', session.user.id);
    
    // Inicializar Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Obter informações do usuário com tratamento de erro aprimorado
    let { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('id, stripe_customer_id, first_name, last_name, plan_type')
      .eq('id', session.user.id)
      .maybeSingle();  // Usar maybeSingle para não lançar erro se não encontrar
    
    // Se não encontrar o perfil ou tiver erro, vamos tentar criar um perfil básico
    if (userError || !userData) {
      console.log('Perfil de usuário não encontrado, tentando criar um novo...', 
        userError ? `Erro: ${JSON.stringify(userError)}` : 'Sem perfil existente');
      
      // Verificar se podemos inserir na tabela user_profiles
      const { data: rls, error: rlsError } = await supabase.rpc('check_table_permissions', {
        target_table: 'user_profiles'
      }).catch(e => {
        // Se o RPC não existir, retornamos um objeto simulando que temos permissão
        console.log('RPC check_table_permissions não existe, assumindo que temos permissão');
        return { data: { can_insert: true } };
      });
      
      if (rlsError) {
        console.error('Erro ao verificar permissões:', rlsError);
      } else if (rls && !rls.can_insert) {
        console.error('Usuário não tem permissão para inserir perfil');
        return res.status(403).json({ error: 'Sem permissão para criar perfil de usuário' });
      }
      
      // Vamos tentar uma abordagem diferente se o erro for RLS
      // Verificar se o perfil já existe mas não estamos tendo permissão para ver
      const { data: adminCheck } = await fetch('/api/admin/check-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: session.user.id })
      }).then(r => r.json()).catch(e => {
        console.log('Erro ao verificar perfil via API admin:', e);
        return { exists: false };
      });
      
      if (adminCheck && adminCheck.exists) {
        console.log('Perfil existe mas não temos permissão RLS para visualizar. Usando ID:', adminCheck.id);
        userData = {
          id: session.user.id,
          stripe_customer_id: adminCheck.stripe_customer_id
        };
      } else {
        // Criar um perfil básico para o usuário
        try {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: session.user.id,
              email: session.user.email,
              plan_type: 'free',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Erro detalhado ao criar perfil:', JSON.stringify(createError));
            return res.status(500).json({ 
              error: 'Erro ao criar perfil de usuário',
              details: createError
            });
          }
          
          console.log('Perfil criado com sucesso:', newProfile?.id);
          userData = newProfile;
        } catch (insertError) {
          console.error('Exceção ao criar perfil:', insertError);
          return res.status(500).json({ 
            error: 'Exceção ao criar perfil de usuário',
            details: insertError.message 
          });
        }
      }
    }
    
    // Obter ou criar cliente no Stripe
    let customerId = userData?.stripe_customer_id;
    
    if (!customerId) {
      // Criar novo cliente no Stripe
      try {
        const customer = await stripe.customers.create({
          email: session.user.email,
          name: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || session.user.email,
          metadata: {
            userId: session.user.id
          }
        });
        
        customerId = customer.id;
        console.log('Cliente Stripe criado:', customerId);
        
        // Atualizar o ID do cliente no Supabase
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);
        
        if (updateError) {
          console.error('Erro ao atualizar ID do cliente Stripe:', updateError);
          // Continuar mesmo com erro
        }
      } catch (stripeError) {
        console.error('Erro ao criar cliente no Stripe:', stripeError);
        return res.status(500).json({ 
          error: 'Erro ao criar cliente no Stripe',
          details: stripeError.message 
        });
      }
    }
    
    // Criar sessão de checkout
    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: 'Plano Premium Treino na Mão',
                description: 'Acesso a todos os recursos do Treino na Mão por 1 ano',
              },
              unit_amount: 9900, // R$ 99,00 (em centavos)
              recurring: {
                interval: 'year',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/dashboard`,
        customer: customerId,
        client_reference_id: session.user.id,
        metadata: {
          userId: session.user.id
        }
      });
      
      console.log('Sessão de checkout criada:', checkoutSession.id);
      
      // Registrar a tentativa de checkout na tabela de transações
      try {
        await supabase
          .from('payment_transactions')
          .insert({
            user_id: session.user.id,
            transaction_id: checkoutSession.id,
            status: 'pending',
            created_at: new Date().toISOString()
          });
      } catch (transactionError) {
        console.error('Erro ao registrar tentativa de pagamento:', transactionError);
        // Não bloquear o fluxo por causa deste erro
      }
      
      // Retornar URL da sessão de checkout
      return res.status(200).json({ url: checkoutSession.url });
    } catch (checkoutError) {
      console.error('Erro ao criar sessão de checkout no Stripe:', checkoutError);
      return res.status(500).json({ 
        error: 'Erro ao criar sessão de checkout',
        details: checkoutError.message 
      });
    }
  } catch (error) {
    console.error('Erro geral no endpoint de checkout:', error);
    return res.status(500).json({ 
      error: 'Erro ao iniciar checkout',
      details: error.message || 'Erro desconhecido'
    });
  }
} 