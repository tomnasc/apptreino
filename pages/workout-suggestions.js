import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { FiArrowLeft, FiStar, FiThumbsUp, FiThumbsDown, FiCheck } from 'react-icons/fi';

export default function WorkoutSuggestionsPage() {
  const router = useRouter();
  const { assessmentId } = router.query;
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [loading, setLoading] = useState(true);
  const [generatingWorkouts, setGeneratingWorkouts] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [suggestedWorkouts, setSuggestedWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [expandedExercise, setExpandedExercise] = useState(null);
  
  // Buscar avaliação e treinos sugeridos existentes
  useEffect(() => {
    if (!assessmentId || !user) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar avaliação
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('user_assessments')
          .select('*')
          .eq('id', assessmentId)
          .eq('user_id', user.id)
          .single();
        
        if (assessmentError) throw assessmentError;
        if (!assessmentData) {
          toast.error('Avaliação não encontrada');
          router.push('/dashboard');
          return;
        }
        
        setAssessment(assessmentData);
        
        // Buscar treinos sugeridos existentes
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('ai_suggested_workouts')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('created_at', { ascending: false });
        
        if (workoutsError) throw workoutsError;
        
        setSuggestedWorkouts(workoutsData || []);
        
        // Se não houver treinos, gerar automaticamente
        if (!workoutsData || workoutsData.length === 0) {
          generateWorkouts();
        }
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [assessmentId, user, supabase, router]);
  
  // Função para gerar treinos usando a API route do Next.js
  const generateWorkouts = async () => {
    if (!assessmentId || !user) return;
    
    try {
      setGeneratingWorkouts(true);
      toast.loading('Gerando sugestões de treino...', { id: 'generating' });
      
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      
      if (!authToken) {
        throw new Error('Falha ao obter token de autenticação');
      }
      
      // Chamar a API route local com timeout maior
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos de timeout
      
      try {
        const response = await fetch('/api/ai-workout-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ assessmentId }),
          signal: controller.signal
        });
        
        // Limpar o timeout quando a requisição for concluída
        clearTimeout(timeoutId);
        
        // Verificar se a resposta é JSON antes de tentar fazer o parse
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          console.error('Resposta não-JSON recebida:', textResponse);
          throw new Error('Resposta inválida do servidor. Por favor, tente novamente mais tarde.');
        }
        
        // Agora podemos tentar fazer o parse com segurança
        const responseData = await response.json();
        
        if (!response.ok) {
          // Extrair mensagem de erro mais detalhada
          const errorMessage = 
            responseData.details || 
            responseData.error || 
            'Falha ao gerar sugestões de treino';
            
          console.error('Erro detalhado:', responseData);
          
          throw new Error(errorMessage);
        }
        
        toast.success('Sugestões de treino geradas!', { id: 'generating' });
        
        if (responseData?.workouts) {
          setSuggestedWorkouts(responseData.workouts);
        }
      } catch (fetchError) {
        // Limpar o timeout em caso de erro
        clearTimeout(timeoutId);
        
        // Verificar se é um erro de timeout
        if (fetchError.name === 'AbortError') {
          throw new Error('A geração de treinos está demorando muito. Por favor, tente novamente mais tarde.');
        }
        
        throw fetchError;
      }
      
    } catch (error) {
      console.error('Erro ao gerar treinos:', error);
      
      // Mensagem de erro mais amigável para o usuário
      let errorMessage = 'Erro ao gerar sugestões de treino';
      
      // Verificar se é um erro de timeout
      if (error.message.includes('demorando muito') || error.message.includes('timeout')) {
        errorMessage = 'Tempo esgotado ao gerar treinos. O servidor está ocupado, tente novamente mais tarde.';
        
        // Gerar um treino básico como fallback
        const fallbackWorkouts = [
          {
            id: 'fallback-1',
            workout_name: 'Treino Básico de Emergência',
            workout_description: 'Um treino básico gerado quando o servidor está ocupado',
            exercises: [
              {
                name: 'Agachamento',
                sets: 3,
                reps: '12-15',
                rest: '60 segundos',
                difficulty: 'Iniciante',
                muscles: ['Quadríceps', 'Glúteos'],
                execution: 'Mantenha os pés na largura dos ombros, desça como se fosse sentar em uma cadeira.'
              },
              {
                name: 'Flexão de Braço',
                sets: 3,
                reps: '10-12',
                rest: '60 segundos',
                difficulty: 'Iniciante',
                muscles: ['Peito', 'Tríceps'],
                execution: 'Mantenha o corpo reto, desça até que o peito quase toque o chão.'
              },
              {
                name: 'Prancha',
                sets: 3,
                reps: '30 segundos',
                rest: '30 segundos',
                difficulty: 'Iniciante',
                muscles: ['Core', 'Abdômen'],
                execution: 'Mantenha o corpo reto apoiado nos antebraços e pontas dos pés.'
              }
            ]
          }
        ];
        
        setSuggestedWorkouts(fallbackWorkouts);
        toast.warning('Oferecendo um treino básico enquanto o servidor está ocupado.', { id: 'fallback', duration: 5000 });
      }
      // Verificar se é um erro de ambiente ou configuração
      else if (error.message.includes('Configuração incompleta') || 
          error.message.includes('Variáveis de ambiente')) {
        errorMessage = 'Erro de configuração do servidor. Por favor, contate o suporte.';
      } 
      // Verificar se é um erro do Hugging Face
      else if (error.message.includes('Hugging Face')) {
        errorMessage = 'Erro no serviço de IA. Por favor, tente novamente mais tarde.';
      }
      // Verificar se é um erro de autenticação
      else if (error.message.includes('autenticação') || error.message.includes('token')) {
        errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
      }
      // Verificar se é um erro de sintaxe JSON
      else if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
        errorMessage = 'Erro ao processar a resposta do servidor. Por favor, tente novamente.';
      }
      
      toast.error(errorMessage, { id: 'generating' });
      
      // Reconectar Supabase se for erro de autenticação
      if (error.message.includes('autenticação') || error.message.includes('token')) {
        supabase.auth.refreshSession();
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
      toast.success('Treino selecionado e salvo!');
      
    } catch (error) {
      console.error('Erro ao selecionar treino:', error);
      toast.error('Erro ao selecionar treino');
    }
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
  const renderExercises = (exercises) => {
    return exercises.map((exercise, index) => {
      // Aplicar tradução para os músculos caso estejam em inglês
      const translatedMuscles = exercise.muscles.map(translateMuscle);
      
      // Aplicar tradução para dificuldade caso esteja em inglês
      const translatedDifficulty = translateDifficulty(exercise.difficulty);
      
      return (
        <li key={index} className="text-sm">
          <div
            onClick={() => setExpandedExercise(
              expandedExercise === `${workout.id}-${index}` 
                ? null 
                : `${workout.id}-${index}`
            )}
            className="flex justify-between items-center cursor-pointer py-2 px-3 dark-card rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <span className="dark-text-primary">{exercise.name}</span>
            <span className="text-xs dark-text-tertiary">{exercise.sets}×{exercise.reps}</span>
          </div>
          
          {expandedExercise === `${workout.id}-${index}` && (
            <div className="mt-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-md text-xs space-y-1">
              <p><span className="font-medium">Séries:</span> {exercise.sets}</p>
              <p><span className="font-medium">Repetições:</span> {exercise.reps}</p>
              <p><span className="font-medium">Descanso:</span> {exercise.rest}</p>
              <p><span className="font-medium">Dificuldade:</span> {translatedDifficulty}</p>
              <p><span className="font-medium">Músculos:</span> {translatedMuscles.join(', ')}</p>
              <p><span className="font-medium">Execução:</span> {exercise.execution}</p>
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
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold dark-text-primary">Sugestões de Treino</h1>
            <p className="dark-text-secondary">
              Treinos personalizados baseados na sua avaliação
            </p>
          </div>
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
        <div className="flex justify-end mb-6">
          <button
            onClick={generateWorkouts}
            disabled={generatingWorkouts}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-md text-sm font-medium focus:outline-none disabled:opacity-50"
          >
            {generatingWorkouts ? 'Gerando...' : 'Gerar Novas Sugestões'}
          </button>
        </div>
        
        {/* Lista de treinos sugeridos */}
        {suggestedWorkouts.length === 0 ? (
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
                      {renderExercises(workout.exercises)}
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