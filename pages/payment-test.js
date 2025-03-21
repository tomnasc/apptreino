import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import PaymentButton from '../components/PaymentButton';

export default function PaymentTest() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = useUser();

  // Preço de produção
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1OQAEDDRd1DJtpnqCUfUlWrQ';

  // Cards de demonstração para Stripe
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
  }, [user]);

  const handleDirectCheckout = async () => {
    try {
      setLoading(true);
      
      console.log(`Iniciando checkout direto com ID de preço: ${priceId}`);
      
      const response = await fetch('/api/create-checkout-session-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: userId
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
          <p className="dark-text-secondary mb-4">
            <span className="font-medium">ID de preço:</span>{' '}
            <span className="font-mono">{priceId}</span>
          </p>
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
                    priceId={priceId}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs dark-text-tertiary">
                    Usando componente PaymentButton
                  </p>
                </div>
                
                <div>
                  <button
                    onClick={() => handleDirectCheckout()}
                    disabled={loading || !userId}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium focus:outline-none disabled:opacity-50 w-full"
                  >
                    {loading ? 'Processando...' : 'Checkout Direto via API'}
                  </button>
                  <p className="mt-1 text-xs dark-text-tertiary">
                    Chamada API direta
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
            <h2 className="text-xl font-semibold dark-text-primary mb-4">Cartões de Demonstração</h2>
            <p className="text-sm dark-text-secondary mb-4">
              Estes cartões são apenas exemplos do formato aceito. Use seu cartão real para pagamentos.
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
            <li>As transações nesta página são reais e resultarão em cobranças no seu cartão</li>
            <li>Use seu cartão normal para fazer pagamentos</li>
            <li>A renovação da assinatura é automática e pode ser cancelada a qualquer momento na página de perfil</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
} 