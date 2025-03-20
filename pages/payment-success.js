import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import Layout from '../components/Layout';
import { toast } from 'react-hot-toast';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const session = useSession();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    // Verificar a sessão de pagamento
    async function checkPaymentSession() {
      if (!session_id || !session) return;

      try {
        setLoading(true);
        
        // Verificar status da sessão de pagamento
        const response = await fetch('/api/check-payment-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: session_id }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setPaymentStatus(data.status);
          
          // Atualizar informações do usuário localmente
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (!profileError && profileData && profileData.plan_type === 'paid') {
            toast.success('Sua conta foi atualizada para o plano Premium!');
          }
        } else {
          console.error('Erro ao verificar pagamento:', data.error);
          toast.error('Não foi possível verificar o status do pagamento');
        }
      } catch (error) {
        console.error('Erro ao processar verificação de pagamento:', error);
        toast.error('Ocorreu um erro ao processar a verificação');
      } finally {
        setLoading(false);
      }
    }
    
    checkPaymentSession();
  }, [session_id, session, supabase]);

  // Redirecionar para dashboard após 5 segundos
  useEffect(() => {
    if (paymentStatus) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, router]);

  return (
    <Layout title="Pagamento Processado">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Pagamento Processado!
          </h1>
          
          {loading ? (
            <p className="text-gray-600 mb-4">Verificando sua transação...</p>
          ) : paymentStatus === 'paid' ? (
            <>
              <p className="text-gray-600 mb-4">
                Seu pagamento foi processado com sucesso e sua conta foi atualizada para o plano Premium!
                Agora você tem acesso a todos os recursos do App Treino.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Você será redirecionado ao dashboard em 5 segundos...
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Ir para o Dashboard
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                Seu pagamento está sendo processado. Por favor, aguarde enquanto atualizamos seu plano.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Se o seu plano não for atualizado em breve, entre em contato com nosso suporte.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Voltar ao Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
} 