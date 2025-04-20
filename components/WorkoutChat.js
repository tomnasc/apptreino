import { useState, useRef, useEffect } from 'react';
import { FiSend, FiMessageCircle, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export default function WorkoutChat({ workout, assessmentId, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'assistant', 
      content: 'Olá! Como posso ajudar com o seu treino? Você pode perguntar sobre exercícios, técnicas, adaptações ou substituições.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Rolar para o fim da conversa quando chegarem novas mensagens
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Obtenha o token de autenticação do Supabase (assumindo que você está usando useSupabaseClient)
      // Isso precisa ser implementado conforme a sua lógica de autenticação
      
      const response = await fetch('/api/workout-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          workout: workout,
          assessmentId: assessmentId,
          userId: userId,
          messageHistory: messages.slice(-5) // Enviar as últimas 5 mensagens para contexto
        })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao processar a mensagem');
      }
      
      const data = await response.json();
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.response
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erro no chat:', error);
      toast.error('Não foi possível processar sua pergunta. Tente novamente.');
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Desculpe, encontrei um problema ao processar sua pergunta. Por favor, tente novamente em alguns instantes.'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão de abertura do chat quando fechado */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all z-50"
          aria-label="Abrir chat de ajuda"
        >
          <FiMessageCircle size={24} />
        </button>
      )}
      
      {/* Janela de chat */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col z-50 max-h-[500px] border border-gray-200 dark:border-gray-700">
          {/* Cabeçalho do chat */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white rounded-t-lg">
            <h3 className="font-medium">Assistente de Treino</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700 rounded-full p-1"
              aria-label="Fechar chat"
            >
              <FiX size={20} />
            </button>
          </div>
          
          {/* Área de mensagens */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 min-h-[300px] max-h-[350px]">
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`${
                  message.type === 'user' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 ml-auto' 
                    : 'bg-gray-100 dark:bg-gray-700 mr-auto'
                } p-2 rounded-lg max-w-[80%] break-words`}
              >
                <p className="text-sm text-gray-800 dark:text-gray-200">{message.content}</p>
              </div>
            ))}
            
            {isLoading && (
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-auto">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Área de input */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg disabled:opacity-50"
              disabled={!input.trim() || isLoading}
              aria-label="Enviar mensagem"
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
} 