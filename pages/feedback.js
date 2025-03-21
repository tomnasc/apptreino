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
            <p className="mb-4 text-lg dark-text-secondary">Você precisa estar logado para enviar feedback.</p>
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
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
          <h1 className="text-2xl font-bold dark-text-primary mb-2">Envie seu Feedback</h1>
          <p className="dark-text-secondary">
            Compartilhe suas sugestões, dúvidas ou relate problemas. Sua opinião é importante para que possamos melhorar sua experiência.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Formulário de feedback */}
          <div className="md:w-2/3">
            <div className="dark-card rounded-lg shadow-md p-6">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="subject" className="block text-sm font-medium dark-text-secondary mb-1">
                    Assunto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formValues.subject}
                    onChange={handleInputChange}
                    className="w-full rounded-md dark-input"
                    placeholder="Digite o assunto do seu feedback"
                    maxLength={100}
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="category" className="block text-sm font-medium dark-text-secondary mb-1">
                    Categoria
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formValues.category}
                    onChange={handleInputChange}
                    className="w-full rounded-md dark-input"
                  >
                    <option value="sugestão">Sugestão</option>
                    <option value="bug">Problema/Bug</option>
                    <option value="dúvida">Dúvida</option>
                    <option value="elogio">Elogio</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="message" className="block text-sm font-medium dark-text-secondary mb-1">
                    Mensagem <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formValues.message}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full rounded-md dark-input"
                    placeholder="Descreva em detalhes seu feedback, sugestão ou problema"
                    maxLength={2000}
                    required
                  ></textarea>
                </div>
                
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex items-center"
                  >
                    <FiSend className="mr-2" />
                    {submitting ? 'Enviando...' : 'Enviar Feedback'}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center text-sm font-medium"
              >
                <FiMessageCircle className="mr-2" />
                {showHistory ? 'Ocultar histórico de feedback' : 'Ver histórico de feedback'}
              </button>
            </div>
          </div>
          
          {/* Bloco informativo */}
          <div className="md:w-1/3">
            <div className="dark-card bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4">Informações</h3>
              <div className="space-y-4 text-sm">
                <p className="dark-text-secondary">
                  Seu feedback é fundamental para melhorarmos o aplicativo. Estamos sempre buscando aprimorar a experiência dos usuários.
                </p>
                <p className="dark-text-secondary">
                  Todos os feedbacks são analisados pela nossa equipe e levados em consideração no planejamento de melhorias.
                </p>
                <div className="pt-4 border-t border-blue-100 dark:border-blue-800/50">
                  <p className="text-blue-800 dark:text-blue-300 font-medium mb-2">Dicas para um bom feedback:</p>
                  <ul className="list-disc list-inside dark-text-secondary space-y-1">
                    <li>Seja específico sobre o que está sugerindo ou relatando</li>
                    <li>Se está relatando um problema, descreva os passos para reproduzi-lo</li>
                    <li>Inclua informações relevantes como a página onde encontrou o problema</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Histórico de feedback */}
        {showHistory && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold dark-text-primary mb-4">Seu Histórico de Feedback</h2>
            {loading ? (
              <p className="dark-text-tertiary">Carregando seu histórico...</p>
            ) : feedbackHistory.length > 0 ? (
              <div className="space-y-4">
                {feedbackHistory.map((item) => (
                  <div key={item.id} className="dark-card rounded-lg shadow-md p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium dark-text-primary">{item.subject || item.title}</h3>
                        <div className="flex items-center mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                            {item.category ? 
                              item.category.charAt(0).toUpperCase() + item.category.slice(1) : 
                              'Sem categoria'}
                          </span>
                          <span className="text-xs dark-text-tertiary ml-2">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full 
                          ${item.status === 'respondido' 
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' 
                            : item.status === 'em análise'
                            ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}
                        >
                          {item.status === 'respondido' ? 'Respondido' :
                           item.status === 'em análise' ? 'Em análise' :
                           'Pendente'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm dark-text-secondary whitespace-pre-wrap">{item.message}</p>
                    </div>
                    {item.response && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium dark-text-primary mb-1">Resposta:</p>
                        <p className="text-sm dark-text-secondary whitespace-pre-wrap">{item.response}</p>
                        <p className="text-xs dark-text-tertiary mt-1">
                          Respondido em {formatDate(item.response_date)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="dark-text-tertiary">Você ainda não enviou nenhum feedback.</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
} 