import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../../components/Layout';
import { FiMessageCircle, FiCheckCircle, FiXCircle, FiSend } from 'react-icons/fi';

export default function AdminFeedback() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackList, setFeedbackList] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'responded'
  
  useEffect(() => {
    if (user) {
      checkIfAdmin();
    }
  }, [user]);
  
  const checkIfAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('plan_type')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      if (data && data.plan_type === 'admin') {
        setIsAdmin(true);
        loadFeedback();
      } else {
        toast.error('Você não tem permissão para acessar esta página');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast.error('Erro ao verificar permissões');
    } finally {
      setLoading(false);
    }
  };
  
  const loadFeedback = async () => {
    try {
      setLoading(true);
      
      // Buscar feedback com condição de filtro
      let query = supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (filter === 'responded') {
        query = query.eq('status', 'responded');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Buscar perfis de usuários para exibir nomes
      const userIds = [...new Set(data.map(item => item.user_id))];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds);
          
        if (profilesError) {
          console.warn('Erro ao buscar perfis de usuários:', profilesError);
        } else {
          // Criar objeto para mapear IDs para perfis
          const profileMap = {};
          profiles.forEach(profile => {
            profileMap[profile.id] = profile;
          });
          setUserProfiles(profileMap);
        }
      }
      
      setFeedbackList(data || []);
    } catch (error) {
      console.error('Erro ao carregar feedback:', error);
      toast.error('Erro ao carregar lista de feedback');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setReplyMessage(feedback.answer || '');
    setShowReplyForm(true);
  };
  
  const handleClose = () => {
    setSelectedFeedback(null);
    setReplyMessage('');
    setShowReplyForm(false);
  };
  
  const handleSendReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Por favor, digite uma resposta');
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('user_feedback')
        .update({
          answer: replyMessage,
          response_date: new Date().toISOString(),
          responded_by: user.id,
          status: 'responded'
        })
        .eq('id', selectedFeedback.id);
        
      if (error) throw error;
      
      // Opcionalmente, enviar email de notificação ao usuário
      try {
        await supabase.functions.invoke('notify-feedback-response', {
          body: {
            feedbackId: selectedFeedback.id,
            userId: selectedFeedback.user_id,
            response: replyMessage
          }
        });
      } catch (emailError) {
        // Não falhar se o email não puder ser enviado
        console.warn('Erro ao enviar email de notificação:', emailError);
      }
      
      toast.success('Resposta enviada com sucesso');
      handleClose();
      loadFeedback();
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      toast.error('Erro ao enviar resposta');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    // Recarregar feedback com novo filtro
    loadFeedback();
  };
  
  const getUserName = (userId) => {
    const profile = userProfiles[userId];
    return profile ? (profile.full_name || profile.email) : 'Usuário #' + userId.substring(0, 6);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (loading && !isAdmin) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      </Layout>
    );
  }
  
  if (!isAdmin) return null;
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark-text-primary mb-2">Comunicação e Feedback</h1>
          <p className="dark-text-secondary">Gerencie feedback e comunicação com seus usuários.</p>
        </div>
        
        {/* Filters */}
        <div className="mb-6">
          <div className="flex dark-card p-1 rounded-lg shadow-sm overflow-x-auto space-x-1">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handleFilterChange('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'pending' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => handleFilterChange('responded')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'responded' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Respondidos
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {feedbackList.length > 0 ? (
              feedbackList.map(feedback => (
                <div 
                  key={feedback.id} 
                  className={`dark-card rounded-lg shadow p-4 border-l-4 ${
                    feedback.status === 'responded' ? 'border-green-500 dark:border-green-600' : 'border-yellow-500 dark:border-yellow-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium dark-text-primary">{getUserName(feedback.user_id)}</div>
                      <div className="text-xs dark-text-tertiary">{formatDate(feedback.created_at)}</div>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        feedback.status === 'responded'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {feedback.status === 'responded' ? (
                          <>
                            <FiCheckCircle className="mr-1" />
                            Respondido
                          </>
                        ) : (
                          <>
                            <FiMessageCircle className="mr-1" />
                            Pendente
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="dark-text-primary whitespace-pre-line">
                      {feedback.message}
                    </div>
                  </div>
                  
                  {feedback.status === 'responded' ? (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Resposta:
                      </div>
                      <div className="dark-text-secondary whitespace-pre-line">
                        {feedback.answer}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSelectFeedback(feedback)}
                        className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <FiSend className="mr-1" />
                        Responder
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="dark-card rounded-lg shadow p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <FiMessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mt-2 text-sm font-medium dark-text-primary">Nenhum feedback encontrado</h3>
                <p className="mt-1 text-sm dark-text-tertiary">
                  {filter === 'pending' 
                    ? 'Não há feedbacks pendentes no momento.'
                    : filter === 'responded'
                    ? 'Não há feedbacks respondidos para exibir.'
                    : 'Não encontramos nenhum feedback.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Modal para responder feedback */}
      {selectedFeedback && showReplyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="dark-card rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium dark-text-primary">
                Responder Feedback
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
              >
                <FiXCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium dark-text-tertiary mb-1">
                  De:
                </label>
                <div className="dark-text-primary">
                  {getUserName(selectedFeedback.user_id)}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium dark-text-tertiary mb-1">
                  Mensagem:
                </label>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <div className="dark-text-primary whitespace-pre-line">
                    {selectedFeedback.message}
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="reply" className="block text-sm font-medium dark-text-tertiary mb-1">
                  Sua resposta:
                </label>
                <textarea
                  id="reply"
                  rows={5}
                  className="dark-input mt-1 block w-full rounded-md"
                  placeholder="Digite sua resposta..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium dark-text-primary hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md shadow-sm text-sm font-medium focus:outline-none disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar Resposta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 