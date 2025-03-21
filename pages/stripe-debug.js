import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Layout from '../components/Layout';
import PaymentButton from '../components/PaymentButton';

export default function StripeDebugPage() {
  const [stripeKey, setStripeKey] = useState('');
  const [isTest, setIsTest] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar a chave pública do Stripe que está sendo usada
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    setStripeKey(publishableKey || 'Não definida');
    setIsTest(publishableKey?.includes('_test_') || false);
    setLoading(false);
  }, []);

  const handleTestStripe = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Iniciando teste do Stripe com a chave:', 
        stripeKey?.substring(0, 7) + '...' + stripeKey?.substring(stripeKey.length - 4));
      
      // Tentar carregar o Stripe
      const stripe = await loadStripe(stripeKey);
      if (!stripe) {
        throw new Error('Não foi possível inicializar o Stripe com a chave fornecida');
      }
      
      // Fazer uma simples requisição para verificar a conexão
      const { error: stripeError } = await stripe.redirectToCheckout({
        // Usar um ID de sessão fictício para forçar um erro controlado
        sessionId: 'cs_test_invalid_for_debugging',
      });
      
      // Isso sempre resultará em erro, mas é um erro esperado e controlado
      // que mostra que conseguimos conectar ao Stripe
      if (stripeError) {
        console.log('Stripe conectado com sucesso, erro esperado:', stripeError);
        setError({
          type: 'expected',
          message: 'Stripe inicializado com sucesso. Erro esperado devido ao ID de sessão inválido.'
        });
      }
    } catch (error) {
      console.error('Erro no teste do Stripe:', error);
      setError({
        type: 'unexpected',
        message: `Erro inesperado: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Diagnóstico do Stripe">
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Diagnóstico do Stripe</h1>
        
        <div className="mb-8 p-4 bg-gray-50 rounded-md border">
          <h2 className="text-lg font-semibold mb-3">Configuração atual:</h2>
          <p><strong>Chave pública:</strong> {stripeKey ? 
            `${stripeKey.substring(0, 7)}...${stripeKey.substring(stripeKey.length - 4)}` : 
            'Não definida'}
          </p>
          <p><strong>Ambiente:</strong> {isTest ? 
            <span className="text-green-600">Teste ✓</span> : 
            <span className="text-red-600">Produção ⚠️</span>}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {isTest ? 
              'Você está usando o ambiente de teste do Stripe, perfeito para desenvolvimento.' : 
              'Você está usando o ambiente de produção. Para testes, use chaves que começam com pk_test_.'}
          </p>
        </div>
        
        {error && (
          <div className={`mb-6 p-4 rounded-md border ${
            error.type === 'expected' ? 'bg-blue-50 border-blue-200' : 
            'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold ${
              error.type === 'expected' ? 'text-blue-700' : 'text-red-700'
            }`}>
              {error.type === 'expected' ? 'Informação:' : 'Erro:'}
            </h3>
            <p className={error.type === 'expected' ? 'text-blue-600' : 'text-red-600'}>
              {error.message}
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          <button
            onClick={handleTestStripe}
            disabled={loading || !stripeKey}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:bg-gray-300 disabled:text-gray-500"
          >
            {loading ? 'Testando...' : 'Testar conexão com Stripe.js'}
          </button>
          
          <PaymentButton
            buttonText="Checkout direto (método confiável)"
            variant="success"
            className="w-full py-3 px-4 rounded-md font-medium"
            useBasicCheckout={true}
          />
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Esta página ajuda a diagnosticar problemas com a integração do Stripe.</p>
          <p>Se continuar enfrentando problemas, verifique se sua chave pública está corretamente configurada no .env.local e no ambiente de produção.</p>
        </div>
      </div>
    </Layout>
  );
} 