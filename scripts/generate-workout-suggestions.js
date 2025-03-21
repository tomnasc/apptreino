// Função Edge do Supabase para gerar sugestões de treino usando OpenAI
// Nome da função: generate-workout-suggestions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'

// Configurações da função
Deno.serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Extrair corpo da requisição
    const body = await req.json()
    
    // Extrair token de autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação ausente' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Buscar avaliação física
    const assessmentId = body.assessmentId
    if (!assessmentId) {
      return new Response(
        JSON.stringify({ error: 'ID da avaliação não fornecido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    if (!assessment) {
      return new Response(
        JSON.stringify({ error: 'Avaliação não encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Configurar OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    })
    const openai = new OpenAIApi(configuration)
    
    // Criar prompt para OpenAI com dados anonimizados
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
    
    // Chamar a API da OpenAI
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Você é um personal trainer experiente que cria rotinas de treino personalizadas." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
    })
    
    // Processar resposta da OpenAI
    const responseContent = completion.data.choices[0]?.message?.content || ''
    let suggestedWorkouts
    try {
      // Extrair JSON da resposta
      const jsonMatch = responseContent.match(/```json\n([\s\S]*)\n```/) || 
                        responseContent.match(/{[\s\S]*}/)
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseContent
      suggestedWorkouts = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("Erro ao processar resposta da IA:", parseError)
      return new Response(
        JSON.stringify({ error: 'Erro ao processar resposta da IA', details: parseError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Salvar sugestões no banco
    const workoutsToInsert = suggestedWorkouts.workouts.map(workout => ({
      assessment_id: assessmentId,
      workout_name: workout.name,
      workout_description: workout.description,
      exercises: workout.exercises,
      workout_metadata: {
        source: 'openai',
        model: 'gpt-3.5-turbo'
      }
    }))
    
    const { data: insertedWorkouts, error: insertError } = await supabaseClient
      .from('ai_suggested_workouts')
      .insert(workoutsToInsert)
      .select()
    
    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar sugestões', details: insertError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ success: true, workouts: insertedWorkouts }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 