import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { buffer } from 'micro';

// Desativar o parsing de corpo padrão do Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

// Função principal do webhook
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Inicializar Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Obter o webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Obter o buffer bruto do corpo
    const rawBody = await buffer(req);
    
    // Obter a assinatura do evento
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({ error: 'Assinatura do webhook não fornecida' });
    }
    
    // Verificar evento
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error(`Erro de verificação de webhook: ${err.message}`);
      return res.status(400).json({ error: `Erro de verificação de webhook: ${err.message}` });
    }
    
    // Inicializar cliente Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Chave de serviço para operações administrativas
    );
    
    // Lidar com os diferentes tipos de evento
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object;
        
        // Verificar se o pagamento foi bem-sucedido
        if (checkoutSession.payment_status === 'paid') {
          const userId = checkoutSession.client_reference_id || checkoutSession.metadata?.userId;
          
          if (!userId) {
            console.error('ID do usuário não encontrado no evento de checkout');
            return res.status(400).json({ error: 'ID do usuário não encontrado' });
          }
          
          // Calcular nova data de expiração (1 ano a partir de agora)
          const now = new Date();
          const expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
          
          // Atualizar perfil do usuário
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              plan_type: 'paid',
              subscription_id: checkoutSession.subscription,
              subscription_status: 'active',
              payment_status: 'paid',
              last_payment_date: new Date().toISOString(),
              expiry_date: expiryDate.toISOString(),
            })
            .eq('id', userId);
            
          if (updateError) {
            console.error('Erro ao atualizar perfil após pagamento:', updateError);
            return res.status(500).json({ error: 'Erro ao atualizar perfil' });
          }
          
          // Registrar transação de pagamento
          const { error: transactionError } = await supabase
            .from('payment_transactions')
            .insert({
              user_id: userId,
              amount: checkoutSession.amount_total / 100, // Converter de centavos para reais
              currency: checkoutSession.currency,
              payment_method: 'stripe',
              payment_id: checkoutSession.id,
              status: 'completed',
              description: 'Assinatura Premium - Anual',
            });
            
          if (transactionError) {
            console.error('Erro ao registrar transação:', transactionError);
            // Continuar mesmo com erro no registro da transação
          }
        }
        break;
      }
      
      case 'invoice.paid': {
        // Lidar com renovações de assinatura
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          // Obter detalhes da assinatura
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            // Calcular nova data de expiração (1 ano a partir de agora para renovações)
            const now = new Date();
            const expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
            
            // Atualizar perfil do usuário
            await supabase
              .from('user_profiles')
              .update({
                plan_type: 'paid',
                subscription_status: 'active',
                payment_status: 'paid',
                last_payment_date: new Date().toISOString(),
                expiry_date: expiryDate.toISOString(),
              })
              .eq('subscription_id', subscriptionId);
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        // Lidar com cancelamentos de assinatura
        const subscription = event.data.object;
        
        // Atualizar qualquer usuário com este ID de assinatura
        await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'canceled',
            // Não alterar plan_type imediatamente para permitir acesso até o fim do período pago
          })
          .eq('subscription_id', subscription.id);
        
        break;
      }
    }
    
    // Responder com sucesso
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
} 