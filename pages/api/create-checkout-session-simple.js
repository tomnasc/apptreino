import Stripe from 'stripe';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

// Endpoint simplificado para diagnóstico do problema
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Vamos definir headers de CORS para permitir identificar problemas de origem
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Longs detalhados para diagnóstico
  console.log('=== DIAGNÓSTICO DE CHECKOUT ===');
  console.log('Requisição recebida em:', new Date().toISOString());
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    console.log('Verificando variáveis de ambiente...');
    
    // Verificar se as variáveis necessárias estão definidas
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY não está definida');
      return res.status(500).json({ 
        error: 'Configuração incompleta', 
        details: 'Variável de ambiente STRIPE_SECRET_KEY não está definida' 
      });
    }

    // Verificar se o price_id do Stripe está configurado
    const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
    if (!STRIPE_PRICE_ID) {
      console.error('STRIPE_PRICE_ID não está definido');
      return res.status(500).json({
        error: 'Configuração incompleta',
        details: 'ID do preço do Stripe não configurado'
      });
    }
    
    console.log('Criando cliente Supabase...');
    
    // Criar cliente Supabase
    const supabase = createServerSupabaseClient({ req, res });
    
    console.log('Verificando autenticação...');
    
    // Verificar autenticação
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Erro ao obter sessão:', sessionError);
      return res.status(401).json({ error: 'Erro de autenticação', details: sessionError });
    }
    
    if (!sessionData || !sessionData.session) {
      console.error('Sessão não encontrada');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const session = sessionData.session;
    console.log('Sessão válida para o usuário:', session.user.id);
    
    console.log('Inicializando Stripe...');
    
    // Inicializar Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16', // Especificar versão da API
    });
    
    console.log('Criando sessão de checkout com o price_id:', STRIPE_PRICE_ID);
    
    // Criar sessão de checkout usando o price_id pré-configurado
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID, // Usar o price_id pré-configurado
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'https://www.treinonamao.app'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://www.treinonamao.app'}/dashboard`,
      client_reference_id: session.user.id,
      metadata: {
        userId: session.user.id
      }
    });
    
    console.log('Sessão de checkout criada com sucesso:', checkoutSession.id);
    console.log('URL de checkout:', checkoutSession.url);
    
    // Retornar URL da sessão de checkout
    return res.status(200).json({ url: checkoutSession.url });
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
      error: 'Erro ao iniciar checkout',
      details: error.message || 'Erro desconhecido',
      errorType: error.type || error.name || 'Erro geral',
      errorCode: error.code || 'unknown'
    });
  }
} 