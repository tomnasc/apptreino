import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import YouTube from 'react-youtube';

export default function WorkoutMode() {
  const router = useRouter();
  const { id, session: sessionUrlParam } = router.query;
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [workoutList, setWorkoutList] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado do treino
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState({});
  const [repsCompleted, setRepsCompleted] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentSetStartTime, setCurrentSetStartTime] = useState(null);
  const [previousSetEndTime, setPreviousSetEndTime] = useState(null);
  
  const timerRef = useRef(null);

  useEffect(() => {
    if (id && user) {
      fetchWorkoutList();
      fetchExercises();
    }
  }, [id, user]);

  useEffect(() => {
    // Verificar se há um ID de sessão na URL para retomar treino
    if (sessionUrlParam && exercises.length > 0 && !isWorkoutActive) {
      resumeWorkout(sessionUrlParam);
    }
  }, [sessionUrlParam, exercises, isWorkoutActive]);

  useEffect(() => {
    // Limpar o timer quando o componente for desmontado
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerActive(false);
            handleSetCompleted();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeRemaining <= 0) {
      clearInterval(timerRef.current);
      setTimerActive(false);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive, timeRemaining]);

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
        router.push('/workout-lists');
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

  const startWorkout = async () => {
    if (exercises.length === 0) {
      setError('Esta lista de treinos não possui exercícios.');
      return;
    }

    try {
      // Criar uma nova sessão de treino
      const startTime = new Date();
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert([
          {
            user_id: user.id,
            workout_list_id: id,
            started_at: startTime.toISOString(),
            completed: false
          }
        ])
        .select();

      if (error) throw error;
      
      setSessionId(data[0].id);
      setWorkoutStartTime(startTime);
      setIsWorkoutActive(true);
      setCurrentExerciseIndex(0);
      setCurrentSetIndex(0);
      setCompletedSets({});
      setCurrentSetStartTime(new Date());
      setPreviousSetEndTime(null);
      
      // Se o exercício atual for baseado em tempo, iniciar o timer
      const currentExercise = exercises[0];
      if (currentExercise.time) {
        setTimeRemaining(currentExercise.time);
        setTimerActive(true);
      } else {
        setRepsCompleted(0);
      }
    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      setError('Ocorreu um erro ao iniciar o treino. Por favor, tente novamente.');
    }
  };

  const finishWorkout = async () => {
    if (!isWorkoutActive || !sessionId) return;

    try {
      const endTime = new Date();
      const durationInSeconds = Math.floor((endTime - workoutStartTime) / 1000);
      
      // Atualizar a sessão de treino
      const { error } = await supabase
        .from('workout_sessions')
        .update({
          completed: true,
          ended_at: endTime.toISOString(),
          duration: durationInSeconds
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      // Resetar o estado do treino
      setIsWorkoutActive(false);
      setCurrentExerciseIndex(0);
      setCurrentSetIndex(0);
      setCompletedSets({});
      setTimerActive(false);
      setTimeRemaining(0);
      setWorkoutStartTime(null);
      setSessionId(null);
      
      // Redirecionar para o dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao finalizar treino:', error);
      setError('Ocorreu um erro ao finalizar o treino. Por favor, tente novamente.');
    }
  };

  const handleSetCompleted = async () => {
    const endTime = new Date();
    const currentExercise = exercises[currentExerciseIndex];
    const exerciseKey = `${currentExerciseIndex}`;
    
    // Registrar os detalhes da série
    try {
      // Calcular tempos
      const executionTime = Math.round((endTime - currentSetStartTime) / 1000);
      const restTime = previousSetEndTime 
        ? Math.round((currentSetStartTime - previousSetEndTime) / 1000) 
        : 0;
        
      // Inserir detalhes da série no banco de dados
      const { error } = await supabase
        .from('workout_session_details')
        .insert([
          {
            session_id: sessionId,
            exercise_id: currentExercise.id,
            exercise_index: currentExerciseIndex,
            set_index: currentSetIndex,
            reps_completed: repsCompleted,
            weight_used: currentExercise.weight,
            execution_time: executionTime,
            rest_time: restTime,
            start_time: currentSetStartTime.toISOString(),
            end_time: endTime.toISOString()
          }
        ]);
        
      if (error) {
        console.error('Erro ao salvar detalhes da série:', error);
      }
    } catch (error) {
      console.error('Erro ao processar detalhes da série:', error);
      // Não interromper o fluxo do treino se ocorrer erro ao salvar detalhes
    }
    
    // Atualizar os sets completados
    const updatedCompletedSets = { ...completedSets };
    if (!updatedCompletedSets[exerciseKey]) {
      updatedCompletedSets[exerciseKey] = [];
    }
    updatedCompletedSets[exerciseKey].push(currentSetIndex);
    setCompletedSets(updatedCompletedSets);
    
    // Armazenar o tempo de término para calcular o tempo de descanso
    setPreviousSetEndTime(endTime);
    
    // Verificar se todas as séries do exercício atual foram completadas
    if (currentSetIndex + 1 >= currentExercise.sets) {
      // Passar para o próximo exercício
      if (currentExerciseIndex + 1 < exercises.length) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSetIndex(0);
        
        // Definir o momento de início da próxima série
        const newSetStartTime = new Date();
        setCurrentSetStartTime(newSetStartTime);
        
        // Se o próximo exercício for baseado em tempo, iniciar o timer
        const nextExercise = exercises[currentExerciseIndex + 1];
        if (nextExercise.time) {
          setTimeRemaining(nextExercise.time);
          setTimerActive(true);
        } else {
          setRepsCompleted(0);
        }
      } else {
        // Todos os exercícios foram completados
        finishWorkout();
      }
    } else {
      // Passar para a próxima série do mesmo exercício
      setCurrentSetIndex(currentSetIndex + 1);
      
      // Definir o momento de início da próxima série
      const newSetStartTime = new Date();
      setCurrentSetStartTime(newSetStartTime);
      
      // Se o exercício for baseado em tempo, reiniciar o timer
      if (currentExercise.time) {
        setTimeRemaining(currentExercise.time);
        setTimerActive(true);
      } else {
        setRepsCompleted(0);
      }
    }
  };

  const handleRepsChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setRepsCompleted(value);
  };

  const handleRepsCompleted = () => {
    const currentExercise = exercises[currentExerciseIndex];
    
    // Verificar se atingiu pelo menos 5 repetições
    if (repsCompleted >= 5) {
      handleSetCompleted();
    }
  };

  const toggleVideo = () => {
    setShowVideo(!showVideo);
  };

  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isSetCompleted = (exerciseIndex, setIndex) => {
    const exerciseKey = `${exerciseIndex}`;
    return completedSets[exerciseKey]?.includes(setIndex) || false;
  };

  const resumeWorkout = async (sessionToResumeId) => {
    try {
      // Buscar dados da sessão existente
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', sessionToResumeId)
        .single();
      
      if (sessionError) throw sessionError;
      
      if (!sessionData) {
        setError('Sessão de treino não encontrada.');
        return;
      }
      
      // Se a sessão já estiver concluída, não permite retomar
      if (sessionData.completed) {
        setError('Esta sessão de treino já foi concluída e não pode ser retomada.');
        return;
      }
      
      // Calcular tempo decorrido desde o início da sessão
      const startTime = new Date(sessionData.started_at);
      
      // Buscar dados de progresso da sessão (se você tiver uma tabela de progresso)
      // Aqui você pode adicionar código para recuperar o progresso exato do usuário
      // Por enquanto, vamos apenas iniciar a sessão com os dados básicos
      
      setSessionId(sessionToResumeId);
      setWorkoutStartTime(startTime);
      setIsWorkoutActive(true);
      setCurrentExerciseIndex(0); // Você pode ajustar isso se tiver dados de progresso
      setCurrentSetIndex(0);      // Você pode ajustar isso se tiver dados de progresso
      setCompletedSets({});       // Você pode ajustar isso se tiver dados de progresso
      
      // Configurar o exercício atual
      const currentExercise = exercises[0];
      if (currentExercise.time) {
        setTimeRemaining(currentExercise.time);
        setTimerActive(false); // Não inicia o timer automaticamente ao retomar
      } else {
        setRepsCompleted(0);
      }
      
      // Notificar o usuário
      alert('Treino retomado com sucesso!');
    } catch (error) {
      console.error('Erro ao retomar treino:', error);
      setError('Ocorreu um erro ao retomar o treino. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <Layout title="Carregando...">
        <div className="text-center py-10">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  const currentExercise = isWorkoutActive ? exercises[currentExerciseIndex] : null;
  const videoId = currentExercise ? getYoutubeVideoId(currentExercise.video_url) : null;

  return (
    <Layout title={`Treino: ${workoutList?.name || ''}`}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {isWorkoutActive ? 'Treino em Andamento' : 'Iniciar Treino'}
          </h1>
          <div className="flex space-x-2">
            {isWorkoutActive ? (
              <button
                onClick={finishWorkout}
                className="btn-danger"
              >
                Finalizar Treino
              </button>
            ) : (
              <>
                <Link
                  href="/workout-lists"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Voltar
                </Link>
                <button
                  onClick={startWorkout}
                  className="btn-secondary"
                  disabled={exercises.length === 0}
                >
                  Iniciar Treino
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
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
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!isWorkoutActive ? (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {workoutList?.name}
            </h2>
            {workoutList?.description && (
              <p className="text-gray-600 mb-6">{workoutList.description}</p>
            )}

            {exercises.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  Esta lista de treinos não possui exercícios.
                </p>
                <Link
                  href={`/workout-lists/${id}`}
                  className="btn-primary"
                >
                  Adicionar Exercícios
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-700 mb-4">
                  Esta lista contém {exercises.length} exercícios. Clique em "Iniciar Treino" para começar.
                </p>
                
                <div className="overflow-hidden bg-gray-50 border border-gray-200 rounded-lg">
                  <ul className="divide-y divide-gray-200">
                    {exercises.map((exercise, index) => (
                      <li key={exercise.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {index + 1}. {exercise.name}
                            </h3>
                            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              {exercise.weight && (
                                <div>
                                  <span className="font-medium text-gray-500">Carga:</span>{' '}
                                  <span>{exercise.weight} kg</span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-500">Séries:</span>{' '}
                                <span>{exercise.sets}</span>
                              </div>
                              {exercise.reps && (
                                <div>
                                  <span className="font-medium text-gray-500">Repetições:</span>{' '}
                                  <span>{exercise.reps}</span>
                                </div>
                              )}
                              {exercise.time && (
                                <div>
                                  <span className="font-medium text-gray-500">Tempo:</span>{' '}
                                  <span>{exercise.time} segundos</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {exercise.video_url && (
                            <a
                              href={exercise.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-1"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path
                                  fillRule="evenodd"
                                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Ver demonstração
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progresso do treino */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Progresso
                </h2>
                <span className="text-sm text-gray-500">
                  Exercício {currentExerciseIndex + 1} de {exercises.length}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{
                    width: `${((currentExerciseIndex + (currentSetIndex / currentExercise.sets)) / exercises.length) * 100}%`
                  }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Série atual:</span>{' '}
                  <span>{currentSetIndex + 1} de {currentExercise.sets}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Tempo de treino:</span>{' '}
                  <span>
                    {workoutStartTime
                      ? formatTime(Math.floor((new Date() - workoutStartTime) / 1000))
                      : '0:00'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Exercício atual */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Exercício Atual
              </h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {currentExercise.name}
                </h3>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                  {currentExercise.weight && (
                    <div>
                      <span className="font-medium text-gray-500">Carga:</span>{' '}
                      <span>{currentExercise.weight} kg</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-500">Séries:</span>{' '}
                    <span>{currentSetIndex + 1} de {currentExercise.sets}</span>
                  </div>
                  {currentExercise.reps && (
                    <div>
                      <span className="font-medium text-gray-500">Repetições:</span>{' '}
                      <span>{currentExercise.reps}</span>
                    </div>
                  )}
                  {currentExercise.time && (
                    <div>
                      <span className="font-medium text-gray-500">Tempo:</span>{' '}
                      <span>{currentExercise.time} segundos</span>
                    </div>
                  )}
                </div>
                
                {videoId && (
                  <div className="mb-4">
                    <button
                      onClick={toggleVideo}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {showVideo ? 'Ocultar vídeo' : 'Ver demonstração'}
                    </button>
                    
                    {showVideo && (
                      <div className="mt-2">
                        <YouTube
                          videoId={videoId}
                          opts={{
                            height: '240',
                            width: '100%',
                            playerVars: {
                              autoplay: 0,
                            },
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Séries */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {Array.from({ length: currentExercise.sets }).map((_, index) => (
                    <div
                      key={index}
                      className={`w-10 h-10 flex items-center justify-center rounded-full border ${
                        isSetCompleted(currentExerciseIndex, index)
                          ? 'bg-green-100 border-green-500 text-green-800'
                          : index === currentSetIndex
                          ? 'bg-blue-100 border-blue-500 text-blue-800'
                          : 'bg-gray-100 border-gray-300 text-gray-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
                
                {/* Controles */}
                {currentExercise.time ? (
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-4">
                      {formatTime(timeRemaining)}
                    </div>
                    {!timerActive && timeRemaining > 0 && (
                      <button
                        onClick={() => setTimerActive(true)}
                        className="btn-primary w-full mb-2"
                      >
                        Iniciar Timer
                      </button>
                    )}
                    {timerActive && (
                      <button
                        onClick={() => setTimerActive(false)}
                        className="btn-danger w-full mb-2"
                      >
                        Pausar
                      </button>
                    )}
                    <button
                      onClick={handleSetCompleted}
                      className="btn-secondary w-full"
                    >
                      Marcar como Concluído
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <label htmlFor="reps" className="block text-sm font-medium text-gray-700 mb-1">
                        Repetições realizadas
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="text-xl font-bold">{repsCompleted}</div>
                        <button
                          onClick={() => setRepsCompleted(prev => 
                            prev < currentExercise.reps ? prev + 1 : prev
                          )}
                          className="btn-primary px-3 py-2"
                          disabled={repsCompleted >= currentExercise.reps}
                        >
                          +1 Rep
                        </button>
                        <button
                          onClick={() => setRepsCompleted(0)}
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          Resetar
                        </button>
                        <div className="text-sm text-gray-500">
                          Meta: {currentExercise.reps} repetições
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleRepsCompleted}
                      className="btn-primary w-full"
                      disabled={repsCompleted < 5}
                    >
                      {repsCompleted < currentExercise.reps
                        ? repsCompleted >= 5 
                          ? `Concluir com ${repsCompleted}/${currentExercise.reps} repetições` 
                          : `Mínimo 5 repetições para concluir`
                        : 'Marcar Série como Concluída'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Próximos exercícios */}
            {currentExerciseIndex < exercises.length - 1 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Próximos Exercícios
                </h2>
                
                <ul className="divide-y divide-gray-200">
                  {exercises.slice(currentExerciseIndex + 1, currentExerciseIndex + 4).map((exercise, index) => (
                    <li key={exercise.id} className="py-3">
                      <div className="flex items-center">
                        <span className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
                          {currentExerciseIndex + index + 2}
                        </span>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {exercise.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {exercise.sets} séries
                            {exercise.reps ? ` × ${exercise.reps} repetições` : ''}
                            {exercise.time ? ` × ${exercise.time} segundos` : ''}
                            {exercise.weight ? ` • ${exercise.weight} kg` : ''}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
} 