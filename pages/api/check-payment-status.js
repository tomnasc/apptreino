import Stripe from 'stripe';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Obter parâmetros da requisição
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'ID da sessão não fornecido' });
    }
    
    // Criar cliente Supabase no servidor
    const supabase = createServerSupabaseClient({ req, res });
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    // Inicializar Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Buscar a sessão de checkout
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Verificar se a sessão pertence ao usuário autenticado
    if (checkoutSession.client_reference_id !== session.user.id && 
        checkoutSession.metadata?.userId !== session.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Obter status do pagamento
    let status = 'pending';
    
    if (checkoutSession.payment_status === 'paid') {
      status = 'paid';
      
      // Verificar se o perfil do usuário já foi atualizado pelo webhook
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('plan_type, subscription_status')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('Erro ao verificar perfil:', profileError);
      } else if (userProfile.plan_type !== 'paid') {
        // Se o webhook não processou ainda, atualizar o perfil do usuário aqui
        // Isso pode acontecer se a notificação do webhook estiver atrasada
        
        // Obter detalhes da assinatura
        const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription);
        
        // Calcular data de expiração
        const expiryDate = new Date(subscription.current_period_end * 1000);
        
        // Atualizar perfil do usuário
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            plan_type: 'paid',
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            expiry_date: expiryDate.toISOString(),
            last_payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);
        
        if (updateError) {
          console.error('Erro ao atualizar perfil após verificação:', updateError);
        }
      }
    } else if (checkoutSession.payment_status === 'unpaid') {
      status = 'failed';
    }
    
    // Retornar status atual
    res.status(200).json({ status });
  } catch (error) {
    console.error('Erro ao verificar status de pagamento:', error);
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
} 