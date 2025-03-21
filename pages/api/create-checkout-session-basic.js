import Stripe from 'stripe';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

// Endpoint básico para criar sessão de checkout diretamente, sem criar cliente ou perfil
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  console.log('=== DIAGNÓSTICO CHECKOUT BÁSICO ===');
  console.log('Requisição recebida em:', new Date().toISOString());
  
  try {
    // Verificar variáveis de ambiente
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY não está definida');
      return res.status(500).json({ 
        error: 'Configuração incompleta', 
        details: 'Chave secreta do Stripe não está definida' 
      });
    }

    // Verificar se é ambiente de teste
    const isTestEnv = stripeSecretKey.startsWith('sk_test_');
    console.log('Ambiente:', isTestEnv ? 'TESTE' : 'PRODUÇÃO');

    // Inicializar Stripe com versão específica da API
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Verificar autenticação do usuário
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Erro de autenticação:', sessionError || 'Sessão não encontrada');
      return res.status(401).json({ 
        error: 'Não autenticado', 
        details: 'Você precisa estar logado para acessar este recurso' 
      });
    }

    const userId = session.user.id;
    console.log('Usuário autenticado:', userId);

    // Criar sessão de checkout básica
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Teste de Checkout - Plano Básico',
              description: 'Produto de teste para diagnóstico do Stripe',
            },
            unit_amount: 500, // R$ 5,00
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'https://www.treinonamao.app'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://www.treinonamao.app'}/stripe-debug`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        testMode: 'true',
      }
    });

    console.log('Sessão criada com sucesso. ID:', checkoutSession.id);
    console.log('URL de checkout:', checkoutSession.url);

    return res.status(200).json({ 
      url: checkoutSession.url,
      id: checkoutSession.id
    });
  } catch (error) {
    console.error('ERRO DETALHADO:', error);
    console.error('Nome do erro:', error.name);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.type && error.type.startsWith('Stripe')) {
      console.error('Erro do Stripe:', {
        type: error.type,
        code: error.code,
        param: error.param,
        detail: error.detail
      });
    }
    
    return res.status(500).json({ 
      error: 'Erro ao criar sessão de checkout', 
      details: error.message || 'Erro desconhecido',
      errorType: error.type || error.name || 'Unknown error',
    });
  }
} 