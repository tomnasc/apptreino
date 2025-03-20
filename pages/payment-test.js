import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { loadStripe } from '@stripe/stripe-js';
import PaymentButton from '../components/PaymentButton';

export default function PaymentTestPage() {
  const [stripeKey, setStripeKey] = useState('');
  const [priceId, setPriceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <Layout title="Teste de Pagamento">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Página de Teste de Pagamento</h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200">
            <h3 className="font-bold">Erro detectado:</h3>
            <p>{error}</p>
          </div>
        )}
        
        <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Configuração do Stripe</h2>
          <p><strong>Chave pública:</strong> {stripeKey.startsWith('pk_') ? `${stripeKey.substring(0, 7)}...` : stripeKey}</p>
          <p><strong>Ambiente:</strong> {stripeKey.includes('_live_') ? 'Produção ⚠️' : 'Teste ✅'}</p>
          <p><strong>ID do preço:</strong> {loading ? 'Carregando...' : priceId || 'Não disponível'}</p>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Cartões de Teste</h2>
          <p className="mb-4 text-gray-600">Use estes cartões de teste para simular diferentes cenários de pagamento:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md p-3 bg-green-50">
              <h3 className="font-medium text-green-800">Pagamento Bem-sucedido</h3>
              <p className="font-mono mt-2">4242 4242 4242 4242</p>
              <p className="text-sm text-gray-600 mt-1">Data: qualquer futura | CVV: qualquer</p>
            </div>
            
            <div className="border rounded-md p-3 bg-yellow-50">
              <h3 className="font-medium text-yellow-800">Autenticação 3D Secure</h3>
              <p className="font-mono mt-2">4000 0000 0000 3220</p>
              <p className="text-sm text-gray-600 mt-1">Data: qualquer futura | CVV: qualquer</p>
            </div>
            
            <div className="border rounded-md p-3 bg-red-50">
              <h3 className="font-medium text-red-800">Pagamento Recusado</h3>
              <p className="font-mono mt-2">4000 0000 0000 0002</p>
              <p className="text-sm text-gray-600 mt-1">Data: qualquer futura | CVV: qualquer</p>
            </div>
            
            <div className="border rounded-md p-3 bg-red-50">
              <h3 className="font-medium text-red-800">Fundos Insuficientes</h3>
              <p className="font-mono mt-2">4000 0000 0000 9995</p>
              <p className="text-sm text-gray-600 mt-1">Data: qualquer futura | CVV: qualquer</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <PaymentButton 
            buttonText="Checkout via API (Recomendado)" 
            priceId={priceId}
            variant="primary"
            className="w-full sm:w-auto"
          />
          
          <button
            onClick={handleTestClick}
            disabled={loading || !priceId}
            className="px-4 py-2 rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-600 w-full sm:w-auto"
          >
            Checkout via Stripe.js
          </button>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Esta página é apenas para testes. Em ambiente de produção, use cartões reais.</p>
          <p>Para mais informações, consulte a <a href="https://stripe.com/docs/testing" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">documentação de testes do Stripe</a>.</p>
        </div>
      </div>
    </Layout>
  );
} 