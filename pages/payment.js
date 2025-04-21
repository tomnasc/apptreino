import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { loadStripe } from '@stripe/stripe-js';
import PaymentButton from '../components/PaymentButton';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function Payment() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  useEffect(() => {
    // Verificar se o usuário já tem o plano premium
    const checkUserPlan = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('plan_type, full_name')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          return;
        }
        
        setUserData(data);
        
        // Verificar se há status de sucesso na URL
        if (router.query.success === 'true') {
          setShowSuccessMessage(true);
        }
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkUserPlan();
  }, [user, supabase, router.query]);
  
  // Redirecionamento para a página inicial
  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };
  
  // Renderização para não autenticados
  if (!user) {
    return (
      <Layout title="Plano Premium | Treino Na Mão">
        <div className="py-8 px-4 max-w-3xl mx-auto">
          <div className="dark-card rounded-lg shadow p-6 mb-6">
            <h1 className="text-2xl font-bold dark-text-primary mb-4">Plano Premium</h1>
            <p className="dark-text-secondary mb-4">
              Por favor, faça login para assinar o plano premium e aproveitar todos os benefícios.
            </p>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Link
                href="/login"
                className="py-2 px-4 text-center rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-sm font-medium transition-colors"
              >
                Fazer Login
              </Link>
              <Link
                href="/register"
                className="py-2 px-4 text-center rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark-text-primary text-sm font-medium transition-colors"
              >
                Criar Conta
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Tela de carregamento
  if (loading) {
    return (
      <Layout title="Plano Premium | Treino Na Mão">
        <div className="flex justify-center items-center h-64">
          <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 dark:border-gray-700 h-12 w-12"></div>
        </div>
      </Layout>
    );
  }
  
  // Mensagem de sucesso após a compra
  if (showSuccessMessage || (userData && userData.plan_type === 'paid')) {
    return (
      <Layout title="Plano Premium | Treino Na Mão">
        <div className="py-8 px-4 max-w-3xl mx-auto">
          <div className="dark-card rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold dark-text-primary mb-2">
              {showSuccessMessage ? 'Pagamento Concluído!' : 'Você já é Premium!'}
            </h1>
            <p className="dark-text-secondary mb-6">
              {showSuccessMessage
                ? `Obrigado, ${userData?.full_name || 'usuário'}! Seu plano premium foi ativado com sucesso.`
                : `Olá, ${userData?.full_name || 'usuário'}! Você já está com o plano premium ativo.`}
            </p>
            <p className="dark-text-secondary mb-8">
              Agora você tem acesso a todos os recursos premium do Treino Na Mão. 
              Aproveite treinos personalizados, estatísticas avançadas e muito mais!
            </p>
            <button
              onClick={handleReturnToDashboard}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium transition-colors"
            >
              Ir para o Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Página de pagamento
  return (
    <Layout title="Plano Premium | Treino Na Mão">
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold dark-text-primary mb-2">Plano Premium</h1>
        <p className="dark-text-secondary mb-8">
          Desbloqueie recursos exclusivos e aprimore sua experiência de treino
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Coluna de benefícios */}
          <div>
            <div className="dark-card rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">Benefícios do Plano Premium</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-green-500 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="dark-text-primary font-medium">Treinos ilimitados</p>
                    <p className="dark-text-secondary text-sm">Crie quantos treinos quiser sem restrições</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-green-500 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="dark-text-primary font-medium">Estatísticas avançadas</p>
                    <p className="dark-text-secondary text-sm">Acompanhe seu progresso com gráficos detalhados</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-green-500 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="dark-text-primary font-medium">Suporte prioritário</p>
                    <p className="dark-text-secondary text-sm">Atendimento em até 24 horas em dias úteis</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-green-500 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="dark-text-primary font-medium">Exportação de treinos</p>
                    <p className="dark-text-secondary text-sm">Exporte seus treinos em PDF ou compartilhe com amigos</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-green-500 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="dark-text-primary font-medium">Recursos exclusivos</p>
                    <p className="dark-text-secondary text-sm">Acesso a novos recursos antes de todos</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="dark-card rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium dark-text-primary mb-2">Satisfação garantida</h3>
              <p className="dark-text-secondary mb-4">
                Se não estiver satisfeito, reembolsamos seu pagamento em até 7 dias
                após a compra, sem perguntas.
              </p>
              <div className="flex items-center space-x-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Coluna de checkout */}
          <div className="dark-card rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold dark-text-primary">Plano Premium</h2>
              <div className="mt-2">
                <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">R$9,90</span>
                <span className="dark-text-secondary">/mês</span>
              </div>
              <p className="dark-text-tertiary mt-1">Pagamento único para acesso vitalício</p>
            </div>
            
            <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="dark-text-secondary">Subtotal</span>
                <span className="dark-text-primary font-medium">R$9,90</span>
              </div>
              <div className="flex justify-between">
                <span className="dark-text-secondary">Desconto</span>
                <span className="dark-text-primary font-medium">- R$0,00</span>
              </div>
            </div>
            
            <div className="flex justify-between mb-6">
              <span className="text-lg dark-text-primary font-medium">Total</span>
              <span className="text-lg text-blue-600 dark:text-blue-400 font-bold">R$9,90</span>
            </div>
            
            <div className="mb-6">
              <PaymentButton 
                userId={user?.id}
                buttonText="Assinar Plano Premium"
                className="w-full"
              />
            </div>
            
            <div className="flex items-center justify-center space-x-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs dark-text-tertiary">Pagamento seguro via Stripe</span>
            </div>
            
            <div className="flex justify-center">
              <div className="flex space-x-2">
                <img src="/img/visa.svg" alt="Visa" className="h-6" />
                <img src="/img/mastercard.svg" alt="Mastercard" className="h-6" />
                <img src="/img/amex.svg" alt="American Express" className="h-6" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-10">
          <h3 className="text-lg font-medium dark-text-primary mb-4">Perguntas frequentes</h3>
          <div className="space-y-4">
            <div className="dark-card rounded-lg shadow-md p-4">
              <h4 className="font-medium dark-text-primary mb-2">Posso cancelar a qualquer momento?</h4>
              <p className="dark-text-secondary">
                Sim, você pode cancelar sua assinatura a qualquer momento. Como é um pagamento único, 
                você continuará tendo acesso até o final do período contratado.
              </p>
            </div>
            <div className="dark-card rounded-lg shadow-md p-4">
              <h4 className="font-medium dark-text-primary mb-2">Como funciona o reembolso?</h4>
              <p className="dark-text-secondary">
                Caso não esteja satisfeito, basta entrar em contato conosco em até 7 dias após a compra 
                que processaremos seu reembolso integral, sem perguntas.
              </p>
            </div>
            <div className="dark-card rounded-lg shadow-md p-4">
              <h4 className="font-medium dark-text-primary mb-2">O que acontece com meus dados se eu cancelar?</h4>
              <p className="dark-text-secondary">
                Seus dados e treinos permanecem salvos em sua conta. Caso cancele, você perderá apenas 
                acesso aos recursos premium, mas poderá continuar usando as funcionalidades básicas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 