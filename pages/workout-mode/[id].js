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
          // Interface do treino ativo - ajustada para o layout original
          <div className="bg-dark dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden">
            {/* Cabeçalho verde do exercício */}
            <div className="bg-green-600 dark:bg-green-700 p-4 text-white">
              <h2 className="text-xl font-bold">Exercício Atual</h2>
            </div>
            
            <div className="p-6">
              {/* Nome do exercício com círculo numerado */}
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white text-2xl font-bold mr-4">
                  {currentExerciseIndex + 1}
                </div>
                <h3 className="text-xl font-bold text-white">{currentExercise?.name}</h3>
              </div>
              
              {/* Cards de informações */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Card de Carga */}
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <div className="flex flex-col items-center">
                    <div className="text-gray-400 mb-2 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Carga
                    </div>
                    <div className="flex items-center">
                      <button className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="text-white text-2xl font-bold">{currentExercise?.weight || 0} kg</span>
                      <button className="w-10 h-10 rounded-lg bg-green-600 text-white flex items-center justify-center ml-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Card de Séries */}
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <div className="flex flex-col items-center">
                    <div className="text-gray-400 mb-2 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      Séries
                    </div>
                    <div className="text-white text-2xl font-bold">
                      {(completedSets[`exercise_${currentExercise?.id}`]?.length || 0) + 1} / {currentExercise?.sets}
                    </div>
                  </div>
                </div>
                
                {/* Card de Repetições */}
                <div className="bg-gray-700/50 rounded-xl p-4 col-span-2">
                  <div className="flex flex-col items-center">
                    <div className="text-gray-400 mb-2 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Repetições
                    </div>
                    <div className="text-white text-2xl font-bold">
                      {repsCompleted || 0} / {currentExercise?.reps || currentExercise?.time}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Input de repetições realizadas */}
              <div className="bg-navy-800 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-white">Repetições realizadas:</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      className="bg-gray-700 text-white text-center w-16 h-10 rounded-lg mx-2"
                      value={repsCompleted}
                      onChange={(e) => setRepsCompleted(e.target.value)}
                    />
                    <span className="text-white">/ {currentExercise?.reps || currentExercise?.time}</span>
                  </div>
                </div>
              </div>
              
              {/* Botões de ação */}
              <div className="space-y-4">
                <button
                  onClick={completeSet}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full"
                >
                  Confirmar
                </button>
                
                <button
                  onClick={() => {
                    if (currentExerciseIndex < exercises.length - 1) {
                      setCurrentExerciseIndex(currentExerciseIndex + 1);
                      setCurrentSetIndex(0);
                    }
                  }}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full"
                >
                  Pular para Próximo Exercício
                </button>
                
                {currentExercise?.video_url && (
                  <button
                    className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Mostrar Vídeo
                  </button>
                )}
              </div>
            </div>
            
            {/* Outros Exercícios */}
            <div className="mt-6">
              <div className="bg-dark px-6 py-4 border-t border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Outros Exercícios</h3>
                <div className="space-y-4">
                  {exercises.map((exercise, index) => {
                    // Não mostrar o exercício atual
                    if (index === currentExerciseIndex) return null;
                    
                    return (
                      <div key={exercise.id} className="flex items-center justify-between py-3 border-b border-gray-700">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold mr-3">
                            {index + 1}
                          </div>
                          <span className="text-white">{exercise.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            setCurrentExerciseIndex(index);
                            setCurrentSetIndex(0);
                          }}
                          className="px-4 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-sm"
                        >
                          Ir para
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}