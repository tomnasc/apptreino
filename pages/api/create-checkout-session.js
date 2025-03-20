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
    
    // Inicializar Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Obter informações do usuário com tratamento de erro aprimorado
    let { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('id, stripe_customer_id, first_name, last_name, plan_type')
      .eq('id', session.user.id)
      .maybeSingle();  // Usar maybeSingle para não lançar erro se não encontrar
    
    // Se não encontrar o perfil ou tiver erro, vamos criar um perfil básico
    if (userError || !userData) {
      console.log('Perfil de usuário não encontrado, criando um novo...', userError);
      
      // Criar um perfil básico para o usuário
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
        console.error('Erro ao criar perfil de usuário:', createError);
        return res.status(500).json({ error: 'Erro ao criar perfil de usuário' });
      }
      
      // Usar o novo perfil
      userData = newProfile;
    }
    
    // Obter ou criar cliente no Stripe
    let customerId = userData?.stripe_customer_id;
    
    if (!customerId) {
      // Criar novo cliente no Stripe
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || session.user.email,
        metadata: {
          userId: session.user.id
        }
      });
      
      customerId = customer.id;
      
      // Atualizar o ID do cliente no Supabase
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);
      
      if (updateError) {
        console.error('Erro ao atualizar ID do cliente:', updateError);
        // Continuar mesmo com erro
      }
    }
    
    // Criar sessão de checkout
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
    } catch (err) {
      console.error('Erro ao registrar tentativa de pagamento:', err);
      // Não bloquear o fluxo por causa deste erro
    }
    
    // Retornar URL da sessão de checkout
    res.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({ error: 'Erro ao iniciar checkout' });
  }
} 