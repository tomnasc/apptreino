import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';

export default function FeedbackPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [feedbackType, setFeedbackType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const [configuringTable, setConfiguringTable] = useState(false);
  
  // Coletar informações do dispositivo automaticamente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const info = [
        `Navegador: ${navigator.userAgent}`,
        `Tela: ${window.innerWidth}x${window.innerHeight}`,
        `Sistema: ${navigator.platform}`
      ].join('\n');
      setDeviceInfo(info);
    }
  }, []);
  
  // Verificar se a tabela de feedback existe
  useEffect(() => {
    const checkTable = async () => {
      try {
        const { error } = await supabase.from('user_feedback').select('id').limit(1);
        if (error) {
          console.log('Tabela de feedback não encontrada:', error.message);
          setTableExists(false);
        } else {
          setTableExists(true);
        }
      } catch (err) {
        console.error('Erro ao verificar tabela:', err);
        setTableExists(false);
      }
    };
    
    checkTable();
  }, [supabase]);
  
  // Função para configurar a tabela de feedback
  const setupFeedbackTable = async () => {
    setConfiguringTable(true);
    
    try {
      const response = await fetch('/api/setup-feedback-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erro ao configurar tabela');
      }
      
      toast.success('Tabela configurada com sucesso!');
      setTableExists(true);
    } catch (error) {
      console.error('Erro ao configurar tabela:', error);
      toast.error('Erro ao configurar tabela. Tente novamente mais tarde.');
    } finally {
      setConfiguringTable(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    setLoading(true);
    
    try {
      // Criar registro na tabela de feedback
      const { data, error } = await supabase
        .from('user_feedback')
        .insert([
          {
            user_id: user?.id,
            email: user?.email,
            feedback_type: feedbackType,
            title,
            description,
            device_info: deviceInfo,
            status: 'pendente'
          }
        ]);
      
      if (error) throw error;
      
      toast.success('Feedback enviado com sucesso!');
      
      // Limpar o formulário
      setTitle('');
      setDescription('');
      setFeedbackType('bug');
      
      // Redirecionar para o dashboard após 2 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast.error('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Layout title="Feedback">
      <div className="max-w-xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Enviar Feedback</h1>
          
          {!tableExists ? (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">Configuração necessária</h3>
              <p className="text-sm text-yellow-700 mb-4">
                A tabela de feedback ainda não foi configurada. Clique no botão abaixo para criar a estrutura necessária.
              </p>
              <button
                onClick={setupFeedbackTable}
                disabled={configuringTable}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {configuringTable ? 'Configurando...' : 'Configurar Tabela de Feedback'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Tipo de Feedback
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-500"
                      name="feedbackType"
                      value="bug"
                      checked={feedbackType === 'bug'}
                      onChange={() => setFeedbackType('bug')}
                    />
                    <span className="ml-2">Reportar Erro</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-500"
                      name="feedbackType"
                      value="feature"
                      checked={feedbackType === 'feature'}
                      onChange={() => setFeedbackType('feature')}
                    />
                    <span className="ml-2">Sugestão</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-500"
                      name="feedbackType"
                      value="other"
                      checked={feedbackType === 'other'}
                      onChange={() => setFeedbackType('other')}
                    />
                    <span className="ml-2">Outro</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={feedbackType === 'bug' ? "Ex: Erro ao iniciar treino" : "Ex: Adicionar novo recurso"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Descrição *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="5"
                  placeholder={feedbackType === 'bug' 
                    ? "Descreva o erro em detalhes. O que aconteceu? O que você estava fazendo quando ocorreu?" 
                    : "Descreva sua sugestão em detalhes"
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Informações do Dispositivo (preenchido automaticamente)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  rows="3"
                  value={deviceInfo}
                  onChange={(e) => setDeviceInfo(e.target.value)}
                  readOnly
                />
                <p className="mt-1 text-xs text-gray-500">
                  Estas informações nos ajudam a diagnosticar problemas no aplicativo.
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Enviar Feedback'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
} 