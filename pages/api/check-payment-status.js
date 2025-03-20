import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'ID da sessão não fornecido' });
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
    
    // Buscar a sessão no Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Verificar se a sessão pertence ao usuário correto
    if (checkoutSession.client_reference_id !== session.user.id) {
      return res.status(403).json({ error: 'Acesso negado a esta sessão de pagamento' });
    }
    
    // Obter status do pagamento
    const paymentStatus = checkoutSession.payment_status;
    
    // Verificar se o usuário já está com o plano atualizado
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('plan_type, subscription_id, subscription_status')
      .eq('id', session.user.id)
      .single();
      
    if (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      return res.status(500).json({ error: 'Erro ao verificar status do usuário' });
    }
    
    // Se o pagamento estiver concluído, mas o status do usuário não estiver atualizado,
    // e se o webhook ainda não processou, podemos atualizar aqui manualmente
    if (paymentStatus === 'paid' && profile.plan_type !== 'paid' && !profile.subscription_id) {
      // Calcular nova data de expiração (1 ano a partir de agora)
      const now = new Date();
      const expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
      
      // Atualizar perfil
      await supabase
        .from('user_profiles')
        .update({
          plan_type: 'paid',
          subscription_id: checkoutSession.subscription,
          subscription_status: 'active',
          payment_status: 'paid',
          last_payment_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
        })
        .eq('id', session.user.id);
    }
    
    // Retornar status do pagamento
    res.status(200).json({
      status: paymentStatus,
      planType: profile.plan_type,
      subscriptionStatus: profile.subscription_status,
    });
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ error: 'Erro ao verificar status do pagamento' });
  }
} 