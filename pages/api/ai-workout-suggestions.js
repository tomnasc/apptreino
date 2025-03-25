import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Configuração do Hugging Face
const HF_API_TOKEN = process.env.HF_API_TOKEN;
// Usar um modelo menor e mais rápido como padrão
const HF_MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';

// Helper para verificar se todas as variáveis de ambiente necessárias estão configuradas
const checkEnvironmentVariables = () => {
  const requiredVariables = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { name: 'HF_API_TOKEN', value: process.env.HF_API_TOKEN },
    { name: 'HF_MODEL', value: process.env.HF_MODEL }
  ];

  const missingVariables = requiredVariables
    .filter(v => !v.value)
    .map(v => v.name);

  if (missingVariables.length > 0) {
    return {
      success: false,
      missingVariables
    };
  }

  return { success: true };
};

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
      console.error('API timeout após 50 segundos');
      return res.status(504).json({ error: 'Timeout ao processar a requisição' });
    }
  }, 50000); // 50 segundos

  // Verificar variáveis de ambiente primeiro
  const envCheck = checkEnvironmentVariables();
  if (!envCheck.success) {
    console.error(`Variáveis de ambiente faltando: ${envCheck.missingVariables.join(', ')}`);
    return res.status(500).json({ 
      error: 'Configuração incompleta do servidor', 
      details: `Variáveis de ambiente faltando: ${envCheck.missingVariables.join(', ')}` 
    });
  }

  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  console.log('API recebeu requisição POST: ', JSON.stringify({
    body: req.body,
    headers: {
      authorization: req.headers.authorization ? 'Presente (valor omitido por segurança)' : 'Ausente'
    }
  }));

  // Extrair corpo da requisição
  const { assessmentId } = req.body;
  if (!assessmentId) {
    return res.status(400).json({ error: 'ID da avaliação não fornecido' });
  }

  // Extrair token de autenticação
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticação ausente' });
  }

  try {
    console.log('Inicializando cliente Supabase...');
    // Inicializar cliente Supabase admin para operações do servidor
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extrair token JWT do cabeçalho Authorization (formato: "Bearer TOKEN")
    const token = authHeader.split(' ')[1];
    
    console.log('Verificando autenticação do usuário...');
    // Verificar autenticação diretamente com o token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('Erro na verificação do usuário:', userError);
      return res.status(401).json({ error: 'Usuário não autenticado', details: userError?.message });
    }
    
    if (!user) {
      console.error('Usuário não encontrado com o token fornecido');
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    console.log(`Usuário autenticado: ${user.id}`);
    console.log(`Buscando avaliação física com ID: ${assessmentId}`);
    
    // Buscar avaliação física
    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from('user_assessments')
      .select('*')
      .eq('id', assessmentId)
      .eq('user_id', user.id)
      .single();
    
    if (assessmentError) {
      console.error('Erro ao buscar avaliação:', assessmentError);
      return res.status(500).json({ error: 'Erro ao buscar avaliação', details: assessmentError });
    }
    
    if (!assessment) {
      console.error(`Avaliação não encontrada para ID: ${assessmentId}`);
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }
    
    console.log('Avaliação encontrada, criando prompt para o modelo...');
    
    // Criar prompt para o modelo - Usando um prompt mais técnico e específico para PT-BR
    const prompt = `
    Você é um profesor de educação física e especialista em treinamento de força e condicionamento físico.
    Por favor, crie 3 rotinas de treino diferentes, contendo de 7 a 10 exercícios cada, para uma pessoa com as seguintes características:
    - Altura: ${assessment.height} cm
    - Peso: ${assessment.weight} kg
    - Idade: ${assessment.age} anos
    - Nível de experiência: ${assessment.experience_level}
    - Objetivo fitness: ${assessment.fitness_goal}
    - Limitações de saúde: ${assessment.health_limitations ? assessment.health_limitations.join(', ') : 'Nenhuma'}
    - Equipamentos disponíveis: ${assessment.available_equipment ? assessment.available_equipment.join(', ') : 'Equipamentos básicos'}
    - Dias de treino por semana: ${assessment.workout_days_per_week}
    - Duração de treino: ${assessment.workout_duration} minutos
    
    Para cada rotina de treino, que deve conter de 7 a 10 exercícios, inclua:
    1. Nome da rotina
    2. Breve descrição e objetivo
    3. Lista de exercícios, cada um com:
       - Nome do exercício
       - Séries e repetições
       - Descanso entre séries
       - Nível de dificuldade
       - Músculos trabalhados
       - Descrição da execução
    
    IMPORTANTE: Sua resposta deve ser TOTALMENTE em PT-BR, incluindo todos os nomes de exercícios, descrições e demais textos.
    
    Formate sua resposta como um objeto JSON com a seguinte estrutura:
    {
      "workouts": [
        {
          "name": "Nome da Rotina 1",
          "description": "Descrição",
          "exercises": [
            {
              "name": "Nome do Exercício",
              "sets": 3,
              "reps": "10-12",
              "rest": "60 segundos",
              
            }
          ]
        }
      ]
    }
    
    Exemplos de termos em português para usar:
    - Use "Agachamento" em vez de "Squat"
    - Use "Supino" em vez de "Bench Press"
    - Use "Levantamento Terra" em vez de "Deadlift"
    - Use "Rosca Direta" em vez de "Bicep Curl"
    - Use "Puxada Alta" em vez de "Lat Pulldown"
    - Níveis de dificuldade: "Iniciante", "Intermediário", "Avançado"
    - Nomes de músculos em português: "Peito", "Costas", "Pernas", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Glúteos", "Quadríceps", "Isquiotibiais"
    `;
    
    // Configuração para o modelo instruído
    const payload = {
      inputs: `<s>[INST] ${prompt} [/INST]`,
      parameters: {
        max_new_tokens: 3000,
        temperature: 0.8,
        top_p: 0.95,
        return_full_text: false
      }
    };
    
    console.log(`Chamando API do Hugging Face com modelo: ${HF_MODEL}`);
    
    // Tentar chamar a API do Hugging Face com timeout e retry
    let response;
    let retries = 0;
    const maxRetries = 1; // Reduzir para apenas 1 retry para evitar timeouts longos
    
    while (retries <= maxRetries) {
      try {
        response = await fetch(
          `https://api-inference.huggingface.co/models/${HF_MODEL}`,
          {
            headers: { 
              Authorization: `Bearer ${HF_API_TOKEN}`,
              "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(payload),
            signal: controller.signal
          }
        );
        
        // Se a resposta não for ok, verificar se é pelo modelo estar carregando
        if (!response.ok) {
          if (response.status === 503) {
            // Modelo ainda carregando, vamos tentar novamente
            console.log("Modelo ainda carregando, aguardando...");
            await new Promise(resolve => setTimeout(resolve, 10000)); // Aguardar 10 segundos
            
            if (retries < maxRetries) {
              retries++;
              console.log(`Tentativa ${retries} de ${maxRetries}...`);
              continue;
            } else {
              // Atingiu o máximo de retentativas
              console.error(`Erro após ${maxRetries} tentativas: Modelo ainda carregando`);
              throw new Error('Modelo ainda carregando após várias tentativas');
            }
          } else {
            // Outro erro diferente do modelo carregando
            console.error(`Erro na API do Hugging Face: ${response.status}`);
            throw new Error(`Erro na API do Hugging Face: ${response.status}`);
          }
        }
        
        // Se chegou aqui, a requisição foi bem-sucedida
        break;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('Timeout ao chamar a API do Hugging Face');
          if (retries < maxRetries) {
            retries++;
            console.log(`Tentativa ${retries} de ${maxRetries}...`);
          } else {
            // Se o modelo estiver demorando muito, retornar erro
            console.error('Timeout após múltiplas tentativas');
            clearTimeout(apiTimeout);
            return res.status(504).json({ 
              success: false, 
              error: 'Timeout ao gerar sugestões de treino',
              message: 'O servidor de IA está demorando muito para responder. Por favor, tente novamente mais tarde.'
            });
          }
        } else {
          throw error;
        }
      }
    }
    
    console.log('Resposta recebida da API do Hugging Face, processando...');
    
    // Processar resposta do Hugging Face
    const hfResponse = await response.json();
    let responseContent = Array.isArray(hfResponse) && hfResponse.length > 0 ? 
      hfResponse[0].generated_text : 
      hfResponse.generated_text || '';
    
    console.log("Resposta bruta do modelo:", responseContent);
    
    // Extrair e processar o JSON da resposta
    let suggestedWorkouts;
    
    try {
      // Identificar onde começa o JSON na resposta
      const jsonStart = responseContent.indexOf('{');
      const jsonEnd = responseContent.lastIndexOf('}') + 1;
      
      if (jsonStart > -1 && jsonEnd > jsonStart) {
        // Extrair apenas a parte JSON da resposta
        const jsonStr = responseContent.substring(jsonStart, jsonEnd);
        suggestedWorkouts = JSON.parse(jsonStr);
      } else {
        throw new Error('Formato de resposta inválido: não foi possível encontrar JSON válido');
      }
      
      // Validar se temos o formato esperado
      if (!suggestedWorkouts.workouts || !Array.isArray(suggestedWorkouts.workouts)) {
        throw new Error('Formato de resposta inválido: "workouts" não encontrado ou não é um array');
      }
      
      // Processar os treinos
      suggestedWorkouts.workouts = suggestedWorkouts.workouts.map(workout => {
        return {
          ...workout,
          exercises: Array.isArray(workout.exercises) ? workout.exercises.map(exercise => {
            return {
              ...exercise,
              // Garantir que todos os campos existam
              name: exercise.name || 'Exercício',
              sets: exercise.sets || 3,
              reps: exercise.reps || '10',
              rest: exercise.rest || '60 segundos',
              difficulty: exercise.difficulty || 'Intermediário',
              muscles: Array.isArray(exercise.muscles) ? exercise.muscles : ['Não especificado'],
              execution: exercise.execution || 'Sem descrição'
            };
          }) : []
        };
      });
    } catch (parseError) {
      console.error("Erro ao processar resposta da IA:", parseError, "Resposta:", responseContent);
      clearTimeout(apiTimeout);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro ao processar resposta da IA',
        message: 'O servidor encontrou um problema ao processar a resposta do modelo de IA. Por favor, tente novamente.'
      });
    }
    
    console.log('Salvando sugestões no banco de dados...');
    
    // Salvar sugestões no banco
    const workoutsToInsert = suggestedWorkouts.workouts.map(workout => ({
      assessment_id: assessmentId,
      workout_name: workout.name || "Treino Personalizado",
      workout_description: workout.description || "Treino personalizado baseado na sua avaliação",
      exercises: workout.exercises || [],
      workout_metadata: {
        source: 'huggingface',
        model: HF_MODEL
      }
    }));
    
    const { data: insertedWorkouts, error: insertError } = await supabaseAdmin
      .from('ai_suggested_workouts')
      .insert(workoutsToInsert)
      .select();
    
    if (insertError) {
      console.error('Erro ao salvar sugestões:', insertError);
      return res.status(500).json({ error: 'Erro ao salvar sugestões', details: insertError });
    }
    
    console.log(`${insertedWorkouts?.length || 0} treinos salvos com sucesso`);
    
    clearTimeout(apiTimeout);
    return res.status(200).json({ success: true, workouts: insertedWorkouts });
    
  } catch (error) {
    console.error("Erro interno:", error);
    clearTimeout(apiTimeout);
    return res.status(500).json({ error: 'Erro interno', details: error.message, stack: error.stack });
  }
} 