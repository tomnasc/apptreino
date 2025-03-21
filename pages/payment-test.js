import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { loadStripe } from '@stripe/stripe-js';
import PaymentButton from '../components/PaymentButton';
import { useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';

export default function PaymentTest() {
  const [stripeKey, setStripeKey] = useState('');
  const [priceId, setPriceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('direct');
  const user = useUser();

  // Cards de teste para Stripe
  const testCards = [
    { brand: 'Visa', number: '4242 4242 4242 4242', cvc: 'Qualquer 3 dígitos', date: 'Qualquer data futura' },
    { brand: 'Visa (falha)', number: '4000 0000 0000 0002', cvc: 'Qualquer 3 dígitos', date: 'Qualquer data futura' },
    { brand: 'Mastercard', number: '5555 5555 5555 4444', cvc: 'Qualquer 3 dígitos', date: 'Qualquer data futura' },
    { brand: 'Mastercard (autenticação)', number: '5200 8282 8282 8210', cvc: 'Qualquer 3 dígitos', date: 'Qualquer data futura' },
  ];

  useEffect(() => {
    // Verificar se a chave pública do Stripe está definida
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    setStripeKey(publishableKey || 'Não definida');
    
    // Buscar ID do preço
    const fetchPriceId = async () => {
      try {
        const response = await fetch('/api/get-price-id');
        const data = await response.json();
        
        if (response.ok && data.priceId) {
          setPriceId(data.priceId);
        } else {
          setError(`Erro ao buscar ID do preço: ${data.error || 'Erro desconhecido'}`);
        }
      } catch (err) {
        setError(`Falha ao conectar ao endpoint: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPriceId();
  }, []);

  useEffect(() => {
    if (user) {
      setUserId(user.id);
    }
  }, [user]);

  const handleTestClick = async () => {
    try {
      // Inicializar o Stripe
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      
      // Criar uma sessão de checkout diretamente
      const response = await fetch('/api/create-checkout-session-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          priceId: priceId 
        }),
      });
      
      const session = await response.json();
      
      if (!response.ok) {
        throw new Error(session.error || session.details || 'Erro no checkout');
      }
      
      // Redirecionar para o checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Erro no teste de pagamento:', error);
      setError(`Erro no teste: ${error.message}`);
    }
  };

  const handleDirectCheckout = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/create-checkout-session-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: 'price_1OQAEDDRd1DJtpnqCUfUlWrQ', // ID do preço no Stripe
          userId: userId,
        }),
      });

      const { sessionUrl, error } = await response.json();

      if (error) {
        toast.error(`Erro: ${error}`);
        return;
      }

      // Redirecionar para a página de checkout do Stripe
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Teste de Pagamento">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold dark-text-primary mb-6">Página de Teste de Pagamento</h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200">
            <h3 className="font-bold">Erro detectado:</h3>
            <p>{error}</p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="dark-card rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold dark-text-primary mb-4">Testar Pagamento</h2>
            
            <div className="mb-6">
              <h3 className="font-medium dark-text-primary mb-2">Opções de pagamento:</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={paymentMethod === 'direct'}
                    onChange={() => setPaymentMethod('direct')}
                    className="form-radio text-blue-600"
                  />
                  <span className="dark-text-primary">Checkout Direto (recomendado)</span>
                </label>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={handleDirectCheckout}
                disabled={loading || !userId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium focus:outline-none disabled:opacity-50 w-full"
              >
                {loading ? 'Processando...' : 'Iniciar Checkout de Teste'}
              </button>
              
              {!userId && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Você precisa estar logado para testar o pagamento
                </p>
              )}
            </div>
          </div>
          
          <div className="dark-card rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold dark-text-primary mb-4">Cartões de Teste do Stripe</h2>
            <p className="text-sm dark-text-secondary mb-4">
              Use estes cartões para testar diferentes cenários de pagamento. 
              Nenhuma cobrança real será feita.
            </p>
            
            <div className="space-y-4">
              {testCards.map((card, index) => (
                <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium dark-text-primary">{card.brand}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="dark-text-tertiary">Número:</span>{' '}
                      <span className="dark-text-secondary font-mono">{card.number}</span>
                    </div>
                    <div>
                      <span className="dark-text-tertiary">CVC:</span>{' '}
                      <span className="dark-text-secondary">{card.cvc}</span>
                    </div>
                    <div>
                      <span className="dark-text-tertiary">Data:</span>{' '}
                      <span className="dark-text-secondary">{card.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 