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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }
  
  if (!isAdmin) return null;
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Comunicação e Feedback</h1>
          <p className="text-gray-600">Gerencie feedback e comunicação com seus usuários.</p>
        </div>
        
        {/* Filters */}
        <div className="mb-6">
          <div className="flex bg-white p-1 rounded-lg shadow-sm overflow-x-auto space-x-1">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handleFilterChange('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => handleFilterChange('responded')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'responded' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Respondidos
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {feedbackList.length > 0 ? (
              feedbackList.map(feedback => (
                <div 
                  key={feedback.id} 
                  className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                    feedback.status === 'responded' ? 'border-green-500' : 'border-yellow-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{getUserName(feedback.user_id)}</div>
                      <div className="text-xs text-gray-500">{formatDate(feedback.created_at)}</div>
                    </div>
                    <div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        feedback.status === 'responded' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {feedback.status === 'responded' ? 'Respondido' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="font-medium text-gray-800">{feedback.subject || feedback.title || 'Sem assunto'}</div>
                    <p className="text-gray-700 whitespace-pre-line">{feedback.message}</p>
                  </div>
                  
                  {feedback.status === 'responded' && feedback.answer && (
                    <div className="bg-gray-50 p-3 rounded-md mb-3">
                      <div className="text-xs text-gray-500 mb-1">
                        Resposta em {feedback.response_date ? formatDate(feedback.response_date) : 'data desconhecida'}
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{feedback.answer}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSelectFeedback(feedback)}
                      className={`flex items-center text-sm px-3 py-1 rounded ${
                        feedback.status === 'responded' 
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {feedback.status === 'responded' ? (
                        <>
                          <FiMessageCircle className="mr-1" />
                          Ver Resposta
                        </>
                      ) : (
                        <>
                          <FiSend className="mr-1" />
                          Responder
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-500 mb-2">
                  {filter === 'pending' 
                    ? 'Não há feedback pendente' 
                    : filter === 'responded' 
                      ? 'Nenhum feedback foi respondido ainda' 
                      : 'Nenhum feedback recebido'}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Reply Modal */}
        {showReplyForm && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">
                  {selectedFeedback.status === 'responded' ? 'Visualizar Feedback' : 'Responder Feedback'}
                </h3>
                <button 
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiXCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium">{getUserName(selectedFeedback.user_id)}</div>
                  <div className="text-xs text-gray-500">{formatDate(selectedFeedback.created_at)}</div>
                </div>
                <div className="font-medium text-gray-800 mb-2">{selectedFeedback.subject || selectedFeedback.title || 'Sem assunto'}</div>
                <p className="text-gray-700 whitespace-pre-line">{selectedFeedback.message}</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sua resposta
                </label>
                <textarea
                  rows="5"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite sua resposta para o usuário..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendReply}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-block animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full mr-2"></span>
                  ) : (
                    <FiSend className="mr-2" />
                  )}
                  {selectedFeedback.status === 'responded' ? 'Atualizar Resposta' : 'Enviar Resposta'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 