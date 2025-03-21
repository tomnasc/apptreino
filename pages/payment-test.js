import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import PaymentButton from '../components/PaymentButton';

export default function PaymentTest() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('production'); // 'production', 'test', 'forced-test'
  const user = useUser();

  // Preços definidos para teste
  const priceProd = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1OQAEDDRd1DJtpnqCUfUlWrQ'; // ID de produção
  const priceTest = 'price_1R4mcCG0twrwKsMTlTaQLjTx'; // ID de teste (substituir pelo seu ID de teste real)

  // Cards de teste para Stripe
  const testCards = [
    { brand: 'Visa', number: '4242 4242 4242 4242', cvc: 'Qualquer 3 dígitos', date: 'Qualquer data futura' },
    { brand: 'Visa (falha)', number: '4000 0000 0000 0002', cvc: 'Qualquer 3 dígitos', date: 'Qualquer data futura' },
    { brand: 'Mastercard', number: '5555 5555 5555 4444', cvc: 'Qualquer 3 dígitos', date: 'Qualquer data futura' },
    { brand: 'Mastercard (autenticação)', number: '5200 8282 8282 8210', cvc: 'Qualquer 3 dígitos', date: 'Qualquer data futura' },
  ];

  useEffect(() => {
    if (user) {
      setUserId(user.id);
    }
    
    // Verificar se estamos em ambiente de desenvolvimento
    const isDev = process.env.NODE_ENV === 'development' || 
                 window.location.hostname === 'localhost' || 
                 window.location.hostname.includes('vercel.app');
    
    if (isDev) {
      setPaymentMode('test');
    }
  }, [user]);

  const handleDirectCheckout = async (useTestMode = false) => {
    try {
      setLoading(true);
      
      const priceId = useTestMode ? priceTest : priceProd;
      
      console.log(`Iniciando checkout direto. Modo de teste: ${useTestMode ? 'Sim' : 'Não'}, ID de preço: ${priceId}`);
      
      const response = await fetch('/api/create-checkout-session-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: userId,
          useTestMode
        }),
      });

      const data = await response.json();
      const sessionUrl = data.sessionUrl || data.url;
      const error = data.error;

      if (error) {
        toast.error(`Erro: ${error}`);
        console.error('Detalhes do erro:', data);
        return;
      }

      if (!sessionUrl) {
        toast.error('A URL da sessão de checkout não foi retornada');
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
        
        <div className="dark-card rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold dark-text-primary mb-4">Configuração atual</h2>
          <p className="dark-text-secondary mb-2">
            <span className="font-medium">Ambiente:</span>{' '}
            {paymentMode === 'production' ? 'Produção' : 'Teste'}
            {paymentMode === 'forced-test' && ' (Forçado)'}
          </p>
          <p className="dark-text-secondary mb-4">
            <span className="font-medium">ID de preço:</span>{' '}
            {paymentMode === 'production' ? priceProd : priceTest}
          </p>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPaymentMode('production')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                paymentMode === 'production' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 dark-text-secondary'
              }`}
            >
              Modo Produção
            </button>
            <button
              onClick={() => setPaymentMode('test')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                paymentMode === 'test' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 dark-text-secondary'
              }`}
            >
              Modo Teste
            </button>
            <button
              onClick={() => setPaymentMode('forced-test')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                paymentMode === 'forced-test' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 dark-text-secondary'
              }`}
            >
              Modo Teste Forçado
            </button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="dark-card rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold dark-text-primary mb-4">Testar Pagamento</h2>
            
            <div className="mb-6">
              <h3 className="font-medium dark-text-primary mb-2">Opções de pagamento:</h3>
              <div className="space-y-4">
                <div>
                  <PaymentButton
                    buttonText="Teste com PaymentButton"
                    priceId={paymentMode === 'production' ? priceProd : priceTest}
                    useTestMode={paymentMode === 'forced-test'}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs dark-text-tertiary">
                    Usando preço configurado e componente PaymentButton
                  </p>
                </div>
                
                <div>
                  <button
                    onClick={() => handleDirectCheckout(paymentMode !== 'production')}
                    disabled={loading || !userId}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium focus:outline-none disabled:opacity-50 w-full"
                  >
                    {loading ? 'Processando...' : 'Checkout Direto via API'}
                  </button>
                  <p className="mt-1 text-xs dark-text-tertiary">
                    Chamada API direta com controle manual
                  </p>
                </div>
              </div>
            </div>
            
            {!userId && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                Você precisa estar logado para testar o pagamento
              </p>
            )}
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
        
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg">
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-300 mb-2">Informações importantes</h3>
          <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-200">
            <li>O modo de teste só funciona com cartões de teste do Stripe</li>
            <li>Em produção, você será cobrado. Use apenas para compras reais</li>
            <li>Para testar completamente, você precisa ter configurado suas chaves do Stripe no .env.local</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
} 