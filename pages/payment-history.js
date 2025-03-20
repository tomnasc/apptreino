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
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'success':
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Histórico de Pagamentos
        </h1>
        
        {/* Resumo da assinatura */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sua Assinatura</h2>
          
          {loading ? (
            <p className="text-gray-500">Carregando detalhes...</p>
          ) : subscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Plano</p>
                  <p className="font-medium">
                    {subscription.plan_type === 'paid' ? 'Premium' : 
                     subscription.plan_type === 'free' ? 'Gratuito' : 
                     subscription.plan_type === 'admin' ? 'Administrador' : 
                     'Desconhecido'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(subscription.subscription_status)}`}>
                      {subscription.subscription_status === 'active' ? 'Ativa' :
                       subscription.subscription_status === 'canceled' ? 'Cancelada' :
                       subscription.subscription_status === 'past_due' ? 'Pagamento Pendente' :
                       subscription.subscription_status || 'N/A'}
                    </span>
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Validade</p>
                  <p className="font-medium">{formatDate(subscription.expiry_date)}</p>
                </div>
              </div>
              
              {subscription.plan_type === 'paid' && new Date(subscription.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleRenewSubscription}
                    className="btn-primary text-sm"
                  >
                    Renovar Assinatura
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Sua assinatura {new Date(subscription.expiry_date) < new Date() ? 'expirou' : 'expirará em breve'}. 
                    Renove para continuar aproveitando todos os recursos premium.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma informação de assinatura encontrada.</p>
          )}
        </div>
        
        {/* Histórico de transações */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transações</h2>
          
          {loading ? (
            <p className="text-gray-500">Carregando histórico...</p>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Data
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Valor
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Método
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.payment_method === 'card' ? 'Cartão' : 
                         transaction.payment_method === 'boleto' ? 'Boleto' : 
                         transaction.payment_method || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(transaction.status)}`}>
                          {transaction.status === 'success' ? 'Concluído' :
                           transaction.status === 'pending' ? 'Pendente' :
                           transaction.status === 'failed' ? 'Falhou' :
                           transaction.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Você ainda não realizou nenhuma transação.</p>
          )}
        </div>
      </div>
    </Layout>
  );
} 