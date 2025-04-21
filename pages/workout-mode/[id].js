import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../../components/Layout';
import Head from 'next/head';

// Componente principal da página de treino
export default function WorkoutModePage() {
  const [isClient, setIsClient] = useState(false);

  // Este useEffect garante que o código seja executado apenas no lado do cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Renderizamos o conteúdo real apenas do lado do cliente
  if (!isClient) {
    return (
      <Layout title="Carregando...">
        <div className="text-center py-10">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  // Se estamos no cliente, é seguro renderizar o componente completo
  return <WorkoutMode />;
}

// Componente que contém a lógica de treino - agora é interno ao arquivo
// para evitar problemas de referência cíclica
function WorkoutMode() {
  const router = useRouter();
  const { id, session: sessionUrlParam } = router.query;
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [workoutList, setWorkoutList] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  // Estado do treino
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState({});
  const [repsCompleted, setRepsCompleted] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0);
  const [existingSession, setExistingSession] = useState(null);
  
  // Calculamos o objeto de exercício atual com base no índice
  const currentExercise = exercises[currentExerciseIndex] || null;

  // Verificar se existe um treino em andamento para esta lista quando a página carrega
  useEffect(() => {
    if (id && user) {
      fetchWorkoutList();
      fetchExercises();
      checkExistingSession();
    }
  }, [id, user]);

  // Função para verificar se existe uma sessão em andamento
  const checkExistingSession = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('workout_list_id', id)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setExistingSession(data[0]);
      }
    } catch (error) {
      console.error('Erro ao verificar sessões existentes:', error);
    }
  };

  const fetchWorkoutList = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workout_lists')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setWorkoutList(data);
      } else {
        setError("Lista de treino não encontrada");
        setTimeout(() => {
          router.push('/workout-lists');
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao buscar lista de treinos:', error);
      setError('Não foi possível carregar a lista de treinos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_list_id', id)
        .order('order_position', { ascending: true });

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    }
  };

  // Função para iniciar um novo treino
  const startWorkout = async () => {
    try {
      // Iniciar nova sessão de treino
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert([
          { 
            user_id: user.id,
            workout_list_id: id,
            completed: false,
            started_at: new Date().toISOString()
          }
        ])
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Definir estado para iniciar o treino
        setSessionId(data[0].id);
        setIsWorkoutActive(true);
        setCurrentExerciseIndex(0);
        setCurrentSetIndex(0);
        setCompletedSets({});
        
        // Atualizar a sessão existente
        setExistingSession(null);
      }
    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      setError('Ocorreu um erro ao iniciar o treino. Por favor, tente novamente.');
    }
  };

  // Função para retomar um treino existente
  const resumeWorkout = async () => {
    if (!existingSession) return;
    
    try {
      setLoading(true);
      setSessionId(existingSession.id);
      
      // Buscar detalhes da sessão para restaurar o estado
      const { data: sessionDetails, error } = await supabase
        .from('workout_session_details')
        .select('*')
        .eq('session_id', existingSession.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Determinar o exercício e série atual com base nos detalhes salvos
      if (sessionDetails && sessionDetails.length > 0) {
        const latestDetail = sessionDetails[0];
        setCurrentExerciseIndex(latestDetail.exercise_index || 0);
        setCurrentSetIndex(latestDetail.set_index || 0);
        
        // Restaurar conjuntos completados
        const completed = {};
        sessionDetails.forEach(detail => {
          const key = `exercise_${detail.exercise_id}`;
          if (!completed[key]) {
            completed[key] = [];
          }
          if (!completed[key].includes(detail.set_index)) {
            completed[key].push(detail.set_index);
          }
        });
        setCompletedSets(completed);
      }
      
      setIsWorkoutActive(true);
      setExistingSession(null);
    } catch (error) {
      console.error('Erro ao retomar treino:', error);
      setError('Ocorreu um erro ao retomar o treino. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para marcar uma série como concluída
  const completeSet = async () => {
    if (!currentExercise) return;
    
    try {
      // Marcar a série como concluída no estado
      const exerciseKey = `exercise_${currentExercise.id}`;
      const updatedCompletedSets = { ...completedSets };
      
      if (!updatedCompletedSets[exerciseKey]) {
        updatedCompletedSets[exerciseKey] = [];
      }
      
      if (!updatedCompletedSets[exerciseKey].includes(currentSetIndex)) {
        updatedCompletedSets[exerciseKey].push(currentSetIndex);
      }
      
      setCompletedSets(updatedCompletedSets);
      
      // Registrar os detalhes da série
      await supabase
        .from('workout_session_details')
        .insert([
          {
            session_id: sessionId,
            exercise_id: currentExercise.id,
            exercise_index: currentExerciseIndex,
            set_index: currentSetIndex,
            reps_completed: parseInt(repsCompleted) || 0,
            weight: currentExercise.weight
          }
        ]);
      
      // Passar para a próxima série ou exercício
      if (currentSetIndex < currentExercise.sets - 1) {
        // Passar para a próxima série do mesmo exercício
        setCurrentSetIndex(currentSetIndex + 1);
      } else if (currentExerciseIndex < exercises.length - 1) {
        // Passar para o próximo exercício
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSetIndex(0);
      } else {
        // Treino concluído
        finishWorkout();
      }
      
      // Limpar o campo de repetições
      setRepsCompleted('');
      
      // Iniciar timer de descanso
      if (currentExercise.rest_time) {
        setRestTimeRemaining(currentExercise.rest_time);
        setRestTimerActive(true);
      }
    } catch (error) {
      console.error('Erro ao completar série:', error);
    }
  };

  // Função para finalizar o treino
  const finishWorkout = async () => {
    try {
      await supabase
        .from('workout_sessions')
        .update({ 
          completed: true,
          ended_at: new Date().toISOString(),
          duration: totalWorkoutTime
        })
        .eq('id', sessionId);
        
      alert('Parabéns! Você concluiu o treino.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao finalizar treino:', error);
    }
  };

  // Função para cancelar o treino
  const cancelWorkout = () => {
    if (confirm('Tem certeza que deseja cancelar este treino? Seu progresso será salvo.')) {
      router.push('/dashboard');
    }
  };

  // Função para formatar o tempo
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Verificar se uma série está completa
  const isSetCompleted = (exerciseIndex, setIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) return false;
    
    const exerciseKey = `exercise_${exercise.id}`;
    return completedSets[exerciseKey] && completedSets[exerciseKey].includes(setIndex);
  };

  if (loading) {
    return (
      <Layout title="Carregando treino...">
        <div className="text-center py-10">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Treino: ${workoutList?.name || ''}`}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TreinoPro" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 rounded-lg shadow-lg p-3 text-white">
          <h1 className="text-xl font-bold">
            {isWorkoutActive ? 'Treino em Andamento' : 'Iniciar Treino'}
          </h1>
          <div className="flex space-x-2">
            {isWorkoutActive ? (
              <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
                Treino ativo
              </div>
            ) : (
              <>
                <button
                  onClick={() => router.push('/workout-lists')}
                  className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 font-medium py-2 px-4 rounded-full shadow transition-all"
                >
                  Voltar
                </button>
                {existingSession ? (
                  <button
                    onClick={resumeWorkout}
                    className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full shadow transition-all transform hover:scale-105"
                  >
                    Retomar Treino
                  </button>
                ) : (
                  <button
                    onClick={startWorkout}
                    className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full shadow transition-all transform hover:scale-105"
                    disabled={exercises.length === 0}
                  >
                    Iniciar Treino
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 p-4 rounded-r-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500 dark:text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {existingSession && !isWorkoutActive && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 rounded-r-lg shadow-sm">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Você tem um treino em andamento. Clique em "Retomar Treino" para continuar.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isWorkoutActive ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-4">
                Lista de Treino: {workoutList?.name}
              </h2>
              
              {workoutList?.description && (
                <p className="dark-text-secondary mb-6">{workoutList.description}</p>
              )}
              
              <div className="space-y-6">
                <h3 className="text-lg font-medium dark-text-primary">Exercícios ({exercises.length})</h3>
                
                {exercises.length > 0 ? (
                  <div className="space-y-3">
                    {exercises.map((exercise, index) => (
                      <div key={exercise.id} className="dark-card border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between">
                          <h4 className="font-medium dark-text-primary">
                            {index + 1}. {exercise.name}
                          </h4>
                        </div>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <p className="text-xs dark-text-tertiary">Séries</p>
                            <p className="font-medium dark-text-secondary">{exercise.sets}</p>
                          </div>
                          <div>
                            {exercise.reps ? (
                              <>
                                <p className="text-xs dark-text-tertiary">Repetições</p>
                                <p className="font-medium dark-text-secondary">{exercise.reps}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs dark-text-tertiary">Tempo</p>
                                <p className="font-medium dark-text-secondary">{exercise.time}s</p>
                              </>
                            )}
                          </div>
                          <div>
                            <p className="text-xs dark-text-tertiary">Carga</p>
                            <p className="font-medium dark-text-secondary">{exercise.weight ? `${exercise.weight}kg` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs dark-text-tertiary">Descanso</p>
                            <p className="font-medium dark-text-secondary">{exercise.rest_time}s</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="dark-text-tertiary mb-2">Não há exercícios nesta lista de treino</p>
                    <button
                      onClick={() => router.push(`/workout-lists/${id}`)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      Adicionar exercícios
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Interface do treino ativo
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold dark-text-primary mb-2">
                {workoutList?.name}
              </h2>
              
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <div>
                    <span className="text-xs dark-text-tertiary">Exercício</span>
                    <p className="font-medium dark-text-secondary">{currentExerciseIndex + 1} / {exercises.length}</p>
                  </div>
                  {restTimerActive && (
                    <div>
                      <span className="text-xs dark-text-tertiary">Descanso</span>
                      <p className="font-medium text-yellow-600 dark:text-yellow-400">{formatTime(restTimeRemaining)}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={cancelWorkout}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
                >
                  Cancelar Treino
                </button>
              </div>
            </div>
            
            {currentExercise && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-5 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold dark-text-primary">
                      {currentExercise.name}
                    </h3>
                    <p className="text-sm dark-text-tertiary">
                      {currentExercise.reps 
                        ? `${currentExercise.sets} séries × ${currentExercise.reps} repetições` 
                        : `${currentExercise.sets} séries × ${currentExercise.time}s`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs dark-text-tertiary">Série atual</span>
                    <p className="font-medium dark-text-secondary">{currentSetIndex + 1} / {currentExercise.sets}</p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  {Array.from({ length: currentExercise.sets }).map((_, setIndex) => (
                    <div 
                      key={setIndex}
                      className={`flex justify-between items-center p-3 rounded-md ${
                        setIndex === currentSetIndex 
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50' 
                          : isSetCompleted(currentExerciseIndex, setIndex)
                            ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50'
                            : 'bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full mr-3 ${
                          isSetCompleted(currentExerciseIndex, setIndex)
                            ? 'bg-green-500 text-white'
                            : setIndex === currentSetIndex
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}>
                          {setIndex + 1}
                        </span>
                        <span className="font-medium dark-text-primary">Série {setIndex + 1}</span>
                      </div>
                      
                      {/* Mostrar input apenas para a série atual */}
                      {setIndex === currentSetIndex && !isSetCompleted(currentExerciseIndex, setIndex) && (
                        <div className="flex items-center space-x-2">
                          {currentExercise.reps ? (
                            <>
                              <input
                                type="number"
                                placeholder={`${currentExercise.reps}`}
                                className="w-16 p-2 border border-gray-300 dark:border-gray-600 rounded-md dark-input"
                                value={repsCompleted}
                                onChange={(e) => setRepsCompleted(e.target.value)}
                              />
                              <span className="text-sm dark-text-tertiary">reps</span>
                            </>
                          ) : (
                            <span className="text-sm dark-text-tertiary">{currentExercise.time}s</span>
                          )}
                          <button
                            onClick={completeSet}
                            className="ml-2 px-3 py-1 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-md"
                          >
                            Concluído
                          </button>
                        </div>
                      )}
                      
                      {/* Mostrar marca de concluído para séries já completadas */}
                      {isSetCompleted(currentExerciseIndex, setIndex) && (
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="ml-1 text-sm text-green-700 dark:text-green-400">Concluído</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Progresso geral */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm dark-text-tertiary">Progresso</span>
                <span className="text-sm dark-text-tertiary">
                  {Object.values(completedSets).reduce((total, sets) => total + sets.length, 0)} / 
                  {exercises.reduce((total, ex) => total + ex.sets, 0)} séries
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ 
                    width: `${Math.round(
                      (Object.values(completedSets).reduce((total, sets) => total + sets.length, 0) /
                      exercises.reduce((total, ex) => total + ex.sets, 0)) * 100
                    )}%` 
                  }}
                ></div>
              </div>
            </div>
            
            {/* Próximos exercícios */}
            {currentExerciseIndex < exercises.length - 1 && (
              <div>
                <h3 className="text-md font-medium dark-text-primary mb-3">Próximos exercícios</h3>
                <div className="space-y-2">
                  {exercises.slice(currentExerciseIndex + 1, currentExerciseIndex + 3).map((exercise, index) => (
                    <div key={exercise.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm mr-3">
                        {currentExerciseIndex + index + 2}
                      </span>
                      <div>
                        <p className="font-medium dark-text-primary">{exercise.name}</p>
                        <p className="text-xs dark-text-tertiary">
                          {exercise.reps 
                            ? `${exercise.sets} séries × ${exercise.reps} repetições` 
                            : `${exercise.sets} séries × ${exercise.time}s`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}