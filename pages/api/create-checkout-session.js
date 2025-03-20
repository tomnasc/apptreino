import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import Stripe from 'stripe';

export default async function handler(req, res) {
  // Apenas permitir método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Criar cliente Supabase no servidor
    const supabase = createServerSupabaseClient({ req, res });
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const user = session.user;
    
    // Obter detalhes do usuário
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      console.error('Erro ao obter perfil:', profileError);
      return res.status(500).json({ error: 'Erro ao obter perfil de usuário' });
    }
    
    // Inicializar Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Determinar o preço com base no plano atual
    // Se o usuário já estiver em um plano pago, este seria um processo de renovação
    const isRenewal = userProfile.plan_type === 'paid' && 
                     (!userProfile.expiry_date || new Date(userProfile.expiry_date) < new Date());
    
    // Criar sessão de checkout do Stripe
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        isRenewal: isRenewal ? 'true' : 'false',
      },
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
    });

    // Retornar URL da sessão de checkout
    res.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação de pagamento' });
  }
} 