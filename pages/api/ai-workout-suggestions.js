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
      console.error('API timeout após 60 segundos');
      return res.status(504).json({ 
        success: false,
        error: 'Timeout ao processar a requisição',
        message: 'A requisição demorou muito para ser processada. Por favor, tente novamente mais tarde.'
      });
    }
  }, 60000); // Aumentado para 60 segundos para dar mais tempo ao modelo

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
    
    // Buscar medidas corporais mais recentes
    const { data: latestMeasurements, error: measurementsError } = await supabaseAdmin
      .from('user_body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .single();
      
    if (measurementsError && !measurementsError.message.includes('No rows found')) {
      console.error('Erro ao buscar medidas corporais:', measurementsError);
    }
    
    console.log('Avaliação encontrada, criando prompt para o modelo...');
    
    // Construir o prompt para a IA
    let prompt = `Gere um programa de treino personalizado para um usuário com as seguintes características:

- Altura: ${assessment.height}cm
- Peso: ${assessment.weight}kg
- Idade: ${assessment.age} anos
- Nível de experiência: ${assessment.experience_level}
- Objetivo: ${assessment.fitness_goal}
- Limitações de saúde: ${assessment.health_limitations ? assessment.health_limitations.join(', ') : 'Nenhuma'}
- Equipamentos disponíveis: ${assessment.available_equipment ? assessment.available_equipment.join(', ') : 'Equipamentos básicos'}
- Preferências de treino:
  - Dias por semana: ${assessment.workout_days_per_week}
  - Duração por sessão: ${assessment.workout_duration} minutos\n`;

    // Adicionar medidas corporais se disponíveis
    if (latestMeasurements) {
      prompt += `\nMedidas corporais atuais:`;
      
      if (latestMeasurements.body_fat_percentage) {
        prompt += `\n- Percentual de gordura: ${latestMeasurements.body_fat_percentage}%`;
      }
      if (latestMeasurements.muscle_mass) {
        prompt += `\n- Massa muscular: ${latestMeasurements.muscle_mass}kg`;
      }
      if (latestMeasurements.chest) {
        prompt += `\n- Peitoral: ${latestMeasurements.chest}cm`;
      }
      if (latestMeasurements.waist) {
        prompt += `\n- Cintura: ${latestMeasurements.waist}cm`;
      }
      if (latestMeasurements.hips) {
        prompt += `\n- Quadril: ${latestMeasurements.hips}cm`;
      }
      if (latestMeasurements.right_arm || latestMeasurements.left_arm) {
        prompt += `\n- Braços: ${latestMeasurements.right_arm || 0}cm (D) / ${latestMeasurements.left_arm || 0}cm (E)`;
      }
      if (latestMeasurements.right_thigh || latestMeasurements.left_thigh) {
        prompt += `\n- Coxas: ${latestMeasurements.right_thigh || 0}cm (D) / ${latestMeasurements.left_thigh || 0}cm (E)`;
      }
      if (latestMeasurements.right_calf || latestMeasurements.left_calf) {
        prompt += `\n- Panturrilhas: ${latestMeasurements.right_calf || 0}cm (D) / ${latestMeasurements.left_calf || 0}cm (E)`;
      }
      if (latestMeasurements.shoulders) {
        prompt += `\n- Ombros: ${latestMeasurements.shoulders}cm`;
      }
      if (latestMeasurements.neck) {
        prompt += `\n- Pescoço: ${latestMeasurements.neck}cm`;
      }
    }

    prompt += `\n\nCom base nessas informações, gere um programa de treino completo que inclua:
1. Divisão semanal dos treinos (máximo de 5 treinos)
2. Exercícios específicos para cada dia (máximo de 7 exercícios por treino)
3. Séries, repetições e descanso para cada exercício

O programa deve ser estruturado e retornado em formato JSON com a seguinte estrutura simplificada:
{
  "workouts": [
    {
      "name": string,      // Nome do treino (ex: "Treino A - Peito e Tríceps")
      "description": string, // Descrição curta
      "exercises": [
        {
          "name": string,  // Nome do exercício
          "sets": number,  // Número de séries (1-5)
          "reps": string,  // Repetições (ex: "10-12")
          "rest": string   // Tempo de descanso (ex: "60 segundos")
        }
      ]
    }
  ]
}`;
    
    // Configuração para o modelo instruído
    const payload = {
      inputs: `<s>[INST] ${prompt} [/INST]`,
      parameters: {
        max_new_tokens: 1536,       // Reduzido para diminuir tempo de geração
        temperature: 0.6,           // Reduzido para respostas mais determinísticas
        top_p: 0.9,                 // Reduzido para mais foco nas respostas mais prováveis
        return_full_text: false,
        do_sample: true,
        seed: 42                    // Semente fixa para respostas mais consistentes
      }
    };
    
    console.log(`Chamando API do Hugging Face com modelo: ${HF_MODEL} - Tamanho do prompt: ${prompt.length} caracteres`);
    
    // Usamos o modelo mais leve disponível se não estiver especificado
    const modelToUse = HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2'; // Garantir que temos um modelo
    
    // Tentar chamar a API do Hugging Face com timeout e retry
    let response;
    let retries = 0;
    const maxRetries = 2; // Aumentado para 2 retentativas
    
    while (retries <= maxRetries) {
      try {
        // Definir controller para abort
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 60000); // Aumentado para 60 segundos para cada chamada
        
        console.log(`Tentativa ${retries + 1} de ${maxRetries + 1} para chamar a API do Hugging Face...`);
        response = await fetch(
          `https://api-inference.huggingface.co/models/${modelToUse}`,
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
        
        clearTimeout(fetchTimeout);
        
        // Se a resposta não for ok, verificar se é pelo modelo estar carregando
        if (!response.ok) {
          if (response.status === 503) {
            // Modelo ainda carregando, vamos tentar novamente
            console.log("Modelo ainda carregando, aguardando...");
            await new Promise(resolve => setTimeout(resolve, 8000)); // Aumentado para 8 segundos de espera
            
            if (retries < maxRetries) {
              retries++;
              console.log(`Tentativa ${retries + 1} de ${maxRetries + 1}...`);
              continue;
            } else {
              // Atingiu o máximo de retentativas
              console.error(`Erro após ${maxRetries + 1} tentativas: Modelo ainda carregando`);
              clearTimeout(apiTimeout);
              return res.status(503).json({
                success: false,
                error: 'Modelo de IA indisponível',
                message: 'O modelo de IA está ocupado no momento. Por favor, tente novamente em alguns minutos.'
              });
            }
          } else {
            // Outro erro diferente do modelo carregando
            console.error(`Erro na API do Hugging Face: ${response.status}`);
            
            // Tentar extrair mais informações de erro
            let errorInfo = '';
            try {
              const errorText = await response.text();
              console.error('Detalhes do erro:', errorText);
              errorInfo = errorText;
            } catch (e) {
              console.error('Não foi possível obter detalhes do erro:', e);
            }
            
            clearTimeout(apiTimeout);
            return res.status(response.status).json({
              success: false,
              error: `Erro no serviço de IA: ${response.status}`,
              message: 'Ocorreu um erro ao acessar o serviço de IA. Por favor, tente novamente mais tarde.',
              details: errorInfo
            });
          }
        }
        
        // Se chegou aqui, a requisição foi bem-sucedida
        break;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('Timeout ao chamar a API do Hugging Face');
          if (retries < maxRetries) {
            retries++;
            console.log(`Tentativa ${retries + 1} de ${maxRetries + 1} após timeout...`);
          } else {
            // Se o modelo estiver demorando muito, retornar erro
            console.error('Timeout após múltiplas tentativas');
            clearTimeout(apiTimeout);
            return res.status(504).json({ 
              success: false, 
              error: 'Timeout ao gerar sugestões de treino',
              message: 'O serviço de IA está demorando muito para responder. Por favor, tente novamente mais tarde. Se o problema persistir, entre em contato com o suporte.'
            });
          }
        } else {
          console.error('Erro inesperado ao chamar a API do Hugging Face:', error);
          clearTimeout(apiTimeout);
          return res.status(500).json({
            success: false,
            error: 'Erro ao acessar serviço de IA',
            message: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
            details: error.message
          });
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
    let suggestedWorkouts = null;
    
    try {
      // Identificar onde começa o JSON na resposta
      const jsonStart = responseContent.indexOf('{');
      const jsonEnd = responseContent.lastIndexOf('}') + 1;
      
      if (jsonStart > -1 && jsonEnd > jsonStart) {
        // Extrair apenas a parte JSON da resposta
        const jsonStr = responseContent.substring(jsonStart, jsonEnd);
        console.log("Tentando analisar JSON:", jsonStr.substring(0, 200) + "..."); // Log apenas do início para evitar logs muito grandes
        suggestedWorkouts = JSON.parse(jsonStr);
      } else {
        throw new Error('Formato de resposta inválido: não foi possível encontrar JSON válido');
      }
      
      // Validar se temos o formato esperado
      if (!suggestedWorkouts.workouts || !Array.isArray(suggestedWorkouts.workouts)) {
        console.error('Formato inválido retornado pela IA, tentando recuperar:', JSON.stringify(suggestedWorkouts));
        // Tentar criar um formato válido a partir do que recebemos
        if (typeof suggestedWorkouts === 'object') {
          // Tentar encontrar algo parecido com uma lista de treinos
          let recoveredWorkouts = [];
          
          // Verificar se temos um program_overview com workouts
          if (suggestedWorkouts.program_overview && suggestedWorkouts.program_overview.workouts && 
              Array.isArray(suggestedWorkouts.program_overview.workouts)) {
            recoveredWorkouts = suggestedWorkouts.program_overview.workouts;
          } 
          // Verificar se recebemos um workout único
          else if (suggestedWorkouts.name && suggestedWorkouts.exercises) {
            recoveredWorkouts = [suggestedWorkouts];
          }
          // Verificar outras propriedades que podem conter treinos
          else {
            // Procurar por qualquer array que contenha exercícios
            Object.keys(suggestedWorkouts).forEach(key => {
              if (Array.isArray(suggestedWorkouts[key])) {
                const possibleWorkouts = suggestedWorkouts[key];
                // Verificar se parece com um array de treinos
                if (possibleWorkouts.some(item => item.exercises || item.name)) {
                  recoveredWorkouts = possibleWorkouts;
                }
              }
            });
          }
          
          if (recoveredWorkouts.length > 0) {
            console.log('Conseguimos recuperar workouts a partir da resposta incorreta:', recoveredWorkouts.length);
            suggestedWorkouts = { workouts: recoveredWorkouts };
          } else {
            throw new Error('Não foi possível recuperar treinos a partir da resposta');
          }
        } else {
          throw new Error('Formato de resposta inválido: "workouts" não encontrado ou não é um array');
        }
      }
      
      // Processar os treinos
      suggestedWorkouts.workouts = suggestedWorkouts.workouts.map(workout => {
        // Garantir que o workout tem um nome e descrição
        const workoutName = workout.name || workout.title || "Treino Personalizado";
        const workoutDesc = workout.description || workout.focus || "Treino personalizado baseado na sua avaliação";
        const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
        
        return {
          ...workout,
          name: workoutName,
          description: workoutDesc,
          exercises: exercises.map(exercise => {
            // Extrair propriedades seguras ou usar valores padrão
            const name = exercise.name || 'Exercício';
            const sets = exercise.sets || 3;
            let reps = exercise.reps || '10-12';
            let rest = exercise.rest || exercise.rest_seconds || '60 segundos';
            
            // Certificar que rest está em formato de string
            if (typeof rest === 'number') {
              rest = `${rest} segundos`;
            }
            
            // Adicionar propriedades opcionais se existirem
            const exerciseObj = {
              name,
              sets,
              reps,
              rest,
              // Adicionar propriedades opcionais com valores padrão
              difficulty: exercise.difficulty || 'Intermediário',
              muscles: Array.isArray(exercise.muscles) ? exercise.muscles : 
                       (exercise.muscles ? [exercise.muscles] : ['Não especificado']),
              execution: exercise.execution || exercise.notes || 'Execute o movimento com controle.'
            };
            
            return exerciseObj;
          })
        };
      });
      
      // Verificar se temos pelo menos um treino com exercícios
      const hasValidWorkouts = suggestedWorkouts.workouts.some(w => 
        w.exercises && Array.isArray(w.exercises) && w.exercises.length > 0
      );
      
      if (!hasValidWorkouts) {
        throw new Error('Nenhum treino válido com exercícios foi gerado');
      }
      
    } catch (parseError) {
      console.error("Erro ao processar resposta da IA:", parseError.message);
      console.error("Resposta bruta:", responseContent.substring(0, 500) + "..."); // Mostra parte da resposta para debug
      
      // Criar workouts de fallback
      suggestedWorkouts = {
        workouts: [
          {
            name: "Treino A - Superior",
            description: "Treino para membros superiores com foco em hipertrofia",
            exercises: [
              { name: "Supino reto com barra", sets: 4, reps: "8-12", rest: "90 segundos", muscles: ["Peito", "Tríceps"], difficulty: "Intermediário", execution: "Mantenha os cotovelos em ângulo de 90º e controle o movimento." },
              { name: "Puxada frontal", sets: 4, reps: "10-12", rest: "90 segundos", muscles: ["Costas"], difficulty: "Intermediário", execution: "Traga a barra até a clavícula e alongue bem na subida." },
              { name: "Desenvolvimento com halteres", sets: 3, reps: "10-12", rest: "60 segundos", muscles: ["Ombros"], difficulty: "Intermediário", execution: "Mantenha os cotovelos alinhados durante o movimento." },
              { name: "Rosca direta com barra", sets: 3, reps: "12-15", rest: "60 segundos", muscles: ["Bíceps"], difficulty: "Iniciante", execution: "Controle a descida e evite usar impulso." },
              { name: "Tríceps corda", sets: 3, reps: "12-15", rest: "60 segundos", muscles: ["Tríceps"], difficulty: "Iniciante", execution: "Mantenha os cotovelos junto ao corpo." }
            ]
          },
          {
            name: "Treino B - Inferior",
            description: "Treino para membros inferiores com foco em força e hipertrofia",
            exercises: [
              { name: "Agachamento livre", sets: 4, reps: "8-10", rest: "120 segundos", muscles: ["Quadríceps", "Glúteos"], difficulty: "Avançado", execution: "Desça até a posição paralela, mantendo a coluna neutra." },
              { name: "Leg press", sets: 4, reps: "10-12", rest: "90 segundos", muscles: ["Quadríceps", "Glúteos"], difficulty: "Intermediário", execution: "Evite travar os joelhos no topo do movimento." },
              { name: "Stiff", sets: 3, reps: "10-12", rest: "90 segundos", muscles: ["Posterior de coxa"], difficulty: "Intermediário", execution: "Mantenha leve flexão nos joelhos e desça até sentir estiramento." },
              { name: "Elevação de panturrilha em pé", sets: 4, reps: "15-20", rest: "60 segundos", muscles: ["Panturrilhas"], difficulty: "Iniciante", execution: "Foque na amplitude total, esticando bem na subida." }
            ]
          }
        ]
      };
      
      // Não retornamos erro, mas usamos o fallback e registramos que houve problema
      console.log("Usando treinos de fallback devido a erro na resposta da IA");
      // Não lançamos o erro para continuar o fluxo
    }
    
    console.log('Salvando sugestões no banco de dados...');
    
    // Indicar se estamos usando fallback
    const isFallback = responseContent.indexOf('{') === -1 || responseContent.lastIndexOf('}') === -1;
    
    // Salvar sugestões no banco
    const workoutsToInsert = suggestedWorkouts.workouts.map(workout => ({
      assessment_id: assessmentId,
      workout_name: workout.name || "Treino Personalizado",
      workout_description: workout.description || "Treino personalizado baseado na sua avaliação",
      exercises: workout.exercises || [],
      workout_metadata: {
        source: 'huggingface',
        model: modelToUse,
        fallback: isFallback,
        generated_at: new Date().toISOString()
      }
    }));
    
    try {
      const { data: insertedWorkouts, error: insertError } = await supabaseAdmin
        .from('ai_suggested_workouts')
        .insert(workoutsToInsert)
        .select();
      
      if (insertError) {
        console.error('Erro ao salvar sugestões:', insertError);
        // Continuar mesmo com erro para retornar os treinos ao usuário
      } else {
        console.log(`${insertedWorkouts?.length || 0} treinos salvos com sucesso`);
      }
    } catch (dbError) {
      console.error('Erro ao salvar no banco de dados:', dbError);
      // Continuar para retornar os treinos mesmo sem salvá-los
    }
    
    clearTimeout(apiTimeout);
    return res.status(200).json({ 
      success: true, 
      workouts: suggestedWorkouts.workouts,
      isFallback: isFallback
    });
    
  } catch (error) {
    console.error("Erro interno:", error);
    clearTimeout(apiTimeout);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno', 
      details: error.message, 
      stack: error.stack 
    });
  }
} 