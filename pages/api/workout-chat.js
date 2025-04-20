import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Configuração do Hugging Face
const HF_API_TOKEN = process.env.HF_API_TOKEN;
// Usar um modelo menor e mais rápido como padrão para respostas rápidas
const HF_MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';

export default async function handler(req, res) {
  // Definir um timeout para toda a requisição
  res.setHeader('Connection', 'keep-alive');
  
  // Verificar se o cliente ainda está conectado
  const isClientConnected = () => {
    return !req.socket.destroyed && res.connection && !res.connection.destroyed;
  };
  
  // Criar um timeout para encerrar a requisição se demorar muito
  const apiTimeout = setTimeout(() => {
    if (isClientConnected()) {
      console.error('API timeout após 20 segundos');
      return res.status(504).json({ 
        success: false,
        error: 'Timeout ao processar a requisição',
        message: 'O serviço de IA está demorando muito para responder. Por favor, tente novamente em alguns momentos.'
      });
    }
  }, 20000); // 20 segundos para chat é suficiente
  
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }
    
    // Extrair corpo da requisição
    const { message, workout, assessmentId, userId, messageHistory } = req.body;
    
    if (!message || !workout) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados insuficientes',
        response: 'Desculpe, não consegui processar sua mensagem por falta de informações do treino.' 
      });
    }
    
    console.log(`Processando mensagem de chat para usuário: ${userId}`);
    
    // Inicializar cliente Supabase admin para operações do servidor
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Opcionalmente buscar dados adicionais da avaliação original
    let assessmentData = null;
    if (assessmentId) {
      const { data: assessment } = await supabaseAdmin
        .from('user_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      
      if (assessment) {
        assessmentData = assessment;
      }
    }
    
    // Construir o prompt para a IA
    let chatMessages = [];
    
    // Adicionar contexto sobre o treino
    const systemPrompt = `Você é um assistente especializado em fitness e exercícios físicos, focado em ajudar pessoas com seus treinos personalizados. 
Seu objetivo é responder perguntas sobre exercícios, explicar técnicas, sugerir adaptações ou alternativas de exercícios, e oferecer conselhos sobre como realizar o treino corretamente.

Aqui está o treino atual do usuário, sobre o qual ele irá fazer perguntas:
${JSON.stringify(workout, null, 2)}

${assessmentData ? `Informações sobre o perfil físico do usuário:
- Altura: ${assessmentData.height}cm
- Peso: ${assessmentData.weight}kg
- Idade: ${assessmentData.age} anos
- Nível de experiência: ${assessmentData.experience_level}
- Objetivo: ${assessmentData.fitness_goal}
- Limitações de saúde: ${assessmentData.health_limitations ? assessmentData.health_limitations.join(', ') : 'Nenhuma'}
- Equipamentos disponíveis: ${assessmentData.available_equipment ? assessmentData.available_equipment.join(', ') : 'Equipamentos básicos'}
- Dias de treino por semana: ${assessmentData.workout_days_per_week}
- Duração por sessão: ${assessmentData.workout_duration} minutos` : ''}

Regras:
1. Suas respostas devem ser concisas, práticas e fáceis de entender.
2. Se perguntado sobre um exercício específico, explique a técnica correta, os músculos trabalhados e possíveis variações ou substituições.
3. Se o usuário mencionar problemas físicos ou lesões, recomende adaptações seguras ou exercícios alternativos.
4. Mantenha um tom motivador, incentivando o usuário a seguir seu programa de treinamento.
5. Não sugira mudanças radicais no programa de treinamento gerado.
6. Se perguntado sobre nutrição, ofereça apenas conselhos gerais e evite prescrições dietéticas específicas.
7. Quando não souber responder com certeza, admita e sugira consultar um profissional.
8. Responda SEMPRE em português do Brasil.

Responda à pergunta do usuário de forma útil e específica, baseando-se nas informações fornecidas sobre o treino.`;

    chatMessages.push({
      role: "system",
      content: systemPrompt
    });
    
    // Adicionar histórico de mensagens anteriores, se disponível
    if (messageHistory && Array.isArray(messageHistory)) {
      messageHistory.forEach(msg => {
        if (msg.type === 'user') {
          chatMessages.push({
            role: "user",
            content: msg.content
          });
        } else if (msg.type === 'assistant') {
          chatMessages.push({
            role: "assistant",
            content: msg.content
          });
        }
      });
    }
    
    // Adicionar a mensagem atual do usuário
    chatMessages.push({
      role: "user",
      content: message
    });
    
    console.log('Enviando pergunta para o modelo de IA...');
    
    // Consultar o modelo Hugging Face
    try {
      // API do Hugging Face para chat
      const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            messages: chatMessages
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro na chamada da API Hugging Face: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Saída da API deve ter um formato como { generated_text: "resposta" }
      let aiResponse = '';
      if (data.generated_text) {
        aiResponse = data.generated_text;
      } else if (Array.isArray(data) && data[0] && data[0].generated_text) {
        aiResponse = data[0].generated_text;
      } else {
        console.error('Formato de resposta inesperado da API:', JSON.stringify(data));
        aiResponse = 'Desculpe, não consegui processar sua dúvida adequadamente. Você pode reformulá-la?';
      }
      
      // Salvar o histórico da conversa no banco de dados para futura análise
      try {
        const { error: chatError } = await supabaseAdmin
          .from('workout_chat_history')
          .insert({
            user_id: userId,
            assessment_id: assessmentId || null,
            workout_details: workout,
            user_message: message,
            ai_response: aiResponse,
            timestamp: new Date().toISOString()
          });
        
        if (chatError) {
          console.error('Erro ao salvar histórico de chat:', chatError);
        }
      } catch (dbError) {
        console.error('Erro ao salvar no banco de dados:', dbError);
      }
      
      // Limpar o timeout, pois a operação foi concluída
      clearTimeout(apiTimeout);
      
      return res.status(200).json({
        success: true,
        response: aiResponse
      });
    } catch (aiError) {
      console.error('Erro ao chamar serviço de IA:', aiError);
      
      // Limpar o timeout
      clearTimeout(apiTimeout);
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar pergunta',
        response: 'Desculpe, encontrei um problema ao processar sua pergunta. Por favor, tente novamente com uma pergunta mais específica ou em outros termos.'
      });
    }
  } catch (error) {
    console.error('Erro no processamento da requisição:', error);
    
    // Limpar o timeout
    clearTimeout(apiTimeout);
    
    return res.status(500).json({
      success: false,
      error: 'Erro interno',
      response: 'Ocorreu um erro interno. Por favor, tente novamente mais tarde.'
    });
  }
} 