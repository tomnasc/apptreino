import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { FiSend, FiMessageCircle } from 'react-icons/fi';

export default function Feedback() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [formValues, setFormValues] = useState({
    subject: '',
    category: 'sugestão',
    message: ''
  });
  
  useEffect(() => {
    if (user) {
      loadFeedbackHistory();
    }
  }, [user]);
  
  const loadFeedbackHistory = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setFeedbackHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de feedback:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formValues.subject.trim() || !formValues.message.trim()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Tentando usar 'subject' primeiro e, se falhar, tentar com 'title'
      try {
        const { data, error } = await supabase
          .from('user_feedback')
          .insert({
            user_id: user.id,
            subject: formValues.subject,
            category: formValues.category,
            message: formValues.message
          });
          
        if (error) throw error;
        
        toast.success('Feedback enviado com sucesso! Obrigado pela sua contribuição.');
      } catch (insertError) {
        console.warn('Erro ao usar "subject", tentando com "title":', insertError);
        
        // Se falhou com 'subject', tente com 'title'
        const { data, error } = await supabase
          .from('user_feedback')
          .insert({
            user_id: user.id,
            title: formValues.subject, // Usa o valor de subject mas na coluna title
            category: formValues.category,
            message: formValues.message
          });
          
        if (error) throw error;
        
        toast.success('Feedback enviado com sucesso! Obrigado pela sua contribuição.');
      }
      
      setFormValues({
        subject: '',
        category: 'sugestão',
        message: ''
      });
      
      // Recarregar o histórico
      await loadFeedbackHistory();
      setShowHistory(true);
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast.error('Erro ao enviar feedback. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
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
  
  if (!user) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[70vh]">
          <div className="text-center">
            <p className="mb-4 text-lg">Você precisa estar logado para enviar feedback.</p>
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Fazer Login
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Envie seu Feedback</h1>
          <p className="text-gray-600">
            Compartilhe suas sugestões, dúvidas ou relate problemas. Sua opinião é importante para que possamos melhorar sua experiência.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Feedback */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título para seu feedback"
                  value={formValues.subject}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  id="category"
                  name="category"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formValues.category}
                  onChange={handleInputChange}
                >
                  <option value="sugestão">Sugestão</option>
                  <option value="dúvida">Dúvida</option>
                  <option value="problema">Problema</option>
                  <option value="elogio">Elogio</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva em detalhes sua sugestão, dúvida ou problema..."
                  value={formValues.message}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="inline-block animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full mr-2"></span>
                  ) : (
                    <FiSend className="mr-2" />
                  )}
                  {submitting ? 'Enviando...' : 'Enviar Feedback'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Histórico de Feedback */}
          <div>
            <div className="flex items-center mb-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <FiMessageCircle className="mr-2" />
                {showHistory ? 'Ocultar histórico' : 'Ver meu histórico de feedback'}
              </button>
              {loading && (
                <span className="ml-3 inline-block animate-spin h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full"></span>
              )}
            </div>
            
            {showHistory && (
              <div className="space-y-4">
                {feedbackHistory.length > 0 ? (
                  feedbackHistory.map((feedback) => (
                    <div
                      key={feedback.id}
                      className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                        feedback.status === 'responded' ? 'border-green-500' : 'border-yellow-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-800">{feedback.subject || feedback.title || 'Sem assunto'}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          feedback.status === 'responded' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {feedback.status === 'responded' ? 'Respondido' : 'Pendente'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        Enviado em {formatDate(feedback.created_at)}
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                        {feedback.message}
                      </div>
                      
                      {feedback.status === 'responded' && feedback.answer && (
                        <div className="bg-gray-50 p-3 rounded-md mt-3">
                          <div className="text-xs text-gray-500 mb-1">
                            Resposta em {feedback.response_date ? formatDate(feedback.response_date) : 'data desconhecida'}
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-line">
                            {feedback.answer}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-500">
                    Você ainda não enviou nenhum feedback.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 