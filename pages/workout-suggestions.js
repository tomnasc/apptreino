import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { FiArrowLeft, FiStar, FiThumbsUp, FiThumbsDown, FiCheck, FiMessageCircle } from 'react-icons/fi';
import WorkoutChat from '../components/WorkoutChat';

export default function WorkoutSuggestionsPage() {
  const router = useRouter();
  const { assessmentId } = router.query;
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [loading, setLoading] = useState(true);
  const [generatingWorkouts, setGeneratingWorkouts] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [measurements, setMeasurements] = useState(null);
  const [suggestedWorkouts, setSuggestedWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [chatWorkout, setChatWorkout] = useState(null);
  
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (assessmentId) {
      loadData();
    }
  }, [user, assessmentId]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar avaliação
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('user_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      
      if (assessmentError) throw assessmentError;
      setAssessment(assessmentData);
      
      // Carregar últimas medidas
      const { data: measurementsData, error: measurementsError } = await supabase
        .from('user_body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      if (measurementsError && measurementsError.code !== 'PGRST116') {
        throw measurementsError;
      }
      
      if (measurementsData) {
        setMeasurements(measurementsData);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados da avaliação');
    } finally {
      setLoading(false);
    }
  };
  
  const generateWorkouts = async () => {
    try {
      setGeneratingWorkouts(true);
      
      // Obter o token de autenticação
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
        throw new Error('Erro ao verificar autenticação');
      }
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }
      
      // Chamar API para gerar sugestões
      const response = await fetch('/api/ai-workout-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ assessmentId }) // Enviar apenas o ID da avaliação
      });
      
      if (!response.ok) {
        // Tentar obter mensagem de erro detalhada
        let errorDetail = 'Erro ao gerar sugestões de treino';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorDetail = errorData.error;
          }
          console.error('Resposta de erro da API:', errorData);
        } catch (e) {
          console.error('Não foi possível analisar a resposta de erro:', e);
        }
        throw new Error(errorDetail);
      }
      
      const data = await response.json();
      
      if (!data || !data.success) {
        throw new Error(data?.message || data?.error || 'Resposta inválida da API');
      }
      
      // Verificar se temos os treinos sugeridos
      console.log('Resposta da API:', data);
      
      if (data.workouts && Array.isArray(data.workouts)) {
        setSuggestedWorkouts(data.workouts);
        toast.success('Sugestões de treino geradas com sucesso!');
      } else {
        throw new Error('Formato de resposta inválido');
      }
      
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      
      // Verificar se é um erro específico do serviço de IA
      if (error.message.includes('IA está') || 
          error.message.includes('serviço de IA') || 
          error.message.includes('modelo de IA')) {
        toast.error(error.message, {
          duration: 6000,
          icon: '🤖'
        });
      } else if (error.message.includes('Timeout') || error.message.includes('timeout')) {
        toast.error('O serviço está demorando muito para responder. Por favor, tente novamente mais tarde.', {
          duration: 6000
        });
      } else {
        toast.error(`Erro ao gerar sugestões: ${error.message}`);
      }
    } finally {
      setGeneratingWorkouts(false);
    }
  };
  
  // Função para salvar feedback do usuário
  const saveFeedback = async (workoutId, rating, notes = '') => {
    try {
      const { error } = await supabase
        .from('ai_suggested_workouts')
        .update({
          user_feedback: rating,
          user_feedback_notes: notes
        })
        .eq('id', workoutId);
      
      if (error) throw error;
      
      // Atualizar estado local
      setSuggestedWorkouts(prev => 
        prev.map(workout => 
          workout.id === workoutId 
            ? { ...workout, user_feedback: rating, user_feedback_notes: notes }
            : workout
        )
      );
      
      toast.success('Feedback enviado!');
      
    } catch (error) {
      console.error('Erro ao salvar feedback:', error);
      toast.error('Erro ao salvar feedback');
    }
  };
  
  // Função para selecionar/salvar treino
  const selectWorkout = async (workoutId) => {
    try {
      // Desmarcar todos os treinos
      await supabase
        .from('ai_suggested_workouts')
        .update({ selected: false })
        .eq('assessment_id', assessmentId);
      
      // Marcar o treino selecionado
      const { error } = await supabase
        .from('ai_suggested_workouts')
        .update({ selected: true })
        .eq('id', workoutId);
      
      if (error) throw error;
      
      // Atualizar estado local
      setSuggestedWorkouts(prev => 
        prev.map(workout => ({
          ...workout,
          selected: workout.id === workoutId
        }))
      );
      
      setSelectedWorkout(workoutId);
      
      // Obter o treino selecionado dos dados locais
      const selectedWorkoutData = suggestedWorkouts.find(workout => workout.id === workoutId);
      
      if (selectedWorkoutData) {
        try {
          // 1. Criar uma nova lista de treino a partir do treino sugerido selecionado
          const { data: newWorkoutList, error: createListError } = await supabase
            .from('workout_lists')
            .insert([{ 
              name: selectedWorkoutData.workout_name, 
              description: `${selectedWorkoutData.workout_description} (Gerado pela IA)`,
              user_id: user.id
            }])
            .select();
          
          if (createListError) throw createListError;
          
          // 2. Verificar se a lista foi criada e se temos os exercícios
          if (newWorkoutList && newWorkoutList.length > 0 && selectedWorkoutData.exercises && selectedWorkoutData.exercises.length > 0) {
            const workoutListId = newWorkoutList[0].id;
            
            // 3. Preparar os exercícios para inserção
            // Converter os dados para o formato correto do banco
            const exercisesToInsert = selectedWorkoutData.exercises.map((exercise, index) => {
              // Extrair o número de repetições (ignorando texto adicional se houver)
              let reps = exercise.reps;
              if (typeof reps === 'string') {
                // Se for um intervalo como "10-12", pega apenas o primeiro número
                if (reps.includes('-')) {
                  reps = reps.split('-')[0];
                }
                
                // Remove qualquer texto não numérico
                const repsMatch = reps.match(/\d+/);
                if (repsMatch) {
                  reps = parseInt(repsMatch[0]);
                } else {
                  reps = 10; // Valor padrão se não conseguir extrair um número
                }
              } else if (typeof reps === 'number') {
                reps = Math.floor(reps); // Garante que é um inteiro
              } else {
                reps = 10; // Valor padrão caso o valor não seja string nem número
              }
              
              // Processar tempo de descanso, considerando diferentes formatos
              let restTime = 60; // Valor padrão em segundos
              if (exercise.rest) {
                // Remover qualquer caractere não numérico e converter para número
                const restMatch = exercise.rest.match(/\d+/);
                if (restMatch) {
                  restTime = parseInt(restMatch[0]);
                  
                  // Se em minutos, converter para segundos
                  if (exercise.rest.toLowerCase().includes('min')) {
                    restTime *= 60;
                  }
                }
              }
              
              // Criar anotações combinando execução e músculos trabalhados
              let notes = '';
              if (exercise.execution) {
                notes += exercise.execution;
              }
              
              // Processar músculos com verificação de tipo
              if (exercise.muscles) {
                let musclesList = '';
                
                // Verificar se muscles é um array
                if (Array.isArray(exercise.muscles)) {
                  musclesList = exercise.muscles.map(m => translateMuscle(m)).join(', ');
                } 
                // Se for uma string, considerar como um único músculo
                else if (typeof exercise.muscles === 'string') {
                  musclesList = translateMuscle(exercise.muscles);
                }
                // Se for outro tipo (objeto, etc.), usar um valor padrão
                else {
                  musclesList = 'Não especificado';
                }
                
                if (musclesList && musclesList.length > 0) {
                  if (notes) {
                    notes += `\n\nMúsculos trabalhados: ${musclesList}`;
                  } else {
                    notes = `Músculos trabalhados: ${musclesList}`;
                  }
                }
              }
              
              if (exercise.difficulty) {
                const difficultyTr = translateDifficulty(exercise.difficulty);
                if (notes) {
                  notes += `\n\nDificuldade: ${difficultyTr}`;
                } else {
                  notes = `Dificuldade: ${difficultyTr}`;
                }
              }
              
              // Construir objeto de exercício - removendo a coluna notes que não existe no banco
              return {
                workout_list_id: workoutListId,
                name: exercise.name,
                sets: parseInt(exercise.sets) || 3,
                reps: reps,
                rest_time: restTime,
                order_position: index + 1
              };
            });
            
            // 4. Inserir os exercícios no banco de dados
            const { error: insertExercisesError } = await supabase
              .from('workout_exercises')
              .insert(exercisesToInsert);
            
            if (insertExercisesError) throw insertExercisesError;
            
            // 5. Notificar usuário e redirecionar
            toast.success('Treino adicionado com sucesso à sua lista de treinos!');
            
            // Redirecionar para a página da lista de treino
            setTimeout(() => {
              router.push(`/workout-lists/${workoutListId}`);
            }, 1500);
            
          } else {
            toast.success('Treino selecionado, mas sem exercícios para adicionar.');
          }
        } catch (error) {
          console.error('Erro ao criar lista de treino:', error);
          toast.error('Erro ao criar lista de treino a partir do treino selecionado.');
          throw error; // Repassar o erro para ser tratado no catch externo
        }
      } else {
        toast.success('Treino selecionado e salvo!');
      }
      
    } catch (error) {
      console.error('Erro ao selecionar treino:', error);
      toast.error('Erro ao selecionar treino');
    }
  };
  
  // Função para selecionar um treino para o chat
  const selectWorkoutForChat = (workout) => {
    setChatWorkout(workout);
  };
  
  // Mapear tradução para possíveis termos em inglês
  const translateMuscle = (muscle) => {
    const translations = {
      'chest': 'Peito',
      'back': 'Costas',
      'legs': 'Pernas',
      'shoulders': 'Ombros',
      'biceps': 'Bíceps',
      'triceps': 'Tríceps',
      'abs': 'Abdômen',
      'core': 'Core',
      'glutes': 'Glúteos',
      'quads': 'Quadríceps',
      'hamstrings': 'Isquiotibiais',
      'calves': 'Panturrilhas'
    };
    
    // Verificar se o músculo está em inglês e precisa ser traduzido
    const muscleLower = muscle.toLowerCase();
    
    for (const [engTerm, ptTerm] of Object.entries(translations)) {
      if (muscleLower === engTerm.toLowerCase()) {
        return ptTerm;
      }
    }
    
    return muscle; // Retorna o original se não encontrar tradução
  };

  const translateDifficulty = (difficulty) => {
    const translations = {
      'beginner': 'Iniciante',
      'intermediate': 'Intermediário',
      'advanced': 'Avançado'
    };
    
    // Verificar se a dificuldade está em inglês e precisa ser traduzida
    const diffLower = difficulty?.toLowerCase();
    
    for (const [engTerm, ptTerm] of Object.entries(translations)) {
      if (diffLower === engTerm.toLowerCase()) {
        return ptTerm;
      }
    }
    
    return difficulty; // Retorna o original se não encontrar tradução
  };

  // Função para renderizar exercícios, aplicando tradução quando necessário
  const renderExercises = (exercises, workoutId) => {
    return exercises.map((exercise, index) => {
      // Verificar se exercise.muscles existe E é um array antes de tentar fazer o map
      let translatedMuscles = ['Não especificado'];
      
      if (exercise.muscles) {
        // Verificar se muscles é um array
        if (Array.isArray(exercise.muscles)) {
          translatedMuscles = exercise.muscles.map(translateMuscle);
        } 
        // Se for uma string, considerar como um único músculo
        else if (typeof exercise.muscles === 'string') {
          translatedMuscles = [translateMuscle(exercise.muscles)];
        }
        // Se for outro tipo (objeto, etc.), usar um valor padrão
        else {
          translatedMuscles = ['Não especificado'];
        }
      }
      
      // Aplicar tradução para dificuldade caso esteja em inglês e exista
      const translatedDifficulty = exercise.difficulty ? 
        translateDifficulty(exercise.difficulty) : 
        'Normal';
      
      const exerciseId = `${workoutId}-${index}`;
      
      return (
        <li key={index} className="text-sm">
          <div
            onClick={() => setExpandedExercise(
              expandedExercise === exerciseId ? null : exerciseId
            )}
            className="flex justify-between items-center cursor-pointer py-2 px-3 dark-card rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <span className="dark-text-primary">{exercise.name}</span>
            <span className="text-xs dark-text-tertiary">{exercise.sets}×{exercise.reps}</span>
          </div>
          
          {expandedExercise === exerciseId && (
            <div className="mt-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-md text-xs space-y-1">
              <p><span className="font-medium">Séries:</span> {exercise.sets}</p>
              <p><span className="font-medium">Repetições:</span> {exercise.reps}</p>
              <p><span className="font-medium">Descanso:</span> {exercise.rest}</p>
              <p><span className="font-medium">Dificuldade:</span> {translatedDifficulty}</p>
              <p><span className="font-medium">Músculos:</span> {translatedMuscles.join(', ')}</p>
              <p><span className="font-medium">Execução:</span> {exercise.execution || 'Mantenha a postura correta durante todo o movimento.'}</p>
            </div>
          )}
        </li>
      );
    });
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title="Sugestões de Treino">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="mr-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Sugestões de Treino</h1>
        </div>
        
        {/* Resumo da avaliação */}
        {assessment && (
          <div className="dark-card rounded-lg shadow-md p-4 mb-6">
            <h3 className="text-lg font-medium dark-text-primary mb-2">Resumo da Avaliação</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm dark-text-tertiary">Altura</p>
                <p className="font-medium dark-text-secondary">{assessment.height} cm</p>
              </div>
              <div>
                <p className="text-sm dark-text-tertiary">Peso</p>
                <p className="font-medium dark-text-secondary">{assessment.weight} kg</p>
              </div>
              <div>
                <p className="text-sm dark-text-tertiary">Idade</p>
                <p className="font-medium dark-text-secondary">{assessment.age} anos</p>
              </div>
              <div>
                <p className="text-sm dark-text-tertiary">Objetivo</p>
                <p className="font-medium dark-text-secondary">
                  {assessment.fitness_goal === 'weight_loss' && 'Perda de peso'}
                  {assessment.fitness_goal === 'muscle_gain' && 'Ganho de massa'}
                  {assessment.fitness_goal === 'endurance' && 'Resistência'}
                  {assessment.fitness_goal === 'general_fitness' && 'Condicionamento geral'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Botão para gerar novas sugestões */}
        <div className="flex justify-end mb-6 space-x-2">
          {generatingWorkouts ? (
            <>
              <div className="flex items-center">
                <button
                  disabled
                  className="px-4 py-2 bg-blue-600 opacity-50 text-white rounded-md text-sm font-medium focus:outline-none flex items-center"
                >
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gerando...
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="ml-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-800 text-white rounded-md text-sm font-medium focus:outline-none"
                >
                  Tentar Novamente
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={generateWorkouts}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium focus:outline-none"
            >
              Gerar Novas Sugestões
            </button>
          )}
        </div>
        
        {/* Lista de treinos sugeridos */}
        {suggestedWorkouts.length === 0 && !generatingWorkouts ? (
          <div className="dark-card rounded-lg shadow-md p-8 text-center">
            <h3 className="text-xl font-medium dark-text-primary mb-2">Nenhuma sugestão de treino gerada</h3>
            <p className="dark-text-secondary mb-4">Clique no botão acima para gerar sugestões de treino personalizadas com base na sua avaliação física.</p>
            <button
              onClick={generateWorkouts}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium focus:outline-none"
            >
              Gerar Sugestões de Treino
            </button>
          </div>
        ) : suggestedWorkouts.length === 0 ? (
          <div className="dark-card rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin inline-block w-10 h-10 border-[3px] border-current border-t-transparent text-blue-600 dark:text-blue-400 rounded-full mb-4"></div>
            <h3 className="text-xl font-medium dark-text-primary mb-2">Gerando sugestões de treino</h3>
            <p className="dark-text-secondary">Aguarde enquanto nossa IA cria rotinas personalizadas para você...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {suggestedWorkouts.map(workout => (
              <div 
                key={workout.id} 
                className={`dark-card rounded-lg shadow-md overflow-hidden transition-all ${
                  workout.selected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold dark-text-primary">{workout.workout_name}</h3>
                    {workout.selected && (
                      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                        <FiCheck className="mr-1" />
                        Selecionado
                      </span>
                    )}
                  </div>
                  
                  <p className="dark-text-secondary text-sm mb-4">{workout.workout_description}</p>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium dark-text-tertiary mb-2">Exercícios:</h4>
                    <ul className="space-y-2">
                      {renderExercises(workout.exercises, workout.id)}
                    </ul>
                  </div>
                  
                  <div className="pt-3 mt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveFeedback(workout.id, workout.user_feedback === 1 ? null : 1)}
                        className={`p-2 rounded ${
                          workout.user_feedback === 1
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                        title="Gostei"
                      >
                        <FiThumbsUp size={16} />
                      </button>
                      <button
                        onClick={() => saveFeedback(workout.id, workout.user_feedback === -1 ? null : -1)}
                        className={`p-2 rounded ${
                          workout.user_feedback === -1
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                        title="Não gostei"
                      >
                        <FiThumbsDown size={16} />
                      </button>
                      {/* Botão para tirar dúvidas sobre este treino */}
                      <button
                        onClick={() => selectWorkoutForChat(workout)}
                        className="p-2 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        title="Tirar dúvidas sobre este treino"
                      >
                        <FiMessageCircle size={16} />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => selectWorkout(workout.id)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        workout.selected
                          ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white'
                      }`}
                    >
                      {workout.selected ? 'Selecionado' : 'Selecionar Treino'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Adicionar componente de chat */}
        {user && chatWorkout && (
          <WorkoutChat 
            workout={chatWorkout} 
            assessmentId={assessmentId} 
            userId={user.id}
          />
        )}
        
        {/* Navegação para Dashboard ou Treinos */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Voltar para Dashboard
          </button>
          
          {selectedWorkout && (
            <button
              onClick={() => router.push('/workout-lists')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium"
            >
              Ver Meus Treinos
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
} 