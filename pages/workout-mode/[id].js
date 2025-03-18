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
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [showWeightIncreaseAlert, setShowWeightIncreaseAlert] = useState(false);
  const [showWeightDecreaseAlert, setShowWeightDecreaseAlert] = useState(false);
  const [setRepsHistory, setSetRepsHistory] = useState({}); // Armazenar histórico de repetições por série
  
  // Estado para cronômetros
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0);
  const wakeLockRef = useRef(null);
  
  // Referências para os intervalos e tempos absolutos
  const mainIntervalRef = useRef(null);
  const workoutStartRef = useRef(null);
  const exerciseTimerEndRef = useRef(null);
  const restTimerEndRef = useRef(null);

  // Função para salvar estado dos timers no localStorage
  const saveTimersState = () => {
    if (typeof window !== 'undefined') {
      try {
        const now = Date.now();
        
        // Calcular os tempos absolutos de término para cada timer
        let exerciseEndTime = null;
        if (timerActive && timeRemaining > 0) {
          exerciseEndTime = now + (timeRemaining * 1000);
          exerciseTimerEndRef.current = exerciseEndTime;
        }
        
        let restEndTime = null;
        if (restTimerActive && restTimeRemaining > 0) {
          restEndTime = now + (restTimeRemaining * 1000);
          restTimerEndRef.current = restEndTime;
        }
        
        const timerState = {
          workoutStartTime: workoutStartTime ? workoutStartTime.getTime() : null,
          exerciseEndTime: exerciseEndTime,
          restEndTime: restEndTime,
          lastUpdate: now,
          isWorkoutActive,
          currentExerciseIndex,
          currentSetIndex,
          timerActive,
          restTimerActive,
          sessionId,
          workoutId: id
        };
        
        localStorage.setItem('appTreino_timerState', JSON.stringify(timerState));
        console.log('Estado dos timers salvo no localStorage');
      } catch (error) {
        console.error('Erro ao salvar o estado dos timers:', error);
      }
    }
  };

  // Função para carregar estado dos timers do localStorage
  const loadTimersState = () => {
    if (typeof window !== 'undefined') {
      try {
        const timerStateJson = localStorage.getItem('appTreino_timerState');
        if (!timerStateJson) return;
        
        const timerState = JSON.parse(timerStateJson);
        const now = Date.now();
        
        // Verificar se o timer está ativo e se pertence à sessão atual
        if (timerState.isWorkoutActive && 
            timerState.sessionId === sessionId && 
            timerState.workoutId === id) {
          
          // Restaurar dados do treino se necessário
          if (timerState.currentExerciseIndex !== currentExerciseIndex) {
            setCurrentExerciseIndex(timerState.currentExerciseIndex);
          }
          
          if (timerState.currentSetIndex !== currentSetIndex) {
            setCurrentSetIndex(timerState.currentSetIndex);
          }
          
          // Restaurar tempos de treino
          if (timerState.workoutStartTime) {
            const startTime = new Date(timerState.workoutStartTime);
            if (!workoutStartTime || workoutStartTime.getTime() !== startTime.getTime()) {
              setWorkoutStartTime(startTime);
            }
            setTotalWorkoutTime(Math.floor((now - timerState.workoutStartTime) / 1000));
          }
          
          // Restaurar timer de exercício
          if (timerState.exerciseEndTime) {
            const remaining = Math.max(0, Math.ceil((timerState.exerciseEndTime - now) / 1000));
            if (remaining > 0) {
              setTimeRemaining(remaining);
              setTimerActive(true);
            } else if (timerState.timerActive) {
              // O timer acabou enquanto estava em segundo plano
              handleSetCompleted();
            }
          }
          
          // Restaurar timer de descanso
          if (timerState.restEndTime) {
            const remaining = Math.max(0, Math.ceil((timerState.restEndTime - now) / 1000));
            if (remaining > 0) {
              setRestTimeRemaining(remaining);
              setRestTimerActive(true);
            } else if (timerState.restTimerActive) {
              // O tempo de descanso acabou enquanto estava em segundo plano
              setRestTimerActive(false);
              setRestTimeRemaining(0);
            }
          }
          
          console.log('Estado dos timers carregado do localStorage', {
            workoutTime: Math.floor((now - timerState.workoutStartTime) / 1000),
            exerciseRemaining: timerState.exerciseEndTime ? Math.max(0, Math.ceil((timerState.exerciseEndTime - now) / 1000)) : null,
            restRemaining: timerState.restEndTime ? Math.max(0, Math.ceil((timerState.restEndTime - now) / 1000)) : null
          });
        }
      } catch (e) {
        console.error('Erro ao carregar estado dos timers:', e);
        localStorage.removeItem('appTreino_timerState');
      }
    }
  };

  // Sincronizar sempre que o app voltar ao foco
  useEffect(() => {
    // Função para verificar e sincronizar estado quando o app voltar ao foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isWorkoutActive) {
        // Quando a página fica visível novamente, verificar o estado
        console.log('App voltou ao foco, sincronizando timers');
        loadTimersState();
      } else if (document.visibilityState === 'hidden' && isWorkoutActive) {
        // Quando a página fica oculta, salvar o estado atual
        console.log('App em segundo plano, salvando estado dos timers');
        saveTimersState();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', loadTimersState);
    window.addEventListener('beforeunload', saveTimersState);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', loadTimersState);
      window.removeEventListener('beforeunload', saveTimersState);
    };
  }, [isWorkoutActive, workoutStartTime, timerActive, restTimerActive]);

  // Efeito para inicializar o intervalo principal
  useEffect(() => {
    if (isWorkoutActive) {
      // Limpar qualquer intervalo existente
      if (mainIntervalRef.current) {
        clearInterval(mainIntervalRef.current);
      }
      
      // Criar novo intervalo para atualizar todos os timers a cada 100ms
      mainIntervalRef.current = setInterval(() => {
        const now = Date.now();
        
        // Atualizar tempo total de treino
        if (workoutStartTime) {
          const elapsed = Math.floor((now - workoutStartTime.getTime()) / 1000);
          setTotalWorkoutTime(elapsed);
        }
        
        // Atualizar tempo de exercício
        if (timerActive && timeRemaining > 0) {
          setTimeRemaining(prev => {
            const newTime = prev - 0.1;
            if (newTime <= 0) {
              handleSetCompleted();
              return 0;
            }
            return Math.max(0, parseFloat(newTime.toFixed(1)));
          });
        }
        
        // Atualizar tempo de descanso
        if (restTimerActive && restTimeRemaining > 0) {
          setRestTimeRemaining(prev => {
            const newTime = prev - 0.1;
            if (newTime <= 0) {
              setRestTimerActive(false);
              return 0;
            }
            return Math.max(0, parseFloat(newTime.toFixed(1)));
          });
        }
        
        // Salvar o estado atual no localStorage
        saveTimersState();
      }, 100);
      
      return () => {
        if (mainIntervalRef.current) {
          clearInterval(mainIntervalRef.current);
          mainIntervalRef.current = null;
        }
      };
    } else {
      // Limpar o intervalo quando o treino não estiver ativo
      if (mainIntervalRef.current) {
        clearInterval(mainIntervalRef.current);
        mainIntervalRef.current = null;
      }
      
      // Limpar o estado do timer no localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('appTreino_timerState');
      }
    }
  }, [isWorkoutActive, timerActive, restTimerActive, timeRemaining, restTimeRemaining, workoutStartTime]);

  // Remover registro do service worker que está causando problemas
  useEffect(() => {
    const unregisterServiceWorkers = async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          registration.unregister();
          console.log('Service worker desregistrado');
        }
      }
    };
    
    // Desregistrar service workers existentes
    unregisterServiceWorkers();
  }, []);

  // Carregar estado dos timers quando a sessão é carregada
  useEffect(() => {
    if (sessionId) {
      loadTimersState();
    }
  }, [sessionId]);

  // Função para adquirir o WakeLock
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        // Solicitar o WakeLock para manter a tela ativa
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('WakeLock ativado para manter a tela ligada');
        
        // Adicionar um listener para reativar o WakeLock se o usuário retornar ao aplicativo
        wakeLockRef.current.addEventListener('release', () => {
          console.log('WakeLock foi liberado');
          // Tentar reativar o WakeLock se o treino ainda estiver ativo
          if (isWorkoutActive) {
            requestWakeLock();
          }
        });
      } else {
        console.log('WakeLock API não é suportada neste navegador');
      }
    } catch (err) {
      console.error('Erro ao ativar o WakeLock:', err);
    }
  };

  // Função para liberar o WakeLock
  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => {
          wakeLockRef.current = null;
          console.log('WakeLock liberado com sucesso');
        })
        .catch((err) => {
          console.error('Erro ao liberar o WakeLock:', err);
        });
    }
  };

  // Ativar/desativar o WakeLock quando o treino iniciar/terminar
  useEffect(() => {
    if (isWorkoutActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    
    // Adicionar um listener para o evento visibilitychange
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isWorkoutActive) {
        // Reativar o WakeLock quando o documento se torna visível novamente
        requestWakeLock();
        
        // Recarregar o estado dos timers
        loadTimersState();
      } else if (document.visibilityState === 'hidden' && isWorkoutActive) {
        // Salvar o estado dos timers quando a página ficar oculta
        saveTimersState();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Adicionar listener para event beforeunload para salvar estado antes de fechar
    const handleBeforeUnload = () => {
      if (isWorkoutActive) {
        saveTimersState();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      releaseWakeLock();
    };
  }, [isWorkoutActive, timerActive, restTimerActive, timeRemaining, restTimeRemaining, workoutStartTime]);

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
    try {
      // Inicializar o estado do treino
      setIsWorkoutActive(true);
      setCurrentExerciseIndex(0);
      setCurrentSetIndex(0);
      setCompletedSets({});
      setSetRepsHistory({});
      
      // Ativar o WakeLock para manter a tela ligada
      await requestWakeLock();
      
      // Iniciar o tempo de treino
      const startTime = new Date();
      setWorkoutStartTime(startTime);
      setCurrentSetStartTime(startTime); // Definir o momento de início da primeira série
      
      // Configurar a referência para o tempo absoluto de início
      workoutStartRef.current = startTime.getTime();
      
      // Iniciar o cronômetro de tempo total
      setTotalWorkoutTime(0);
      
      // Se o primeiro exercício for baseado em tempo, configurar o timer
      if (exercises.length > 0 && exercises[0].time) {
        setTimeRemaining(exercises[0].time);
      }
      
      try {
        // Criar uma nova sessão de treino
        const { data, error } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            workout_list_id: id,
            started_at: startTime.toISOString()
          })
          .select('id')
          .single();

        if (error) {
          setError(`Erro ao iniciar treino: ${error.message}`);
          console.error('Erro ao iniciar treino:', error);
          // Reverter o estado se falhar
          setIsWorkoutActive(false);
          return;
        }
        
        setSessionId(data.id);
        
        // Atualizar a URL com o ID da sessão para possibilitar a retomada
        router.replace(`/workout-mode/${id}?session=${data.id}`, undefined, { 
          shallow: true 
        });
        
        // Salvar o estado inicial do timer
        setTimeout(() => {
          saveTimersState();
        }, 100);
      } catch (dbError) {
        console.error('Erro ao criar sessão de treino:', dbError);
        setError('Ocorreu um erro ao criar a sessão de treino. Tente novamente.');
        // Reverter o estado se falhar
        setIsWorkoutActive(false);
      }
    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      setError('Ocorreu um erro ao iniciar o treino. Tente novamente.');
      // Reverter o estado se falhar
      setIsWorkoutActive(false);
    }
  };

  const finishWorkout = async () => {
    if (!isWorkoutActive || !sessionId) return;

    try {
      const endTime = new Date();
      const durationInSeconds = Math.floor((endTime - workoutStartTime) / 1000);
      
      // Liberar o WakeLock ao finalizar o treino
      releaseWakeLock();
      
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
      setRestTimerActive(false);
      setRestTimeRemaining(0);
      setWorkoutStartTime(null);
      setSessionId(null);
      setRepsCompleted(0);
      setSetRepsHistory({});
      
      // Redirecionar para o dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao finalizar treino:', error);
      setError('Ocorreu um erro ao finalizar o treino. Por favor, tente novamente.');
    }
  };

  const handleSetCompleted = async () => {
    const currentExercise = exercises[currentExerciseIndex];
    const exerciseKey = `${currentExerciseIndex}`;
    let endTime = new Date();
    
    // Atualizar o histórico de repetições para o exercício atual
    const updatedSetRepsHistory = { ...setRepsHistory };
    if (!updatedSetRepsHistory[exerciseKey]) {
      updatedSetRepsHistory[exerciseKey] = [];
    }
    updatedSetRepsHistory[exerciseKey][currentSetIndex] = repsCompleted;
    setSetRepsHistory(updatedSetRepsHistory);
    
    // Verificar se deve mostrar o alerta de aumentar carga
    // Somente se:
    // 1. Estamos na última série do exercício
    // 2. O usuário atingiu o número alvo de repetições em TODAS as séries deste exercício
    if (
      currentExercise.reps && 
      currentSetIndex === currentExercise.sets - 1
    ) {
      // Verificar se todas as séries atingiram o número alvo de repetições
      const allSeriesCompleted = updatedSetRepsHistory[exerciseKey].length === currentExercise.sets;
      const allSeriesReachedTarget = allSeriesCompleted && 
        updatedSetRepsHistory[exerciseKey].every(reps => reps >= currentExercise.reps);
      
      if (allSeriesReachedTarget) {
        setShowWeightIncreaseAlert(true);
      }
    }
    
    // Registrar os detalhes da série
    try {
      // Garantir que temos valores válidos para tempos de início e fim
      const now = new Date();
      const validStartTime = currentSetStartTime || now;
      const validEndTime = endTime || now;
      
      // Calcular tempos
      const executionTime = Math.round((validEndTime - validStartTime) / 1000);
      const restTime = previousSetEndTime 
        ? Math.round((validStartTime - previousSetEndTime) / 1000) 
        : 0;
        
      // Verificar se já existe um registro para esta combinação de chaves
      const { data: existingData, error: checkError } = await supabase
        .from('workout_session_details')
        .select('*')
        .eq('session_id', sessionId)
        .eq('exercise_id', currentExercise.id)
        .eq('set_index', currentSetIndex);
        
      if (checkError) {
        console.error('Erro ao verificar detalhes da série existentes:', checkError);
      }
      
      let error;
      
      if (existingData && existingData.length > 0) {
        // O registro já existe, vamos atualizá-lo
        const { error: updateError } = await supabase
          .from('workout_session_details')
          .update({
            reps_completed: repsCompleted,
            weight_used: currentExercise.weight,
            execution_time: executionTime > 0 ? executionTime : 1,
            rest_time: restTime >= 0 ? restTime : 0,
            start_time: validStartTime.toISOString(),
            end_time: validEndTime.toISOString()
          })
          .eq('session_id', sessionId)
          .eq('exercise_id', currentExercise.id)
          .eq('set_index', currentSetIndex);
          
        error = updateError;
      } else {
        // O registro não existe, vamos inserir um novo
        const { error: insertError } = await supabase
          .from('workout_session_details')
          .insert([{
            session_id: sessionId,
            exercise_id: currentExercise.id,
            exercise_index: currentExerciseIndex,
            set_index: currentSetIndex,
            reps_completed: repsCompleted,
            weight_used: currentExercise.weight,
            execution_time: executionTime > 0 ? executionTime : 1,
            rest_time: restTime >= 0 ? restTime : 0,
            start_time: validStartTime.toISOString(),
            end_time: validEndTime.toISOString()
          }]);
          
        error = insertError;
      }
        
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
        
        // Se o próximo exercício for baseado em tempo, configurar o timer
        const nextExercise = exercises[currentExerciseIndex + 1];
        if (nextExercise.time) {
          setTimeRemaining(nextExercise.time);
          setTimerActive(false); // Não inicia automaticamente, espera o usuário clicar
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
      
      // Iniciar temporizador de descanso se estiver configurado
      if (currentExercise.rest_time) {
        setRestTimeRemaining(currentExercise.rest_time);
        setRestTimerActive(true);
      }
      
      // Definir o momento de início da próxima série
      const newSetStartTime = new Date();
      setCurrentSetStartTime(newSetStartTime);
      
      // Se o exercício for baseado em tempo, configurar o timer
      if (currentExercise.time) {
        setTimeRemaining(currentExercise.time);
        setTimerActive(false); // Não inicia automaticamente, espera o usuário clicar
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
    
    // Verificar se deve mostrar o alerta para diminuir carga
    if (repsCompleted < 6) {
      setShowWeightDecreaseAlert(true);
      // Resetar a série em vez de concluir quando não atingir o mínimo de repetições
      setRepsCompleted(0);
      return;
    }
    
    // Sempre permitir concluir se o número mínimo de repetições for atingido
    handleSetCompleted();
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
    // Garantir que seconds seja um número inteiro
    const secondsInt = Math.floor(seconds);
    const mins = Math.floor(secondsInt / 60);
    const secs = secondsInt % 60;
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
      setSetRepsHistory({});      // Resetar o histórico de repetições
      
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
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg shadow-lg p-4 text-white">
          <h1 className="text-2xl font-bold">
            {isWorkoutActive ? 'Treino em Andamento' : 'Iniciar Treino'}
          </h1>
          <div className="flex space-x-2">
            {isWorkoutActive ? (
              <button
                onClick={finishWorkout}
                className="bg-white text-red-500 hover:bg-red-50 font-bold py-2 px-4 rounded-full shadow transition-all transform hover:scale-105"
              >
                Finalizar Treino
              </button>
            ) : (
              <>
                <Link
                  href="/workout-lists"
                  className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 font-medium py-2 px-4 rounded-full shadow transition-all"
                >
                  Voltar
                </Link>
                <button
                  onClick={startWorkout}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full shadow transition-all transform hover:scale-105"
                  disabled={exercises.length === 0}
                >
                  Iniciar Treino
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
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
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {workoutList?.name}
              </h2>
              {workoutList?.description && (
                <p className="text-gray-600">{workoutList.description}</p>
              )}
            </div>

            {exercises.length === 0 ? (
              <div className="text-center py-12 px-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-gray-500 mb-6">
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
              <div className="p-6">
                <p className="text-gray-700 mb-6 text-center font-medium">
                  Esta lista contém <span className="text-blue-600 font-bold">{exercises.length}</span> exercícios. Clique em "Iniciar Treino" para começar.
                </p>
                
                <div className="space-y-4">
                  {exercises.map((exercise, index) => (
                    <div 
                      key={exercise.id} 
                      className="bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center p-4">
                        <div className="flex items-center mb-3 md:mb-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">
                            {index + 1}
                          </div>
                          <h3 className="text-lg font-bold text-gray-800">
                            {exercise.name}
                          </h3>
                        </div>
                        
                        <div className="ml-0 md:ml-11 grid grid-cols-2 gap-x-6 gap-y-1 text-sm flex-grow">
                          {exercise.weight && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                              </svg>
                              <span className="font-medium text-gray-500">Carga:</span>{' '}
                              <span className="ml-1 font-bold text-gray-700">{exercise.weight} kg</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 mr-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                            <span className="font-medium text-gray-500">Séries:</span>{' '}
                            <span className="ml-1 font-bold text-gray-700">{exercise.sets}</span>
                          </div>
                          {exercise.reps && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                              </svg>
                              <span className="font-medium text-gray-500">Repetições:</span>{' '}
                              <span className="ml-1 font-bold text-gray-700">{exercise.reps}</span>
                            </div>
                          )}
                          {exercise.time && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                              <span className="font-medium text-gray-500">Tempo:</span>{' '}
                              <span className="ml-1 font-bold text-gray-700">{exercise.time} segundos</span>
                            </div>
                          )}
                        </div>
                        
                        {exercise.video_url && (
                          <a
                            href={exercise.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 md:mt-0 inline-flex items-center justify-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-sm font-medium transition-colors ml-auto"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-1"
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progresso do treino */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-4 flex justify-between items-center text-white">
                <h2 className="text-xl font-bold">
                  Progresso
                </h2>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                  Exercício {currentExerciseIndex + 1} de {exercises.length}
                </div>
              </div>
              
              <div className="p-5">
                <div className="w-full bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300 ease-in-out"
                    style={{
                      width: `${((currentExerciseIndex + (currentSetIndex / currentExercise.sets)) / exercises.length) * 100}%`
                    }}
                  ></div>
                </div>
                
                <div className="flex flex-wrap justify-between gap-4 text-sm">
                  <div className="flex items-center bg-blue-50 rounded-lg px-4 py-3 flex-grow">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                    </svg>
                    <span className="font-medium text-gray-600">Série atual:</span>{' '}
                    <span className="ml-2 font-bold text-blue-700">{currentSetIndex + 1} de {currentExercise.sets}</span>
                  </div>
                  <div className="flex items-center bg-blue-50 rounded-lg px-4 py-3 flex-grow">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="font-medium text-gray-600">Tempo de treino:</span>{' '}
                    <span className="ml-2 font-bold text-blue-700">
                      {formatTime(totalWorkoutTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Exercício atual */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-400 p-4 text-white">
                <h2 className="text-xl font-bold">
                  Exercício Atual
                </h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold mr-3">
                    {currentExerciseIndex + 1}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {currentExercise.name}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {currentExercise.weight && (
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 mb-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                      </svg>
                      <span className="font-medium text-gray-500 text-xs">Carga</span>
                      <span className="font-bold text-gray-800 text-lg">{currentExercise.weight} kg</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 mb-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                    <span className="font-medium text-gray-500 text-xs">Séries</span>
                    <span className="font-bold text-gray-800 text-lg">{currentSetIndex + 1} / {currentExercise.sets}</span>
                  </div>
                  {currentExercise.reps && (
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 mb-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                      <span className="font-medium text-gray-500 text-xs">Repetições</span>
                      <span className="font-bold text-gray-800 text-lg">{repsCompleted} / {currentExercise.reps}</span>
                    </div>
                  )}
                  {currentExercise.time && timerActive && (
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 mb-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="font-medium text-gray-500 text-xs">Tempo Restante</span>
                      <span className="font-bold text-gray-800 text-lg">{formatTime(timeRemaining)}</span>
                    </div>
                  )}
                </div>
                
                {currentExercise.reps && !timerActive && (
                  <div className="mb-6">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
                      <div className="flex items-center justify-center p-2 bg-blue-50 rounded-lg text-center w-full md:w-auto">
                        <div className="font-medium text-gray-600 mr-2">Repetições realizadas:</div>
                        <div className="flex items-center">
                          <button 
                            onClick={() => setRepsCompleted(Math.max(0, repsCompleted - 1))}
                            className="bg-white w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center mr-2 text-gray-500 hover:bg-gray-100"
                            disabled={repsCompleted <= 0}
                          >
                            -
                          </button>
                          <span className="font-bold text-blue-700 text-xl px-3">{repsCompleted}</span>
                          <button 
                            onClick={() => setRepsCompleted(Math.min(currentExercise.reps, repsCompleted + 1))}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ml-2 text-white ${repsCompleted >= currentExercise.reps ? 'bg-green-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                            disabled={repsCompleted >= currentExercise.reps}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <button 
                        onClick={handleRepsCompleted}
                        className={`px-6 py-3 rounded-full font-bold shadow transition-all w-full md:w-auto
                          ${repsCompleted >= currentExercise.reps 
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                      >
                        Concluir
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => setRepsCompleted(0)}
                      className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Resetar contador
                    </button>
                  </div>
                )}
                
                {currentExercise.time && (
                  <div className="mb-6 flex flex-col items-center">
                    <div className="w-48 h-48 rounded-full bg-blue-50 border-8 border-blue-100 flex flex-col items-center justify-center mb-4">
                      <span className="text-4xl font-bold text-blue-700">{timeRemaining}</span>
                      <span className="text-gray-500">segundos</span>
                    </div>
                    
                    {!timerActive ? (
                      <button 
                        onClick={() => {
                          console.log('Iniciando cronômetro de exercício');
                          setTimerActive(true);
                        }}
                        className="px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold shadow transition-all"
                      >
                        Iniciar Cronômetro
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          console.log('Parando cronômetro de exercício');
                          setTimerActive(false);
                        }}
                        className="px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold shadow transition-all"
                      >
                        Parar Cronômetro
                      </button>
                    )}
                  </div>
                )}

                {/* Timer de descanso entre séries */}
                {restTimerActive && (
                  <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-500 mr-2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span className="font-medium text-indigo-700">Descanso:</span>
                      </div>
                      <div className="text-xl font-bold text-indigo-700">{formatTime(restTimeRemaining)}</div>
                    </div>
                    <div className="w-full bg-indigo-100 rounded-full h-2 mt-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{
                          width: `${(restTimeRemaining / currentExercise.rest_time) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Alerta para aumentar carga */}
                {showWeightIncreaseAlert && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Parabéns! Você completou todas as repetições.
                        </h3>
                        <div className="mt-1 text-sm text-green-700">
                          Considere aumentar a carga no próximo treino para continuar progredindo.
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setShowWeightIncreaseAlert(false)}
                            className="inline-flex items-center px-3 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded-full text-green-700 bg-white hover:bg-green-50"
                          >
                            Entendi
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Alerta para diminuir carga */}
                {showWeightDecreaseAlert && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Você precisa completar no mínimo 6 repetições.
                        </h3>
                        <div className="mt-1 text-sm text-yellow-700">
                          Considere diminuir a carga para conseguir executar pelo menos 6 repetições com boa forma.
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setShowWeightDecreaseAlert(false)}
                            className="inline-flex items-center px-3 py-1.5 border border-yellow-300 shadow-sm text-xs font-medium rounded-full text-yellow-700 bg-white hover:bg-yellow-50"
                          >
                            Entendi
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {videoId && (
                  <div className="mt-6 border-t border-gray-100 pt-6">
                    <button
                      onClick={toggleVideo}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center mb-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {showVideo ? 'Ocultar vídeo' : 'Ver demonstração do exercício'}
                    </button>
                    
                    {showVideo && (
                      <div className="mt-2 rounded-lg overflow-hidden shadow-lg">
                        <YouTube
                          videoId={videoId}
                          opts={{
                            width: '100%',
                            playerVars: {
                              autoplay: 0,
                            },
                          }}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Próximos Exercícios */}
            {currentExerciseIndex < exercises.length - 1 && (
              <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-gray-700 to-gray-600 p-4 text-white">
                  <h2 className="text-xl font-bold">
                    Próximos Exercícios
                  </h2>
                </div>
                
                <div className="p-4">
                  <div className="space-y-3">
                    {exercises.slice(currentExerciseIndex + 1, currentExerciseIndex + 3).map((exercise, index) => (
                      <div key={exercise.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold mr-3">
                          {currentExerciseIndex + index + 2}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">{exercise.name}</h3>
                          <p className="text-sm text-gray-500">
                            {exercise.sets} séries{exercise.reps ? `, ${exercise.reps} repetições` : ''}
                            {exercise.time ? `, ${exercise.time} segundos` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {exercises.length > currentExerciseIndex + 3 && (
                      <div className="text-center text-sm text-gray-500 pt-2">
                        +{exercises.length - (currentExerciseIndex + 3)} exercícios restantes
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
} 