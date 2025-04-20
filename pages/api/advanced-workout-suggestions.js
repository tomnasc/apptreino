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
      console.error('API timeout após 25 segundos');
      return res.status(504).json({ 
        success: false,
        error: 'Timeout ao processar a requisição',
        message: 'A requisição demorou muito para ser processada. Por favor, tente novamente mais tarde.'
      });
    }
  }, 25000); // 25 segundos

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
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'ID do usuário não fornecido' });
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
    
    if (!user || user.id !== userId) {
      console.error('Usuário não encontrado ou ID não corresponde ao token');
      return res.status(401).json({ error: 'Usuário não autorizado' });
    }
    
    console.log(`Usuário autenticado: ${user.id}`);
    
    // Buscar dados avançados do perfil de fitness
    console.log('Buscando perfil de fitness avançado...');
    const { data: fitnessProfile, error: profileError } = await supabaseAdmin
      .from('user_fitness_profile')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (profileError) {
      console.error('Erro ao buscar perfil de fitness:', profileError);
      return res.status(500).json({ error: 'Erro ao buscar perfil de fitness', details: profileError });
    }
    
    if (!fitnessProfile) {
      return res.status(404).json({ error: 'Perfil de fitness não encontrado. Por favor, complete seu perfil primeiro.' });
    }
    
    // Buscar métricas corporais mais recentes
    console.log('Buscando métricas corporais mais recentes...');
    const { data: bodyMetrics, error: metricsError } = await supabaseAdmin
      .from('user_body_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1);
    
    if (metricsError) {
      console.error('Erro ao buscar métricas corporais:', metricsError);
      return res.status(500).json({ error: 'Erro ao buscar métricas corporais', details: metricsError });
    }
    
    if (!bodyMetrics || bodyMetrics.length === 0) {
      return res.status(404).json({ error: 'Métricas corporais não encontradas. Por favor, complete seu perfil com dados de peso e medidas.' });
    }
    
    const metrics = bodyMetrics[0];
    
    // Calcular IMC (Índice de Massa Corporal) se altura e peso estiverem disponíveis
    let bmi = null;
    if (metrics.weight && metrics.height) {
      // Fórmula do IMC: peso (kg) / (altura (m) * altura (m))
      bmi = metrics.weight / Math.pow((metrics.height / 100), 2);
    }
    
    console.log('Criando prompt para o modelo baseado no perfil avançado...');
    
    // Mapeamento para termos mais descritivos
    const fitnessLevelMap = {
      'beginner': 'iniciante com pouca experiência em treinos',
      'intermediate': 'intermediário com experiência moderada em treinos',
      'advanced': 'avançado com bastante experiência em treinos'
    };
    
    const primaryGoalMap = {
      'weight_loss': 'perda de peso e redução de gordura corporal',
      'muscle_gain': 'ganho de massa muscular',
      'strength': 'aumento de força',
      'endurance': 'melhora da resistência',
      'general_fitness': 'condicionamento físico geral',
      'flexibility': 'melhora da flexibilidade',
      'rehabilitation': 'reabilitação'
    };
    
    const activityLevelMap = {
      'sedentary': 'sedentário (pouca ou nenhuma atividade física)',
      'lightly_active': 'levemente ativo (exercícios leves 1-3 dias por semana)',
      'moderately_active': 'moderadamente ativo (exercícios moderados 3-5 dias por semana)',
      'very_active': 'muito ativo (exercícios intensos 6-7 dias por semana)',
      'extra_active': 'extremamente ativo (exercícios muito intensos, trabalho físico ou treinamento duplo)'
    };
    
    // Criar prompt para o modelo - Usando um prompt mais técnico e específico para PT-BR
    const prompt = `
    Você é um professor de educação física e especialista em treinamento de força e condicionamento físico.
    
    DADOS DO USUÁRIO:
    - Peso atual: ${metrics.weight || 'Não informado'} kg
    - Percentual de gordura corporal: ${metrics.body_fat_percentage || 'Não informado'}%
    - Massa muscular: ${metrics.muscle_mass || 'Não informado'} kg
    - IMC: ${bmi ? bmi.toFixed(1) : 'Não calculado'}
    - Nível de condicionamento: ${fitnessLevelMap[fitnessProfile.fitness_level] || fitnessProfile.fitness_level}
    - Objetivo principal: ${primaryGoalMap[fitnessProfile.primary_goal] || fitnessProfile.primary_goal}
    ${fitnessProfile.secondary_goal ? `- Objetivo secundário: ${primaryGoalMap[fitnessProfile.secondary_goal] || fitnessProfile.secondary_goal}` : ''}
    - Nível de atividade diária: ${activityLevelMap[fitnessProfile.daily_activity_level] || fitnessProfile.daily_activity_level}
    - Treinos por semana: ${fitnessProfile.weekly_workout_target || 3}
    - Condições de saúde: ${fitnessProfile.health_conditions && fitnessProfile.health_conditions.length > 0 ? fitnessProfile.health_conditions.join(', ') : 'Nenhuma'}
    - Lesões: ${fitnessProfile.injuries && fitnessProfile.injuries.length > 0 ? fitnessProfile.injuries.join(', ') : 'Nenhuma'}
    - Preferências alimentares: ${fitnessProfile.dietary_preferences && fitnessProfile.dietary_preferences.length > 0 ? fitnessProfile.dietary_preferences.join(', ') : 'Nenhuma restrição'}
    - Medidas corporais: 
      * Peitoral: ${metrics.chest || 'Não informado'} cm
      * Cintura: ${metrics.waist || 'Não informado'} cm
      * Quadril: ${metrics.hips || 'Não informado'} cm
      * Braços: ${metrics.arms || 'Não informado'} cm
      * Coxas: ${metrics.thighs || 'Não informado'} cm
      * Panturrilhas: ${metrics.calves || 'Não informado'} cm
    
    Crie ${fitnessProfile.workout_lists_count || fitnessProfile.weekly_workout_target || 3} rotinas de treino diferentes, CONTENDO EXATAMENTE 8 EXERCÍCIOS EM PT-BR PARA CADA ROTINA, baseadas no perfil detalhado acima.
    
    Para cada rotina de treino, DEVE CONTER EXATAMENTE 8 EXERCÍCIOS EM PT-BR, inclua:
    1. Nome da rotina em português e fácil de lembrar (A, B, C ou Dia 1, Dia 2, etc)
    2. Breve descrição e objetivo desta rotina específica
    3. Lista de 8 exercícios, cada um com:
       - Nome do exercício EM PT-BR
       - Séries e repetições (adequado ao nível do usuário)
       - Descanso entre séries em segundos
       - Carga sugerida para iniciar (se aplicável, baseada no peso e condicionamento)
       - Músculos trabalhados
    
    IMPORTANTE: 
    - Se o usuário tiver lesões ou condições de saúde, EVITE exercícios que possam agravar o problema
    - Sua resposta deve ser TOTALMENTE em PT-BR, incluindo todos os nomes de exercícios, rotinas, descrições e demais textos
    - Adapte a intensidade e volume ao nível do usuário
    - MENCIONE especificamente como cada rotina contribui para o objetivo principal do usuário
    - Para iniciantes, foque em exercícios fundamentais e com menor risco de lesão
    
    Formate sua resposta como um objeto JSON com a seguinte estrutura:
    {
      "workouts": [
        {
          "name": "Nome da Rotina 1",
          "description": "Descrição detalhada...",
          "focus": "Foco principal desta rotina (ex: Membros superiores, Pernas, etc)",
          "exercises": [
            {
              "name": "Nome do Exercício",
              "sets": 3,
              "reps": "10-12",
              "rest": 60,
              "suggested_weight": "x kg ou kg/lado (se aplicável)",
              "muscles": "Músculos trabalhados"
            },
            ... (mais 7 exercícios)
          ]
        },
        ... (mais rotinas conforme dias por semana)
      ]
    }
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
        // Definir controller para abort
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 15000); // 15 segundos para cada chamada
        
        response = await fetch(
          `https://api-inference.huggingface.co/models/${HF_MODEL}`,
          {
            headers: {
              Authorization: `Bearer ${HF_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify(payload),
            signal: controller.signal
          }
        );
        
        clearTimeout(fetchTimeout);
        
        // Se a API retornar 200, processar a resposta
        if (response.ok) {
          break;
        }
        
        // Se a API estiver carregando o modelo, esperar e tentar novamente
        const responseBody = await response.json();
        if (responseBody.error && responseBody.error.includes('Loading')) {
          console.log(`Modelo ${HF_MODEL} está carregando, tentativa ${retries + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar 10 segundos
          retries++;
          continue;
        }
        
        // Se houver outro tipo de erro, retornar
        throw new Error(`Erro na API: ${response.status} - ${JSON.stringify(responseBody)}`);
        
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`Timeout ao chamar API do Hugging Face, tentativa ${retries + 1}`);
          
          if (retries < maxRetries) {
            retries++;
            continue;
          } else {
            clearTimeout(apiTimeout);
            return res.status(504).json({ 
              success: false, 
              error: 'Timeout na API do Hugging Face',
              message: 'O serviço de IA demorou muito para responder. Por favor, tente novamente mais tarde.'
            });
          }
        } else {
          console.error('Erro ao chamar API do Hugging Face:', error);
          clearTimeout(apiTimeout);
          return res.status(500).json({ 
            success: false, 
            error: 'Erro ao chamar a API do Hugging Face', 
            details: error.message 
          });
        }
      }
    }
    
    try {
      console.log('Processando resposta da API...');
      
      if (!response || !response.ok) {
        throw new Error(`Erro na resposta da API: ${response ? response.status : 'Sem resposta'}`);
      }
      
      const json = await response.json();
      const generatedText = json[0].generated_text;
      
      if (!generatedText) {
        throw new Error('Texto gerado está vazio ou nulo');
      }
      
      console.log('Texto gerado com sucesso, extraindo o JSON...');
      
      // Encontrar inicio e fim do objeto JSON
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Não foi possível encontrar um objeto JSON válido na resposta');
      }
      
      const jsonStr = jsonMatch[0];
      
      // Tentar fazer parsing do JSON
      const workoutData = JSON.parse(jsonStr);
      
      if (!workoutData || !workoutData.workouts || !Array.isArray(workoutData.workouts)) {
        throw new Error('Formato de dados inválido na resposta gerada');
      }
      
      console.log(`Gerados ${workoutData.workouts.length} treinos com sucesso`);
      
      // Salvar no banco de dados
      console.log('Salvando sugestões de treino no banco de dados...');
      const { data: savedData, error: saveError } = await supabaseAdmin
        .from('ai_suggested_workouts')
        .insert({
          user_id: userId,
          content: workoutData,
          raw_response: generatedText,
          primary_goal: fitnessProfile.primary_goal,
          fitness_level: fitnessProfile.fitness_level,
          current_weight: metrics.weight,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (saveError) {
        console.error('Erro ao salvar sugestões no banco de dados:', saveError);
        // Continuar mesmo com erro no banco, para retornar os dados gerados
      }
      
      // Limpar timeout
      clearTimeout(apiTimeout);
      
      // Retornar dados gerados
      return res.status(200).json({
        success: true,
        workout_suggestion_id: savedData?.id,
        data: workoutData,
        message: 'Treinos gerados com sucesso!'
      });
      
    } catch (error) {
      console.error('Erro ao processar resposta da API:', error);
      
      // Se for erro de parsing, tentar retornar o texto bruto
      if (error instanceof SyntaxError && response) {
        try {
          const rawText = await response.text();
          console.log('Texto bruto recebido:', rawText.substring(0, 500) + '...');
          clearTimeout(apiTimeout);
          return res.status(500).json({
            success: false,
            error: 'Erro ao processar JSON',
            message: 'O formato da resposta da IA não é válido. Por favor, tente novamente.',
            raw_text_sample: rawText.substring(0, 500) + '...' // Primeiros 500 caracteres
          });
        } catch (e) {
          console.error('Erro ao ler texto bruto:', e);
        }
      }
      
      clearTimeout(apiTimeout);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar resposta',
        message: error.message
      });
    }
    
  } catch (error) {
    console.error('Erro geral na API:', error);
    clearTimeout(apiTimeout);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
} 