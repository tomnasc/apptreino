// Função Edge do Supabase para gerar sugestões de treino usando Hugging Face
// Nome da função: generate-workout-suggestions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Configurações da função
Deno.serve(async (req) => {
  // Determinar a origem para permitir acesso tanto para www quanto para o domínio sem www
  const origin = req.headers.get('Origin');
  const allowedOrigins = ['https://www.treinonamao.app', 'https://treinonamao.app'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  // Lidar com solicitações OPTIONS (preflight) para CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin
          } 
        }
      )
    }
    
    // Extrair corpo da requisição
    const body = await req.json()
    
    // Extrair token de autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação ausente' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin
          } 
        }
      )
    }
    
    // Inicializar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    )
    
    // Verificar autenticação
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin
          } 
        }
      )
    }
    
    // Buscar avaliação física
    const assessmentId = body.assessmentId
    if (!assessmentId) {
      return new Response(
        JSON.stringify({ error: 'ID da avaliação não fornecido' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin
          } 
        }
      )
    }
    
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('user_assessments')
      .select('*')
      .eq('id', assessmentId)
      .eq('user_id', user.id)
      .single()
      
    if (assessmentError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar avaliação', details: assessmentError }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin
          } 
        }
      )
    }
    
    if (!assessment) {
      return new Response(
        JSON.stringify({ error: 'Avaliação não encontrada' }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin
          } 
        }
      )
    }
    
    // Criar prompt para o modelo
    const prompt = `
    Por favor, crie 3 rotinas de treino diferentes para uma pessoa com as seguintes características:
    - Altura: ${assessment.height} cm
    - Peso: ${assessment.weight} kg
    - Idade: ${assessment.age} anos
    - Nível de experiência: ${assessment.experience_level}
    - Objetivo fitness: ${assessment.fitness_goal}
    - Limitações de saúde: ${assessment.health_limitations ? assessment.health_limitations.join(', ') : 'Nenhuma'}
    - Equipamentos disponíveis: ${assessment.available_equipment ? assessment.available_equipment.join(', ') : 'Equipamentos básicos'}
    - Dias de treino por semana: ${assessment.workout_days_per_week}
    - Duração de treino: ${assessment.workout_duration} minutos
    
    Para cada rotina de treino, inclua:
    1. Nome da rotina
    2. Breve descrição e objetivo
    3. Lista de exercícios, cada um com:
       - Nome do exercício
       - Séries e repetições
       - Descanso entre séries
       - Nível de dificuldade
       - Músculos trabalhados
       - Descrição da execução
    
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
              "difficulty": "Intermediário",
              "muscles": ["Peito", "Tríceps"],
              "execution": "Descrição da execução"
            }
          ]
        }
      ]
    }
    `
    
    // Usando Hugging Face Inference API
    const HF_API_TOKEN = Deno.env.get('HF_API_TOKEN');
    // Modelo recomendado para português e geração de texto: mistralai/Mistral-7B-Instruct-v0.2
    const HF_MODEL = Deno.env.get('HF_MODEL') || 'mistralai/Mistral-7B-Instruct-v0.2';
    
    // Configuração para o modelo instruído
    const payload = {
      inputs: `<s>[INST] ${prompt} [/INST]`,
      parameters: {
        max_new_tokens: 2048,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false
      }
    };
    
    // Chamar a API do Hugging Face
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API do Hugging Face: ${response.status} - ${errorText}`);
    }
    
    // Processar resposta do Hugging Face
    const hfResponse = await response.json();
    let responseContent = Array.isArray(hfResponse) && hfResponse.length > 0 ? 
      hfResponse[0].generated_text : 
      hfResponse.generated_text || '';
    
    console.log("Resposta bruta do modelo:", responseContent);
    
    // Extrair e processar o JSON da resposta
    let suggestedWorkouts;
    try {
      // Tentar extrair JSON da resposta - modelos podem formatar saídas diferentemente
      const jsonMatch = responseContent.match(/```json\n([\s\S]*)\n```/) || 
                      responseContent.match(/```\n([\s\S]*)\n```/) ||
                      responseContent.match(/{[\s\S]*}/)
      
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseContent;
      
      // Alguns modelos podem fornecer texto antes ou depois do JSON
      const cleanedJsonString = jsonString.replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, '$1');
      
      suggestedWorkouts = JSON.parse(cleanedJsonString);
      
      // Se o JSON não tiver a propriedade workouts, adicionar
      if (!suggestedWorkouts.workouts && Array.isArray(suggestedWorkouts)) {
        suggestedWorkouts = { workouts: suggestedWorkouts };
      } else if (!suggestedWorkouts.workouts) {
        // Caso não seja possível extrair um array, criar um objeto com o primeiro workout
        suggestedWorkouts = { 
          workouts: [
            {
              name: "Treino Personalizado",
              description: "Treino personalizado baseado na sua avaliação",
              exercises: suggestedWorkouts.exercises || []
            }
          ] 
        };
      }
    } catch (parseError) {
      console.error("Erro ao processar resposta da IA:", parseError, "Resposta:", responseContent);
      
      // Criar um treino padrão em caso de erro
      suggestedWorkouts = {
        workouts: [
          {
            name: "Treino Básico",
            description: "Treino básico gerado devido a um erro de processamento",
            exercises: [
              {
                name: "Agachamento",
                sets: 3,
                reps: "12-15",
                rest: "60 segundos",
                difficulty: "Iniciante",
                muscles: ["Quadríceps", "Glúteos"],
                execution: "Mantenha os pés na largura dos ombros, desça como se fosse sentar em uma cadeira."
              },
              {
                name: "Flexão de Braço",
                sets: 3,
                reps: "10-12",
                rest: "60 segundos",
                difficulty: "Iniciante",
                muscles: ["Peito", "Tríceps"],
                execution: "Mantenha o corpo reto, desça até que o peito quase toque o chão."
              },
              {
                name: "Prancha",
                sets: 3,
                reps: "30 segundos",
                rest: "30 segundos",
                difficulty: "Iniciante",
                muscles: ["Core", "Abdômen"],
                execution: "Mantenha o corpo reto apoiado nos antebraços e pontas dos pés."
              }
            ]
          }
        ]
      };
    }
    
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
    }))
    
    const { data: insertedWorkouts, error: insertError } = await supabaseClient
      .from('ai_suggested_workouts')
      .insert(workoutsToInsert)
      .select()
    
    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar sugestões', details: insertError }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin
          } 
        }
      )
    }
    
    return new Response(
      JSON.stringify({ success: true, workouts: insertedWorkouts }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin
        } 
      }
    )
    
  } catch (error) {
    console.error("Erro interno:", error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin
        } 
      }
    )
  }
}) 