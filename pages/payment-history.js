import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../components/Layout';
import { toast } from 'react-hot-toast';

export default function PaymentHistoryPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      
      // Buscar transações do usuário
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (transactionsError) {
        throw transactionsError;
      }
      
      setTransactions(transactionsData || []);
      
      // Buscar detalhes da assinatura atual
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('plan_type, subscription_id, subscription_status, expiry_date')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        throw profileError;
      }
      
      setSubscription(profileData);
      
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamentos:', error);
      toast.error('Não foi possível carregar seu histórico de pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'BRL') => {
    if (amount === undefined || amount === null) return 'N/A';
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusClass = (status) => {
    if (!status) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    
    switch (status.toLowerCase()) {
      case 'success':
      case 'paid':
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
      case 'failed':
      case 'canceled':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const handleRenewSubscription = async () => {
    try {
      toast.loading('Preparando renovação...', { id: 'renew' });
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.url) {
        toast.dismiss('renew');
        window.location.href = data.url;
      } else {
        console.error('Erro ao iniciar renovação:', data.error);
        toast.error('Não foi possível iniciar a renovação', { id: 'renew' });
      }
    } catch (error) {
      console.error('Erro ao renovar assinatura:', error);
      toast.error('Erro ao conectar ao serviço de pagamento', { id: 'renew' });
    }
  };

  return (
    <Layout title="Histórico de Pagamentos">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold dark-text-primary mb-6">
          Histórico de Pagamentos
        </h1>
        
        {/* Resumo da assinatura */}
        <div className="dark-card rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold dark-text-primary mb-4">Sua Assinatura</h2>
          
          {loading ? (
            <p className="dark-text-tertiary">Carregando detalhes...</p>
          ) : subscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Plano</p>
                  <p className="font-medium dark-text-secondary">
                    {subscription.plan_type === 'paid' ? 'Premium' : 
                     subscription.plan_type === 'free' ? 'Gratuito' : 
                     subscription.plan_type === 'admin' ? 'Administrador' : 
                     'Desconhecido'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <p className="font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(subscription.subscription_status)}`}>
                      {subscription.subscription_status ? 
                        subscription.subscription_status.charAt(0).toUpperCase() + 
                        subscription.subscription_status.slice(1) 
                        : 'N/A'}
                    </span>
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expira em</p>
                  <p className="font-medium dark-text-secondary">
                    {subscription.expiry_date ? formatDate(subscription.expiry_date) : 'N/A'}
                  </p>
                </div>
              </div>
              
              {subscription.subscription_status === 'active' && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm dark-text-tertiary mb-4">
                    Seu plano será renovado automaticamente na data de expiração. Se quiser cancelar a renovação automática, acesse sua conta no provedor de pagamento.
                  </p>
                </div>
              )}
              
              {subscription.subscription_status !== 'active' && subscription.plan_type !== 'admin' && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm dark-text-tertiary mb-4">
                    {subscription.plan_type === 'paid' 
                      ? 'Sua assinatura está inativa ou foi cancelada. Para continuar aproveitando os benefícios do plano Premium, renove sua assinatura.'
                      : 'Assine o plano Premium para ter acesso a todos os recursos do aplicativo.'}
                  </p>
                  <button
                    onClick={handleRenewSubscription}
                    className="btn-primary"
                  >
                    {subscription.plan_type === 'paid' ? 'Renovar Assinatura' : 'Assinar Plano Premium'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="dark-text-tertiary">Nenhuma informação de assinatura disponível</p>
          )}
        </div>
        
        {/* Histórico de transações */}
        <div className="dark-card rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold dark-text-primary mb-4">Histórico de Transações</h2>
          
          {loading ? (
            <p className="dark-text-tertiary">Carregando transações...</p>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ID da Transação
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800/30 divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm dark-text-tertiary">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm dark-text-secondary">
                        {transaction.description || 'Assinatura Premium'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm dark-text-secondary">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(transaction.status)}`}>
                          {transaction.status ? 
                            transaction.status.charAt(0).toUpperCase() + 
                            transaction.status.slice(1) 
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-mono">
                          {transaction.transaction_id ? 
                            `${transaction.transaction_id.slice(0, 6)}...${transaction.transaction_id.slice(-4)}` 
                            : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="dark-text-tertiary">Nenhuma transação encontrada</p>
          )}
        </div>
      </div>
    </Layout>
  );
} 