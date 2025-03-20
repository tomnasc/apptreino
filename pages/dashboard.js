import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../components/Layout';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { checkUserAccess } from '../utils/checkUserAccess';
import PaymentButton from '../components/PaymentButton';

export default function DashboardPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [workoutLists, setWorkoutLists] = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [userAccessInfo, setUserAccessInfo] = useState({
    hasAccess: true,
    message: '',
    daysLeft: null,
    planType: 'free'
  });

  useEffect(() => {
    if (user) {
      fetchData();
      checkAccess();
    }
  }, [user]);

  // Verificar acesso do usuário
  const checkAccess = async () => {
    if (!user) return;
    
    try {
      // Verificar o acesso usando o utilitário
      const accessInfo = await checkUserAccess(user, supabase);
      
      // Buscar o perfil do usuário para saber o plano
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('plan_type')
        .eq('id', user.id)
        .single();
      
      setUserAccessInfo({
        ...accessInfo,
        planType: profile?.plan_type || 'free'
      });
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Buscar listas de treinos
      const { data: listsData, error: listsError } = await supabase
        .from('workout_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (listsError) {
        console.error('Erro ao buscar listas de treinos:', listsError);
        throw listsError;
      }
      setWorkoutLists(listsData || []);

      // Buscar treinos recentes
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workout_sessions')
        .select('*, workout_list:workout_list_id(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (workoutsError) {
        console.error('Erro ao buscar sessões de treinos:', workoutsError);
        throw workoutsError;
      }
      
      // Garantir que os dados são válidos antes de atribuir ao state
      if (Array.isArray(workoutsData)) {
        setRecentWorkouts(workoutsData || []);
      } else {
        console.warn('Dados de sessões de treino não são um array:', workoutsData);
        setRecentWorkouts([]);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error.message || error);
      toast.error('Não foi possível carregar seus dados. Por favor, tente novamente.');
      setWorkoutLists([]);
      setRecentWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const clearWorkoutHistory = async () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico de treinos? Esta ação não pode ser desfeita.')) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('workout_sessions')
          .delete()
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Atualizar a lista de treinos recentes após a limpeza
        setRecentWorkouts([]);
        alert('Histórico de treinos removido com sucesso!');
      } catch (error) {
        console.error('Erro ao limpar histórico:', error);
        alert('Ocorreu um erro ao limpar o histórico de treinos.');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Função para executar a configuração das políticas
  const handleConfigureDataCollection = async () => {
    try {
      if (window.confirm('Deseja definir as políticas de segurança para coleta detalhada de dados de treino?')) {
        setIsConfiguring(true);
        
        const response = await fetch('/api/execute-policy-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        let result;
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error('Erro ao processar JSON da resposta:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
        
        if (!response.ok) {
          console.error('Resposta de erro do servidor:', result);
          throw new Error(
            result && result.message 
              ? result.message 
              : 'Erro ao configurar políticas. Verifique o console para detalhes.'
          );
        }
        
        toast.success('Configuração concluída com sucesso!');
        alert('Configuração concluída! Agora você pode coletar dados detalhados dos treinos.');
      }
    } catch (error) {
      console.error('Erro ao configurar:', error);
      // Tratamento avançado para qualquer tipo de erro
      let errorMessage = 'Erro ao configurar políticas';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error) || errorMessage;
      } else if (error === null || error === undefined) {
        errorMessage = 'Erro desconhecido';
      } else {
        errorMessage = String(error);
      }
      
      toast.error(errorMessage);
      alert('Erro: ' + errorMessage);
    } finally {
      setIsConfiguring(false);
    }
  };

  // Adicionar uma nova função para iniciar o checkout
  const handleUpgradeClick = async () => {
    try {
      toast.loading('Preparando checkout...', { id: 'checkout' });
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.url) {
        // Redirecionar para a página de checkout do Stripe
        toast.dismiss('checkout');
        window.location.href = data.url;
      } else {
        console.error('Erro ao criar sessão de checkout:', data.error);
        toast.error('Não foi possível iniciar o checkout', { id: 'checkout' });
      }
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
      toast.error('Erro ao conectar ao serviço de pagamento', { id: 'checkout' });
    }
  };

  return (
    <Layout title="Dashboard">
      {/* Banner de plano/período de teste */}
      {userAccessInfo.planType !== 'admin' && (
        <div className={`mb-6 px-4 py-3 rounded-lg shadow-sm ${
          userAccessInfo.planType === 'paid' 
            ? 'bg-green-50 border border-green-200'
            : userAccessInfo.hasAccess
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-medium ${
                userAccessInfo.planType === 'paid'
                  ? 'text-green-800'
                  : userAccessInfo.hasAccess
                    ? 'text-blue-800'
                    : 'text-red-800'
              }`}>
                {userAccessInfo.planType === 'paid'
                  ? 'Plano Premium'
                  : 'Plano Gratuito'}
              </h3>
              <p className={`text-xs ${
                userAccessInfo.planType === 'paid'
                  ? 'text-green-600'
                  : userAccessInfo.hasAccess
                    ? 'text-blue-600'
                    : 'text-red-600'
              }`}>
                {userAccessInfo.message}
              </p>
            </div>
            {(!userAccessInfo.hasAccess || userAccessInfo.daysLeft < 3) && userAccessInfo.planType !== 'paid' && (
              <PaymentButton 
                buttonText="Fazer Upgrade" 
                variant={!userAccessInfo.hasAccess ? 'danger' : 'primary'} 
                className="text-xs px-2 py-1"
              />
            )}
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Bem-vindo ao seu dashboard de treinos
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card bg-blue-50 border border-blue-100">
              <h2 className="text-lg font-semibold text-blue-800 mb-4">
                Resumo
              </h2>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <span className="font-medium">{workoutLists.length}</span> listas de treinos
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">{recentWorkouts.length}</span> treinos realizados
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href="/workout-lists"
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                  Ver todas as listas
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="card bg-green-50 border border-green-100">
              <h2 className="text-lg font-semibold text-green-800 mb-4">
                Iniciar Treino
              </h2>
              <p className="text-gray-700 mb-4">
                Selecione uma lista de treinos para começar a treinar agora
              </p>
              {loading ? (
                <p>Carregando...</p>
              ) : workoutLists.length > 0 ? (
                <div className="space-y-2">
                  {workoutLists.slice(0, 3).map((list) => (
                    <Link
                      key={list.id}
                      href={`/workout-mode/${list.id}`}
                      className="btn-secondary block text-center"
                    >
                      {list.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  Você ainda não tem listas de treinos.{' '}
                  <Link href="/workout-lists/new" className="text-blue-600 hover:text-blue-800">
                    Crie uma agora
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Treinos recentes</h2>
            {recentWorkouts.length > 0 && (
              <button
                onClick={clearWorkoutHistory}
                className="px-3 py-1 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100"
                disabled={loading}
              >
                {loading ? 'Limpando...' : 'Limpar Histórico'}
              </button>
            )}
          </div>
          
          {loading ? (
            <p>Carregando...</p>
          ) : recentWorkouts.length > 0 ? (
            <>
              <div className="block sm:hidden">
                {/* Versão em Cards para telas pequenas (mobile) */}
                <div className="space-y-4">
                  {recentWorkouts.map((session) => (
                    <div key={session.id} className="bg-gray-50 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between">
                        <div className="text-sm font-medium">{formatDate(session.created_at)}</div>
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            session.completed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {session.completed ? 'Concluído' : 'Em progresso'}
                        </span>
                      </div>
                      
                      <div className="mt-2">
                        <div className="font-medium text-gray-900">
                          {session.workout_list?.name || 'Lista removida'}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Duração: {session.duration ? `${Math.round(session.duration / 60)} min` : 'N/A'}
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-end">
                        {!session.completed ? (
                          <Link
                            href={`/workout-mode/${session.workout_list_id}?session=${session.id}`}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Retomar Treino
                          </Link>
                        ) : (
                          <Link
                            href={`/workout-report/${session.id}`}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Ver Relatório
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="hidden sm:block overflow-x-auto">
                {/* Versão em Tabela para telas maiores */}
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
                        Lista de Treino
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Duração
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-sm font-medium"
                      >
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentWorkouts.map((session) => (
                      <tr key={session.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(session.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {session.workout_list?.name || 'Lista removida'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {session.duration ? `${Math.round(session.duration / 60)} min` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              session.completed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {session.completed ? 'Concluído' : 'Em progresso'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!session.completed ? (
                            <Link
                              href={`/workout-mode/${session.workout_list_id}?session=${session.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Retomar Treino
                            </Link>
                          ) : (
                            <Link
                              href={`/workout-report/${session.id}`}
                              className="text-green-600 hover:text-green-900"
                            >
                              Ver Relatório
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-gray-500">
              Você ainda não realizou nenhum treino.{' '}
              {workoutLists.length > 0 ? (
                <Link
                  href={`/workout-mode/${workoutLists[0]?.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Comece agora
                </Link>
              ) : (
                <Link href="/workout-lists/new" className="text-blue-600 hover:text-blue-800">
                  Crie uma lista de treinos
                </Link>
              )}
              .
            </p>
          )}
        </div>

        <div className="mt-8 mb-4 flex justify-end">
          <button
            onClick={handleConfigureDataCollection}
            className="text-gray-600 text-sm flex items-center hover:text-blue-600 transition-colors bg-white hover:bg-blue-50 border border-gray-300 rounded px-3 py-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Configurar coleta de dados
          </button>
        </div>
      </div>
      
      {/* Incluir limitação para usuários com acesso expirado */}
      {!userAccessInfo.hasAccess && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Seu período de teste expirou</h3>
          <p className="text-sm text-red-600 mb-4">
            Para continuar utilizando todos os recursos do Treino na Mão, faça upgrade para o plano Premium.
          </p>
          <PaymentButton
            buttonText="Fazer Upgrade Agora"
            variant="danger"
          />
        </div>
      )}
    </Layout>
  );
} 