import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { FiCheckCircle, FiAlertCircle, FiUser, FiUsers, FiList, FiBell } from 'react-icons/fi';

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkoutLists: 0,
    totalFeedback: 0,
    pendingFeedback: 0,
    recentUsers: [],
    recentFeedback: []
  });
  
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseText, setResponseText] = useState('');
  
  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('plan_type')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Erro ao verificar permissões:', error);
          toast.error('Erro ao verificar permissões de administrador');
          router.push('/dashboard');
          return;
        }
        
        if (data && data.plan_type === 'admin') {
          setIsAdmin(true);
          // Carregar estatísticas
          loadStats();
        } else {
          toast.error('Acesso restrito. Você não tem permissões de administrador.');
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Erro:', err);
        toast.error('Ocorreu um erro ao verificar suas permissões');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, [user, supabase, router]);
  
  // Carregar estatísticas para o dashboard de administração
  const loadStats = async () => {
    try {
      // Obter contagem total de usuários
      const { count: totalUsers, error: totalError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      
      if (totalError) throw totalError;
      
      // Contar usuários admin
      const { count: adminUsers, error: adminError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_type', 'admin');
      
      if (adminError) throw adminError;
      
      // Contar usuários pagos
      const { count: paidUsers, error: paidError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_type', 'paid');
      
      if (paidError) throw paidError;
      
      // Contar usuários gratuitos
      const { count: freeUsers, error: freeError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('plan_type', 'free');
      
      if (freeError) throw freeError;
      
      // Contar feedbacks pendentes
      const { count: pendingCount, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente');
      
      if (feedbackError) throw feedbackError;
      
      // Atualizar estado
      setStats({
        totalUsers: totalUsers || 0,
        totalWorkoutLists: 0,
        totalFeedback: 0,
        pendingFeedback: pendingCount || 0,
        recentUsers: [],
        recentFeedback: []
      });
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Não foi possível carregar estatísticas');
    }
  };
  
  const fetchFeedbackList = async () => {
    try {
      setFeedbackLoading(true);
      
      const { data, error } = await supabase
        .from('user_feedback')
        .select(`
          id, 
          subject, 
          message, 
          category, 
          status, 
          response, 
          created_at,
          response_date,
          users (
            id,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setFeedbackItems(data || []);
    } catch (error) {
      console.error('Erro ao buscar feedbacks:', error);
      toast.error('Erro ao carregar feedbacks');
    } finally {
      setFeedbackLoading(false);
    }
  };
  
  const handleSelectFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setResponseText(feedback.response || '');
  };
  
  const handleResponseSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFeedback) return;
    
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .update({
          response: responseText,
          status: 'respondido',
          response_date: new Date().toISOString()
        })
        .eq('id', selectedFeedback.id);
      
      if (error) throw error;
      
      toast.success('Resposta enviada com sucesso!');
      
      // Atualizar a lista de feedbacks
      fetchFeedbackList();
      
      // Limpar a seleção
      setSelectedFeedback(null);
      setResponseText('');
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      toast.error('Erro ao enviar resposta. Tente novamente.');
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  if (loading) {
    return (
      <Layout title="Painel de Administração">
        <div className="flex justify-center items-center h-64">
          <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 dark:border-gray-700 h-12 w-12"></div>
        </div>
      </Layout>
    );
  }
  
  if (!isAdmin) {
    return null; // Redirecionamento já é tratado no useEffect
  }
  
  return (
    <Layout title="Painel de Administração">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold dark-text-primary mb-6">Painel Administrativo</h1>
        
        {/* Abas de navegação */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('dashboard')}
              className={`${
                selectedTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent dark-text-tertiary hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setSelectedTab('feedback');
                fetchFeedbackList();
              }}
              className={`${
                selectedTab === 'feedback'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent dark-text-tertiary hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium`}
            >
              Feedbacks
            </button>
          </nav>
        </div>
        
        {/* Conteúdo das abas */}
        {selectedTab === 'dashboard' && (
          <div>
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="dark-card rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-4">
                    <FiUser className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium dark-text-tertiary">Usuários</p>
                    <p className="text-2xl font-semibold dark-text-primary">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>
              
              <div className="dark-card rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-4">
                    <FiList className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium dark-text-tertiary">Listas de Treino</p>
                    <p className="text-2xl font-semibold dark-text-primary">{stats.totalWorkoutLists}</p>
                  </div>
                </div>
              </div>
              
              <div className="dark-card rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-4">
                    <FiBell className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium dark-text-tertiary">Total de Feedbacks</p>
                    <p className="text-2xl font-semibold dark-text-primary">{stats.totalFeedback}</p>
                  </div>
                </div>
              </div>
              
              <div className="dark-card rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mr-4">
                    <FiBell className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium dark-text-tertiary">Feedbacks Pendentes</p>
                    <p className="text-2xl font-semibold dark-text-primary">{stats.pendingFeedback}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Seções de dados recentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Usuários recentes */}
              <div className="dark-card rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium dark-text-primary">Usuários Recentes</h2>
                </div>
                <div className="p-6">
                  {stats.recentUsers.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {stats.recentUsers.map((user) => (
                        <div key={user.id} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium dark-text-primary">{user.email}</p>
                            <p className="text-sm dark-text-tertiary">ID: {user.id.substring(0, 8)}...</p>
                          </div>
                          <p className="text-sm dark-text-tertiary">{formatDate(user.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="dark-text-tertiary text-center py-4">Nenhum usuário recente encontrado</p>
                  )}
                </div>
              </div>
              
              {/* Feedbacks recentes */}
              <div className="dark-card rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium dark-text-primary">Feedbacks Recentes</h2>
                </div>
                <div className="p-6">
                  {stats.recentFeedback.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {stats.recentFeedback.map((feedback) => (
                        <div key={feedback.id} className="py-3">
                          <div className="flex justify-between items-start">
                            <p className="font-medium dark-text-primary">{feedback.subject}</p>
                            <div className={`text-xs px-2 py-0.5 rounded-full 
                              ${feedback.status === 'respondido' 
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' 
                                : feedback.status === 'em análise'
                                ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}
                            >
                              {feedback.status === 'respondido' ? 'Respondido' : 
                               feedback.status === 'em análise' ? 'Em análise' : 
                               'Pendente'}
                            </div>
                          </div>
                          <div className="flex mt-1 justify-between">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 mr-2">
                              {feedback.category ? 
                                feedback.category.charAt(0).toUpperCase() + feedback.category.slice(1) : 
                                'Sem categoria'}
                            </span>
                            <p className="text-sm dark-text-tertiary">{formatDate(feedback.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="dark-text-tertiary text-center py-4">Nenhum feedback recente encontrado</p>
                  )}
                  
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedTab('feedback');
                        fetchFeedbackList();
                      }}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Ver todos os feedbacks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {selectedTab === 'feedback' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de feedbacks */}
            <div className="lg:col-span-1 dark-card rounded-lg shadow-md overflow-hidden max-h-[80vh]">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium dark-text-primary">Lista de Feedbacks</h2>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(80vh-56px)]"> {/* 56px é a altura do cabeçalho */}
                {feedbackLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 dark:border-gray-700 h-8 w-8"></div>
                  </div>
                ) : feedbackItems.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {feedbackItems.map((feedback) => (
                      <div 
                        key={feedback.id} 
                        onClick={() => handleSelectFeedback(feedback)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 ${
                          selectedFeedback?.id === feedback.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-medium dark-text-primary line-clamp-1">{feedback.subject}</p>
                          <div className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 
                            ${feedback.status === 'respondido' 
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' 
                              : feedback.status === 'em análise'
                              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}
                          >
                            {feedback.status === 'respondido' ? 'Respondido' : 
                             feedback.status === 'em análise' ? 'Em análise' : 
                             'Pendente'}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 mr-2">
                              {feedback.category ? 
                                feedback.category.charAt(0).toUpperCase() + feedback.category.slice(1) : 
                                'Sem categoria'}
                            </span>
                            <p className="text-xs dark-text-tertiary truncate">
                              {feedback.users?.email || 'Usuário desconhecido'}
                            </p>
                          </div>
                          <p className="text-xs dark-text-tertiary">{formatDate(feedback.created_at)}</p>
                        </div>
                        
                        <p className="text-sm dark-text-secondary mt-2 line-clamp-2">
                          {feedback.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dark-text-tertiary text-center py-8">Nenhum feedback encontrado</p>
                )}
              </div>
            </div>
            
            {/* Detalhes do feedback */}
            <div className="lg:col-span-2">
              {selectedFeedback ? (
                <div className="dark-card rounded-lg shadow-md p-6">
                  <div className="mb-6">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-semibold dark-text-primary">{selectedFeedback.subject}</h2>
                      <div className={`text-xs px-2 py-0.5 rounded-full 
                        ${selectedFeedback.status === 'respondido' 
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' 
                          : selectedFeedback.status === 'em análise'
                          ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}
                      >
                        {selectedFeedback.status === 'respondido' ? 'Respondido' : 
                         selectedFeedback.status === 'em análise' ? 'Em análise' : 
                         'Pendente'}
                      </div>
                    </div>
                    
                    <div className="flex items-center mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 mr-2">
                        {selectedFeedback.category ? 
                          selectedFeedback.category.charAt(0).toUpperCase() + selectedFeedback.category.slice(1) : 
                          'Sem categoria'}
                      </span>
                      <p className="text-sm dark-text-tertiary">
                        Enviado por: {selectedFeedback.users?.email || 'Usuário desconhecido'}
                      </p>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                      <p className="text-sm dark-text-tertiary">
                        {formatDate(selectedFeedback.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <h3 className="text-md font-medium dark-text-primary mb-2">Mensagem:</h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                      <p className="dark-text-secondary whitespace-pre-wrap">{selectedFeedback.message}</p>
                    </div>
                  </div>
                  
                  {selectedFeedback.response ? (
                    <div>
                      <h3 className="text-md font-medium dark-text-primary mb-2">Resposta:</h3>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="dark-text-secondary whitespace-pre-wrap">{selectedFeedback.response}</p>
                        
                        {selectedFeedback.response_date && (
                          <p className="text-xs dark-text-tertiary mt-2">
                            Respondido em {formatDate(selectedFeedback.response_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-md font-medium dark-text-primary mb-2">Responder:</h3>
                      <form onSubmit={handleResponseSubmit}>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          className="w-full rounded-md dark-input min-h-[120px]"
                          placeholder="Digite sua resposta para o usuário..."
                          required
                        ></textarea>
                        
                        <div className="mt-4 flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium"
                          >
                            Enviar Resposta
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <div className="dark-card rounded-lg shadow-md flex items-center justify-center h-[400px]">
                  <div className="text-center">
                    <FiBell className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="dark-text-secondary">Selecione um feedback para visualizar os detalhes</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 