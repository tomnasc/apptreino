import { buffer } from 'micro';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

// Desabilitar o parsing do corpo da requisição pelo Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret não configurado' });
  }

  try {
    // Obter o corpo da requisição como buffer
    const buf = await buffer(req);
    const signature = req.headers['stripe-signature'];
    
    // Verificar a assinatura do evento
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        buf.toString(),
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error(`Erro na assinatura do webhook: ${err.message}`);
      return res.status(400).json({ error: 'Evento inválido' });
    }

    // Criar cliente Supabase no servidor
    const supabase = createServerSupabaseClient({ req, res });

    // Processar eventos específicos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Verificar se é um pagamento de assinatura
        if (session.mode === 'subscription') {
          const userId = session.client_reference_id || session.metadata?.userId;
          
          if (!userId) {
            console.error('ID de usuário não encontrado no evento');
            return res.status(400).json({ error: 'ID de usuário não encontrado' });
          }
          
          // Obter detalhes da assinatura
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          // Calcular data de expiração (1 ano a partir de agora, ou conforme definido na assinatura)
          const currentDate = new Date();
          let expiryDate = new Date();
          expiryDate.setFullYear(currentDate.getFullYear() + 1); // Padrão é 1 ano
          
          if (subscription.current_period_end) {
            expiryDate = new Date(subscription.current_period_end * 1000);
          }
          
          // Atualizar perfil do usuário no Supabase
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
            .eq('id', userId);
          
          if (updateError) {
            console.error('Erro ao atualizar perfil do usuário:', updateError);
            return res.status(500).json({ error: 'Erro ao atualizar usuário' });
          }
          
          // Registrar a transação no histórico
          const { error: transactionError } = await supabase
            .from('payment_transactions')
            .insert({
              user_id: userId,
              transaction_id: session.id,
              subscription_id: subscription.id,
              amount: session.amount_total / 100, // Converter de centavos para unidade monetária
              currency: session.currency,
              status: 'success',
              payment_method: session.payment_method_types[0],
              created_at: new Date().toISOString()
            });
          
          if (transactionError) {
            console.error('Erro ao registrar transação:', transactionError);
            // Não retornamos erro aqui para não falhar o webhook, já que o usuário foi atualizado
          }
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          // Buscar a assinatura para obter o ID do cliente
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer;
          
          // Buscar o usuário pelo customer_id no Stripe
          const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('id, subscription_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
          
          // Se não encontrarmos pelo customer_id, tentamos pelo subscription_id
          let userId = userData?.id;
          if (!userId && subscription.id) {
            const { data: subData, error: subError } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('subscription_id', subscription.id)
              .maybeSingle();
              
            userId = subData?.id;
          }
          
          if (userId) {
            // Calcular nova data de expiração
            const expiryDate = new Date(subscription.current_period_end * 1000);
            
            // Atualizar perfil do usuário
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                plan_type: 'paid',
                subscription_status: subscription.status,
                expiry_date: expiryDate.toISOString(),
                last_payment_date: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);
              
            if (updateError) {
              console.error('Erro ao atualizar perfil após renovação:', updateError);
            }
            
            // Registrar a transação
            const { error: transactionError } = await supabase
              .from('payment_transactions')
              .insert({
                user_id: userId,
                transaction_id: invoice.id,
                subscription_id: subscriptionId,
                amount: invoice.amount_paid / 100,
                currency: invoice.currency,
                status: 'success',
                payment_method: invoice.payment_method_type || 'unknown',
                created_at: new Date().toISOString()
              });
              
            if (transactionError) {
              console.error('Erro ao registrar transação de renovação:', transactionError);
            }
          } else {
            console.error('Usuário não encontrado para a assinatura:', subscriptionId);
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // Buscar o usuário pela assinatura
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('subscription_id', subscription.id)
          .maybeSingle();
          
        if (userData?.id) {
          // Atualizar o status da assinatura para cancelado
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'canceled',
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id);
            
          if (updateError) {
            console.error('Erro ao atualizar status de assinatura cancelada:', updateError);
          }
        } else {
          console.error('Usuário não encontrado para assinatura cancelada:', subscription.id);
        }
        break;
      }
    }

    // Responder ao Stripe com sucesso
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno ao processar webhook' });
  }
} 