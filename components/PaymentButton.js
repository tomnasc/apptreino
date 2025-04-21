import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-hot-toast';

export default function PaymentButton({ userId, buttonText = "Assinar Premium", className = "" }) {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      // 1. Criar a sessão de checkout no servidor
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          userId: userId,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // Defina isto em suas variáveis de ambiente
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao iniciar o pagamento');
      }
      
      const { sessionId } = await response.json();
      
      // 2. Redirecionar para o Stripe Checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        throw new Error(error.message);
      }
      
    } catch (error) {
      console.error('Erro no processo de pagamento:', error);
      toast.error(error.message || 'Ocorreu um erro. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para registrar o bônus de afiliado após pagamento bem-sucedido
  const registerAffiliateBonus = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (!token) {
        console.error('Usuário não autenticado');
        return;
      }
      
      const response = await fetch('/api/register-affiliate-bonus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId,
          source: 'app'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Erro ao registrar bônus de afiliado:', error);
        return false;
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Bônus de afiliado registrado com sucesso!');
        toast.success('Seu convite gerou um bônus para quem te indicou!');
      }
      
      return result.success;
    } catch (error) {
      console.error('Erro ao registrar bônus de afiliado:', error);
      return false;
    }
  };
  
  // Verificar se o pagamento foi bem-sucedido e registrar o bônus
  if (router.query.success === 'true' && !loading) {
    // Chamamos registerAffiliateBonus sem bloquear o fluxo principal
    registerAffiliateBonus();
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center ${className}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processando...
        </>
      ) : buttonText}
    </button>
  );
} 