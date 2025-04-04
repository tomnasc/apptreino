import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import YouTube from 'react-youtube';
import Head from 'next/head';

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
  const [setRepsHistory, setSetRepsHistory] = useState({});
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Estado para cronômetros
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0);
  
  // Referências para os intervalos e tempos absolutos
  const mainIntervalRef = useRef(null);
  const workoutStartRef = useRef(null);
  const exerciseTimerEndRef = useRef(null);
  const restTimerEndRef = useRef(null);
  const lastUpdatedTimeRef = useRef(null);
  const backgroundTimeRef = useRef(null);

  // Adicionar timerRef para controlar o timer
  const timerRef = useRef(null);
  // Referência para o timer de exercício
  const exerciseTimerRef = useRef(null);

  // Detectar se é um dispositivo iOS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Verificar se estamos em um dispositivo iOS
      const ua = window.navigator.userAgent;
      const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
      setIsIOS(iOS);
      console.log('Dispositivo iOS detectado:', iOS);
      
      // Inicializar timer quando o componente é montado
      if (iOS) {
        document.addEventListener('click', initializeAudioForIOS);
      }
    }
    
    return () => {
      if (isIOS && typeof window !== 'undefined') {
        document.removeEventListener('click', initializeAudioForIOS);
      }
    };
  }, []);
  
  // Função para inicializar comportamento de áudio no iOS (permite que os timers funcionem)
  const initializeAudioForIOS = () => {
    try {
      // Cria um contexto de áudio para "desbloquear" timers no iOS
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const silentBuffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      
      // Cria um oscilador silencioso para manter o contexto de áudio ativo
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Volume zero (silencioso)
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      
      console.log('Contexto de áudio inicializado para iOS');
      document.removeEventListener('click', initializeAudioForIOS);
      
      // Salva referências ao contexto de áudio para evitar coleta de lixo
      window.audioContext = audioContext;
      window.oscillator = oscillator;
      window.gainNode = gainNode;
    } catch (e) {
      console.error('Erro ao inicializar áudio para iOS:', e);
    }
  };

  // Função para salvar estado dos timers no localStorage
  const saveTimersState = () => {
    if (typeof window !== 'undefined') {
      try {
        const now = Date.now();
        lastUpdatedTimeRef.current = now;
        
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
          workoutId: id,
          backgroundTime: backgroundTimeRef.current
        };
        
        // Salvar estado para persistência (caso o usuário saia e volte)
        localStorage.setItem('treinoPro_timerState', JSON.stringify(timerState));
        console.log('Estado dos timers salvo no localStorage');
      } catch (error) {
        console.error('Erro ao salvar o estado dos timers:', error);
      }
    }
  };

  // Função para carregar estado dos timers do localStorage
  const loadTimersState = () => {
    if (typeof window !== 'undefined' && id) {
      try {
        const savedState = localStorage.getItem('treinoPro_timerState');
        if (savedState) {
          const state = JSON.parse(savedState);
          const now = Date.now();
          
          // Verificar se o estado é válido e corresponde à sessão atual
          if (state && state.workoutId === id && state.isWorkoutActive) {
            console.log('Carregando estado dos timers do localStorage');
            
            // Restaurar estado do treino
            setIsWorkoutActive(true);
            setSessionId(state.sessionId);
            
            // Restaurar índices
            if (state.currentExerciseIndex !== undefined) {
              setCurrentExerciseIndex(state.currentExerciseIndex);
            }
            if (state.currentSetIndex !== undefined) {
              setCurrentSetIndex(state.currentSetIndex);
            }
            
            // Restaurar tempo de treino total
            if (state.workoutStartTime) {
              const elapsed = Math.floor((now - state.workoutStartTime) / 1000);
              setTotalWorkoutTime(elapsed);
              setWorkoutStartTime(new Date(state.workoutStartTime));
              workoutStartRef.current = state.workoutStartTime;
            }
            
            // Restaurar timers
            if (state.exerciseEndTime && state.timerActive) {
              const remaining = Math.max(0, (state.exerciseEndTime - now) / 1000);
              if (remaining > 0) {
                setTimeRemaining(remaining);
                setTimerActive(true);
                exerciseTimerEndRef.current = state.exerciseEndTime;
              } else {
                setTimeRemaining(0);
                setTimerActive(false);
              }
            }
            
            if (state.restEndTime && state.restTimerActive) {
              const remaining = Math.max(0, (state.restEndTime - now) / 1000);
              if (remaining > 0) {
                setRestTimeRemaining(remaining);
                setRestTimerActive(true);
                restTimerEndRef.current = state.restEndTime;
              } else {
                setRestTimeRemaining(0);
                setRestTimerActive(false);
                restTimerEndRef.current = null;
              }
            }
          } else {
            // Se o estado não corresponder, limpar
            localStorage.removeItem('treinoPro_timerState');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar o estado dos timers:', error);
        localStorage.removeItem('treinoPro_timerState');
      }
    }
  };

  // Temporizador absoluto para iOS - usado para verificar o tempo quando o app volta ao foco
  useEffect(() => {
    // Configurar o timer principal que atualiza ambos os cronômetros
    if (isWorkoutActive) {
      mainIntervalRef.current = setInterval(() => {
        // Atualizar tempo total de treino
        if (workoutStartRef.current) {
          const elapsedTime = Math.floor((Date.now() - workoutStartRef.current) / 1000);
          setTotalWorkoutTime(elapsedTime);
        }
        
        // Atualizar o timer do exercício
        if (timerActive && timeRemaining > 0) {
          setTimeRemaining(prevTime => {
            const newTime = Math.max(0, prevTime - 0.1);
            
            // Quando o timer chegar a zero
            if (prevTime > 0 && newTime <= 0) {
              // Parar o timer
              setTimerActive(false);
              
              // Atualizar estado como série completada
              handleSetCompleted();
              
              // Enviar notificação
              if (Notification.permission === 'granted') {
                new Notification('Série completa!', {
                  body: 'Tempo concluído para este exercício!',
                  icon: '/favicon.ico'
                });
              }
            }
            
            return newTime;
          });
        }
        
        // Atualizar o timer de descanso
        if (restTimerActive && restTimeRemaining > 0) {
          setRestTimeRemaining(prevTime => {
            const newTime = Math.max(0, prevTime - 0.1);
            
            // Quando o timer de descanso chegar a zero
            if (prevTime > 0 && newTime <= 0) {
              // Parar o timer de descanso
              setRestTimerActive(false);
              
              // Enviar notificação
              sendRestFinishedNotification();
            }
            
            return newTime;
          });
        }
      }, 100);
    }
    
    return () => {
      if (mainIntervalRef.current) {
        clearInterval(mainIntervalRef.current);
      }
    };
  }, [isWorkoutActive, timerActive, restTimerActive]);

  // Garantir que o efeito de unregisterServiceWorkers remova todos os service workers
  useEffect(() => {
    const unregisterServiceWorkers = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('Service worker desregistrado:', registration.scope);
          }
          console.log('Todos os service workers foram desregistrados');
        } catch (error) {
          console.error('Erro ao desregistrar service workers:', error);
        }
      }
    };
    
    // Desregistrar service workers existentes imediatamente
    unregisterServiceWorkers();
  }, []);

  // Carregar estado dos timers quando a sessão é carregada
  useEffect(() => {
    if (sessionId) {
      loadTimersState();
    }
  }, [sessionId]);

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

  // Adicionar efeito para carregar estado do treino do localStorage
  useEffect(() => {
    // Verificar se há um treino ativo
    if (typeof window !== 'undefined' && id) {
      try {
        const storedWorkoutActive = localStorage.getItem(`treinoPro_isWorkoutActive_${id}`);
        if (storedWorkoutActive === 'true') {
          // Carregar estado do treino do localStorage
          const storedExerciseIndex = localStorage.getItem(`treinoPro_currentExerciseIndex_${id}`);
          const storedSetIndex = localStorage.getItem(`treinoPro_currentSetIndex_${id}`);
          const storedCompletedSets = localStorage.getItem(`treinoPro_completedSets_${id}`);
          const storedRepsHistory = localStorage.getItem(`treinoPro_setRepsHistory_${id}`);
          const storedSessionId = localStorage.getItem(`treinoPro_sessionId_${id}`);
          const storedStartTime = localStorage.getItem(`treinoPro_workoutStartTime_${id}`);
          
          if (storedExerciseIndex) setCurrentExerciseIndex(parseInt(storedExerciseIndex) || 0);
          if (storedSetIndex) setCurrentSetIndex(parseInt(storedSetIndex) || 0);
          if (storedCompletedSets) {
            try {
              const parsedSets = JSON.parse(storedCompletedSets);
              if (parsedSets && typeof parsedSets === 'object') {
                setCompletedSets(parsedSets);
              } else {
                setCompletedSets({});
              }
            } catch (e) {
              console.error('Erro ao fazer parse de completedSets:', e);
              setCompletedSets({});
            }
          }
          if (storedRepsHistory) {
            try {
              const parsedHistory = JSON.parse(storedRepsHistory);
              if (parsedHistory && typeof parsedHistory === 'object') {
                setSetRepsHistory(parsedHistory);
              } else {
                setSetRepsHistory({});
              }
            } catch (e) {
              console.error('Erro ao fazer parse de setRepsHistory:', e);
              setSetRepsHistory({});
            }
          }
          if (storedSessionId) setSessionId(storedSessionId);
          if (storedStartTime) {
            try {
              setWorkoutStartTime(new Date(storedStartTime));
            } catch (e) {
              console.error('Erro ao fazer parse de workoutStartTime:', e);
              setWorkoutStartTime(new Date());
            }
          }
          
          setIsWorkoutActive(true);
        }
      } catch (error) {
        console.error('Erro ao restaurar estado do treino:', error);
        // Em caso de erro, reiniciar o estado do treino
        setIsWorkoutActive(false);
        setCurrentExerciseIndex(0);
        setCurrentSetIndex(0);
        setCompletedSets({});
        setSetRepsHistory({});
        
        // Limpar o localStorage para evitar problemas futuros
        try {
          localStorage.removeItem(`treinoPro_isWorkoutActive_${id}`);
          localStorage.removeItem(`treinoPro_currentExerciseIndex_${id}`);
          localStorage.removeItem(`treinoPro_currentSetIndex_${id}`);
          localStorage.removeItem(`treinoPro_completedSets_${id}`);
          localStorage.removeItem(`treinoPro_setRepsHistory_${id}`);
          localStorage.removeItem(`treinoPro_sessionId_${id}`);
          localStorage.removeItem(`treinoPro_workoutStartTime_${id}`);
          localStorage.removeItem('treinoPro_timerState');
        } catch (e) {
          console.error('Erro ao limpar localStorage:', e);
        }
      }
    }
  }, [id]);

  // Salvar estado do treino no localStorage quando houver mudanças relevantes
  useEffect(() => {
    if (isWorkoutActive) {
      try {
        localStorage.setItem(`treinoPro_isWorkoutActive_${id}`, 'true');
        localStorage.setItem(`treinoPro_currentExerciseIndex_${id}`, currentExerciseIndex.toString());
        localStorage.setItem(`treinoPro_currentSetIndex_${id}`, currentSetIndex.toString());
        localStorage.setItem(`treinoPro_completedSets_${id}`, JSON.stringify(completedSets));
        localStorage.setItem(`treinoPro_sessionId_${id}`, sessionId || '');
        if (workoutStartTime) {
          localStorage.setItem(`treinoPro_workoutStartTime_${id}`, workoutStartTime.toISOString());
        }
      } catch (error) {
        console.error('Erro ao salvar estado do treino:', error);
      }
    } else {
      // Limpar localStorage quando o treino não estiver ativo
      try {
        localStorage.removeItem(`treinoPro_isWorkoutActive_${id}`);
        localStorage.removeItem(`treinoPro_currentExerciseIndex_${id}`);
        localStorage.removeItem(`treinoPro_currentSetIndex_${id}`);
        localStorage.removeItem(`treinoPro_completedSets_${id}`);
        localStorage.removeItem(`treinoPro_setRepsHistory_${id}`);
        localStorage.removeItem(`treinoPro_sessionId_${id}`);
        localStorage.removeItem(`treinoPro_workoutStartTime_${id}`);
      } catch (error) {
        console.error('Erro ao limpar estado do treino:', error);
      }
    }
  }, [isWorkoutActive, currentExerciseIndex, currentSetIndex, completedSets, sessionId, workoutStartTime, id]);

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
    // Garantir que temos o ID correto do exercício atual
    const exerciseId = currentExercise?.id;
    
    if (!exerciseId) {
      console.error('ID do exercício atual não encontrado.');
      return;
    }
    
    // Usar o ID real do exercício como chave para evitar problemas quando os exercícios mudam de ordem
    const exerciseKey = `exercise_${exerciseId}`;
    let endTime = new Date();
    
    // Atualizar o histórico de repetições para o exercício atual
    const updatedSetRepsHistory = { ...setRepsHistory };
    if (!updatedSetRepsHistory[exerciseKey]) {
      updatedSetRepsHistory[exerciseKey] = [];
    }
    updatedSetRepsHistory[exerciseKey][currentSetIndex] = repsCompleted;
    setSetRepsHistory(updatedSetRepsHistory);
    
    // Salvar histórico no localStorage para persistir após recarregar a página
    try {
      localStorage.setItem(`treinoPro_setRepsHistory_${id}`, JSON.stringify(updatedSetRepsHistory));
    } catch (error) {
      console.error("Erro ao salvar histórico de séries:", error);
    }
    
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
        startRestTimer(currentExercise.rest_time);
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
    
    // Salvar o estado atualizado dos exercícios no localStorage
    try {
      localStorage.setItem(`treinoPro_completedSets_${id}`, JSON.stringify(updatedCompletedSets));
      localStorage.setItem(`treinoPro_lastExerciseIndex`, currentExerciseIndex.toString());
      localStorage.setItem(`treinoPro_currentExerciseIdMap_${id}`, JSON.stringify({
        currentIndex: currentExerciseIndex,
        exerciseId: currentExercise.id
      }));
    } catch (error) {
      console.error('Erro ao salvar estado de exercícios:', error);
    }
  };

  // Atualizar o manipulador de repetições para trabalhar com entrada direta
  const handleRepsChange = (e) => {
    // Converter para número inteiro e garantir que seja um valor válido
    const value = parseInt(e.target.value) || 0;
    // Garantir que o valor esteja entre 0 e o máximo de repetições do exercício
    setRepsCompleted(Math.min(Math.max(0, value), currentExercise?.reps || 0));
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

  // Função para pular o exercício atual e movê-lo para o final da ficha
  const skipExercise = () => {
    // Confirmar com o usuário 
    if (!confirm('Deseja realmente pular este exercício? Ele será trocado com o próximo exercício.')) {
      return;
    }

    // Se estamos no último exercício, não há para onde pular
    if (currentExerciseIndex >= exercises.length - 1) {
      alert('Este é o último exercício da ficha.');
      return;
    }

    // Copiar a lista de exercícios
    const updatedExercises = [...exercises];
    
    // Trocar a posição do exercício atual com o próximo (inverter posições)
    [updatedExercises[currentExerciseIndex], updatedExercises[currentExerciseIndex + 1]] = 
    [updatedExercises[currentExerciseIndex + 1], updatedExercises[currentExerciseIndex]];
    
    // Atualizar o estado com a nova lista de exercícios
    setExercises(updatedExercises);
    
    // Resetar contadores relacionados ao exercício
    setCurrentSetIndex(0);
    setRepsCompleted(0);
    
    // Verificar se o "novo" exercício atual (que era o próximo) é baseado em tempo
    if (updatedExercises[currentExerciseIndex].time) {
      setTimeRemaining(updatedExercises[currentExerciseIndex].time);
      setTimerActive(false);
    }

    // Atualizar o tempo inicial da série
    setCurrentSetStartTime(new Date());

    // Atualizar no localStorage para manter consistência
    localStorage.setItem(`treinoPro_currentExerciseIndexOrder_${id}`, JSON.stringify(
      updatedExercises.map(ex => ex.id)
    ));
  };

  // Adicionar função para pular para um exercício específico
  const skipToExercise = (targetIndex) => {
    // Confirmar com o usuário
    if (!confirm(`Deseja pular para o exercício "${exercises[targetIndex].name}"?`)) {
      return;
    }

    try {
      // Criar uma cópia profunda da lista de exercícios
      const currentExercises = JSON.parse(JSON.stringify(exercises));
      const targetExercise = currentExercises[targetIndex];
      
      // Manter referência dos IDs originais para rastreamento
      const originalExerciseId = currentExercises[currentExerciseIndex].id;
      const targetExerciseId = targetExercise.id;
      
      // Atualizar o estado atual
      setCurrentExerciseIndex(targetIndex);
      setCurrentSetIndex(0);
      setRepsCompleted(0);
      
      // Se o exercício de destino é baseado em tempo, configurar temporizador
      if (targetExercise.time) {
        setTimeRemaining(targetExercise.time);
        setTimerActive(false);
      }
      
      // Atualizar o tempo inicial da série
      setCurrentSetStartTime(new Date());
      
      // Armazenar troca de exercícios no localStorage
      localStorage.setItem(`treinoPro_lastExerciseIndex`, targetIndex.toString());
      localStorage.setItem(`treinoPro_currentExerciseIdMap_${id}`, JSON.stringify({
        currentIndex: targetIndex,
        exerciseId: targetExerciseId
      }));
    } catch (error) {
      console.error('Erro ao pular para exercício:', error);
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
    // Garantir que seconds seja um número inteiro
    const secondsInt = Math.floor(seconds);
    const mins = Math.floor(secondsInt / 60);
    const secs = secondsInt % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Função para verificar se uma série está completa, usando o ID do exercício como chave
  const isSetCompleted = (exerciseIndex, setIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) return false;
    
    const exerciseKey = `exercise_${exercise.id}`;
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
      
      // Buscar detalhes da sessão para recuperar o progresso
      try {
        const { data: sessionDetails, error: detailsError } = await supabase
          .from('workout_session_details')
          .select('*')
          .eq('session_id', sessionToResumeId)
          .order('exercise_index', { ascending: true })
          .order('set_index', { ascending: true });
        
        if (detailsError) throw detailsError;
        
        // Reconstruir completedSets a partir dos detalhes da sessão
        const newCompletedSets = {};
        const newSetRepsHistory = {};
        
        if (sessionDetails && sessionDetails.length > 0) {
          // Identificar o último exercício e série concluídos
          let lastExerciseIndex = 0;
          let lastSetIndex = 0;
          
          sessionDetails.forEach(detail => {
            const exerciseKey = `${detail.exercise_index}`;
            
            // Inicializar arrays se não existirem
            if (!newCompletedSets[exerciseKey]) {
              newCompletedSets[exerciseKey] = [];
            }
            if (!newSetRepsHistory[exerciseKey]) {
              newSetRepsHistory[exerciseKey] = [];
            }
            
            // Adicionar série concluída
            newCompletedSets[exerciseKey].push(detail.set_index);
            newSetRepsHistory[exerciseKey][detail.set_index] = detail.reps_completed;
            
            // Atualizar último exercício/série
            if (detail.exercise_index > lastExerciseIndex) {
              lastExerciseIndex = detail.exercise_index;
              lastSetIndex = detail.set_index;
            } else if (detail.exercise_index === lastExerciseIndex && detail.set_index > lastSetIndex) {
              lastSetIndex = detail.set_index;
            }
          });
          
          // Configurar para o próximo exercício/série não concluído
          const currentExerciseObj = exercises[lastExerciseIndex];
          if (currentExerciseObj && lastSetIndex + 1 >= currentExerciseObj.sets) {
            // Se todas as séries do último exercício foram concluídas, passar para o próximo
            setCurrentExerciseIndex(lastExerciseIndex + 1);
            setCurrentSetIndex(0);
          } else {
            // Senão, continuar no mesmo exercício, próxima série
            setCurrentExerciseIndex(lastExerciseIndex);
            setCurrentSetIndex(lastSetIndex + 1);
          }
        } else {
          // Se não houver detalhes, começar do início
          setCurrentExerciseIndex(0);
          setCurrentSetIndex(0);
        }
        
        // Atualizar o estado com os dados reconstruídos
        setCompletedSets(newCompletedSets);
        setSetRepsHistory(newSetRepsHistory);
      } catch (detailError) {
        console.error('Erro ao buscar detalhes da sessão:', detailError);
        // Se falhar, simplesmente comece do início
        setCurrentExerciseIndex(0);
        setCurrentSetIndex(0);
        setCompletedSets({});
        setSetRepsHistory({});
      }
      
      // Configurar o estado básico da sessão
      setSessionId(sessionToResumeId);
      setWorkoutStartTime(startTime);
      setIsWorkoutActive(true);
      setRepsCompleted(0);
      
      // Configurar o exercício atual
      const currentExercise = exercises[currentExerciseIndex];
      if (currentExercise && currentExercise.time) {
        setTimeRemaining(currentExercise.time);
        setTimerActive(false); // Não inicia o timer automaticamente ao retomar
      }
      
      // Notificar o usuário
      alert('Treino retomado com sucesso!');
    } catch (error) {
      console.error('Erro ao retomar treino:', error);
      setError('Ocorreu um erro ao retomar o treino. Por favor, tente novamente.');
      
      // Em caso de erro, reiniciar o estado
      setIsWorkoutActive(false);
      setCurrentExerciseIndex(0);
      setCurrentSetIndex(0);
      setCompletedSets({});
      setSetRepsHistory({});
    }
  };

  // Solicitar permissão para notificações ao iniciar a aplicação
  useEffect(() => {
    // Verificar se o navegador suporta notificações
    if ('Notification' in window) {
      // Verificar permissão atual
      if (Notification.permission === 'granted') {
        setNotificationPermission(true);
      } else if (Notification.permission !== 'denied') {
        // Se ainda não negou, solicitar permissão
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setNotificationPermission(true);
          }
        });
      }
    }
  }, []);
  
  // Função para enviar notificação
  const sendRestFinishedNotification = () => {
    try {
      // Mostrar notificação nativa se permitido
      if (Notification.permission === 'granted') {
        const currentEx = exercises[currentExerciseIndex];
        new Notification('Tempo de descanso finalizado!', {
          body: `Hora de iniciar a próxima série de ${currentEx?.name || 'exercício'}!`,
          icon: '/favicon.ico'
        });
      }
      
      // Mostrar alerta visual para todos os dispositivos (principalmente iOS)
      showIOSAlert();
    } catch (error) {
      console.error('Erro ao mostrar notificação de descanso:', error);
    }
  };

  // Função para mostrar alerta visual simplificado
  const showIOSAlert = () => {
    console.log('Mostrando popup de timer finalizado');
    
    try {
      // Criar um elemento de overlay para o popup
      const alertOverlay = document.createElement('div');
      alertOverlay.style.position = 'fixed';
      alertOverlay.style.top = '0';
      alertOverlay.style.left = '0';
      alertOverlay.style.width = '100%';
      alertOverlay.style.height = '100%';
      alertOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      alertOverlay.style.zIndex = '9999';
      alertOverlay.style.display = 'flex';
      alertOverlay.style.flexDirection = 'column';
      alertOverlay.style.justifyContent = 'center';
      alertOverlay.style.alignItems = 'center';
      alertOverlay.style.padding = '20px';
      
      // Conteúdo do popup
      const alertBox = document.createElement('div');
      alertBox.style.backgroundColor = '#fff';
      alertBox.style.borderRadius = '12px';
      alertBox.style.padding = '20px';
      alertBox.style.maxWidth = '85%';
      alertBox.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
      
      // Título do popup
      const alertTitle = document.createElement('h2');
      alertTitle.style.fontSize = '22px';
      alertTitle.style.fontWeight = 'bold';
      alertTitle.style.marginBottom = '15px';
      alertTitle.style.textAlign = 'center';
      alertTitle.style.color = '#4338ca'; 
      alertTitle.textContent = 'Descanso Finalizado';
      
      // Mensagem do popup
      const alertMessage = document.createElement('p');
      alertMessage.style.fontSize = '18px';
      alertMessage.style.marginBottom = '20px';
      alertMessage.style.textAlign = 'center';
      alertMessage.style.color = '#333';
      
      let exerciseName = 'próximo exercício';
      try {
        const currentExercise = exercises[currentExerciseIndex];
        if (currentExercise && currentExercise.name) {
          exerciseName = currentExercise.name;
        }
      } catch (e) {
        console.log('Erro ao obter nome do exercício:', e);
      }
      
      alertMessage.textContent = `Hora de começar a próxima série de ${exerciseName}`;
      
      // Botão de fechar
      const closeButton = document.createElement('button');
      closeButton.style.backgroundColor = '#4f46e5';
      closeButton.style.color = 'white';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '8px';
      closeButton.style.padding = '12px 24px';
      closeButton.style.fontSize = '16px';
      closeButton.style.fontWeight = 'bold';
      closeButton.style.cursor = 'pointer';
      closeButton.style.width = '100%';
      closeButton.style.marginTop = '10px';
      closeButton.textContent = 'Iniciar Próxima Série';
      
      // Adicionar evento para fechar o popup
      closeButton.addEventListener('click', () => {
        if (document.body.contains(alertOverlay)) {
          document.body.removeChild(alertOverlay);
          console.log('Popup fechado pelo botão');
        }
      });
      
      // Adicionar evento de toque em qualquer lugar para fechar
      alertOverlay.addEventListener('click', (event) => {
        // Prevenir que o clique dentro do popup feche-o
        if (event.target === alertOverlay) {
          document.body.removeChild(alertOverlay);
          console.log('Popup fechado por toque fora');
        }
      });
      
      // Montar o popup
      alertBox.appendChild(alertTitle);
      alertBox.appendChild(alertMessage);
      alertBox.appendChild(closeButton);
      alertOverlay.appendChild(alertBox);
      
      // Remover alertas existentes antes de adicionar um novo
      const existingAlerts = document.querySelectorAll('[data-ios-alert="true"]');
      existingAlerts.forEach(alert => {
        if (document.body.contains(alert)) {
          document.body.removeChild(alert);
          console.log('Alerta existente removido');
        }
      });
      
      // Adicionar atributo de identificação
      alertOverlay.setAttribute('data-ios-alert', 'true');
      
      // Adicionar o popup ao corpo da página
      if (document.body) {
        document.body.appendChild(alertOverlay);
        console.log('Popup adicionado ao body');
      } else {
        console.error('document.body não está disponível');
      }
      
      // Remover automaticamente após 30 segundos (caso o usuário não interaja)
      setTimeout(() => {
        if (document.body && document.body.contains(alertOverlay)) {
          document.body.removeChild(alertOverlay);
          console.log('Popup removido automaticamente após timeout');
        }
      }, 30000);
      
    } catch (error) {
      console.error('Erro ao mostrar popup:', error);
    }
  };

  // Função específica para iniciar o timer de descanso no iOS
  const startRestTimer = (duration) => {
    // Arredondar para cima a duração para garantir valores inteiros de segundos
    const intDuration = Math.ceil(duration);
    setRestTimeRemaining(intDuration);
    setRestTimerActive(true);
    
    const now = Date.now();
    restTimerEndRef.current = now + (intDuration * 1000);
    
    console.log(`Temporizador de descanso iniciado por ${intDuration}s, terminará em:`, 
      new Date(restTimerEndRef.current).toLocaleTimeString());
    
    // Para iOS, armazenar timestamps absolutos no localStorage para maior precisão
    if (isIOS) {
      localStorage.setItem('treinoPro_restTimerStart', now.toString());
      localStorage.setItem('treinoPro_restTimerDuration', intDuration.toString());
      localStorage.setItem('treinoPro_restTimerEnd', restTimerEndRef.current.toString());
      localStorage.setItem('treinoPro_backgroundTimestamp', '0');
    }
    
    // Salvar o estado após iniciar o temporizador de descanso
    saveTimersState();
  };

  // Usar uma função vazia para o playBackgroundNotificationSound
  const playBackgroundNotificationSound = () => {
    // Função vazia para garantir que nenhum som seja reproduzido
    console.log("Notificações sonoras desativadas");
  };

  // Efeito para lidar com eventos de visibilidade (quando o app fica em segundo plano)
  useEffect(() => {
    if (isIOS && isWorkoutActive) {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          // Salvando timestamp quando o app vai para segundo plano
          const now = Date.now();
          localStorage.setItem('treinoPro_backgroundTimestamp', now.toString());
          
          // Salvando o índice atual do exercício para recuperação correta
          localStorage.setItem('treinoPro_lastExerciseIndex', currentExerciseIndex.toString());
          
          // Salvando mapeamento de ID de exercício para rastreamento entre sessões
          const currentExerciseId = exercises[currentExerciseIndex]?.id;
          if (currentExerciseId) {
            localStorage.setItem(`treinoPro_currentExerciseIdMap_${id}`, JSON.stringify({
              currentIndex: currentExerciseIndex,
              exerciseId: currentExerciseId
            }));
          }
          
          // Salvando estado dos timers
          saveTimersState();
        } else if (document.visibilityState === 'visible') {
          // Verificando e atualizando os temporizadores quando o app volta ao foco
          const backgroundTimestamp = localStorage.getItem('treinoPro_backgroundTimestamp');
          const lastExerciseIndex = localStorage.getItem('treinoPro_lastExerciseIndex');
          const exerciseIdMapStr = localStorage.getItem(`treinoPro_currentExerciseIdMap_${id}`);
          
          // Restaurar o exercício correto usando o mapeamento de ID
          try {
            if (exerciseIdMapStr) {
              const exerciseIdMap = JSON.parse(exerciseIdMapStr);
              const { currentIndex, exerciseId } = exerciseIdMap;
              
              // Verificar se o exercício armazenado ainda existe na mesma posição
              const exerciseAtIndex = exercises[currentIndex];
              if (exerciseAtIndex && exerciseAtIndex.id === exerciseId) {
                // Se o exercício ainda estiver na mesma posição, use o índice
                if (currentIndex !== currentExerciseIndex) {
                  setCurrentExerciseIndex(currentIndex);
                }
              } else {
                // Se o exercício foi movido, encontre-o pelo ID
                const newIndex = exercises.findIndex(ex => ex.id === exerciseId);
                if (newIndex !== -1 && newIndex !== currentExerciseIndex) {
                  setCurrentExerciseIndex(newIndex);
                }
              }
            } else if (lastExerciseIndex && parseInt(lastExerciseIndex) !== currentExerciseIndex) {
              // Fallback para o método antigo
              setCurrentExerciseIndex(parseInt(lastExerciseIndex));
            }
          } catch (error) {
            console.error('Erro ao restaurar exercício atual:', error);
          }
          
          if (backgroundTimestamp) {
            const timeDiff = (Date.now() - parseInt(backgroundTimestamp)) / 1000;
            
            // Atualizar temporizador de exercício
            if (timerActive && timeRemaining > 0) {
              const newTimeRemaining = Math.max(0, timeRemaining - timeDiff);
              if (newTimeRemaining <= 0) {
                setTimerActive(false);
                setTimeRemaining(0);
                // Ao invés de chamar handleSetCompleted diretamente, fazemos apenas a ação principal
                const exerciseKey = `${currentExerciseIndex}`;
                const updatedCompletedSets = { ...completedSets };
                if (!updatedCompletedSets[exerciseKey]) {
                  updatedCompletedSets[exerciseKey] = [];
                }
                updatedCompletedSets[exerciseKey].push(currentSetIndex);
                setCompletedSets(updatedCompletedSets);
              } else {
                setTimeRemaining(newTimeRemaining);
              }
            }
            
            // Atualizar temporizador de descanso
            if (restTimerActive && restTimeRemaining > 0) {
              const newRestTimeRemaining = Math.max(0, restTimeRemaining - timeDiff);
              if (newRestTimeRemaining <= 0) {
                setRestTimerActive(false);
                setRestTimeRemaining(0);
                sendRestFinishedNotification();
              } else {
                setRestTimeRemaining(newRestTimeRemaining);
              }
            }
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isIOS, isWorkoutActive, timerActive, restTimerActive, timeRemaining, restTimeRemaining, currentExerciseIndex, currentSetIndex, completedSets, exercises, id]);

  // Efeito para carregar o estado do treino ao iniciar a página
  useEffect(() => {
    if (id && exercises.length > 0 && !loading) {
      loadTimersState();
    }
  }, [id, exercises, loading]);

  // Adicionar função para atualizar a carga durante o exercício
  const updateExerciseWeight = async (newWeight) => {
    if (!currentExercise || !isWorkoutActive) return;
    
    try {
      // Obter o ID do exercício atual para garantir que estamos atualizando o exercício certo
      const exerciseId = currentExercise.id;
      
      // Copiar a lista de exercícios
      const updatedExercises = [...exercises];
      
      // Encontrar o índice correto do exercício pelo ID (em vez de usar currentExerciseIndex)
      const exerciseIndex = updatedExercises.findIndex(ex => ex.id === exerciseId);
      
      if (exerciseIndex === -1) {
        console.error('Exercício não encontrado na lista:', exerciseId);
        return;
      }
      
      // Atualizar o peso do exercício encontrado
      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        weight: newWeight
      };
      
      // Atualizar o estado com a nova lista de exercícios
      setExercises(updatedExercises);
      
      // Atualizar no banco de dados na tabela workout_session_details (para o treino atual)
      if (sessionId) {
        const { error: sessionDetailError } = await supabase
          .from('workout_session_details')
          .update({
            weight_used: newWeight
          })
          .eq('session_id', sessionId)
          .eq('exercise_id', exerciseId)
          .eq('set_index', currentSetIndex);
          
        if (sessionDetailError) {
          console.error('Erro ao atualizar carga na sessão:', sessionDetailError);
        }
      }
      
      // Atualizar na tabela workout_exercises (para manter nos próximos treinos)
      const { error: exerciseUpdateError } = await supabase
        .from('workout_exercises')
        .update({
          weight: newWeight
        })
        .eq('id', exerciseId);
        
      if (exerciseUpdateError) {
        console.error('Erro ao atualizar carga permanente:', exerciseUpdateError);
      } else {
        console.log(`Carga atualizada com sucesso para ${newWeight}kg no exercício ${currentExercise.name}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar carga:', error);
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

  const currentExercise = isWorkoutActive && exercises.length > 0 && currentExerciseIndex < exercises.length 
    ? exercises[currentExerciseIndex] 
    : null;
  const videoId = currentExercise ? getYoutubeVideoId(currentExercise?.video_url) : null;

  return (
    <Layout title={`Treino: ${workoutList?.name || ''}`}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TreinoPro" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 rounded-lg shadow-lg p-3 text-white">
          <h1 className="text-xl font-bold">
            {isWorkoutActive ? 'Treino em Andamento' : 'Iniciar Treino'}
          </h1>
          <div className="flex space-x-2">
            {isWorkoutActive ? (
              <button
                onClick={finishWorkout}
                className="bg-white text-red-500 hover:bg-red-50 dark:bg-white/90 dark:hover:bg-white/80 font-medium py-1.5 px-3 rounded-full shadow transition-all"
              >
                Finalizar
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
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full shadow transition-all transform hover:scale-105"
                  disabled={exercises.length === 0}
                >
                  Iniciar Treino
                </button>
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

        {!isWorkoutActive ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {workoutList?.name}
            </h2>
            {workoutList?.description && (
                <p className="text-gray-600 dark:text-gray-300">{workoutList.description}</p>
            )}
            </div>

            {exercises.length === 0 ? (
              <div className="text-center py-12 px-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
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
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-center font-medium">
                  Esta lista contém <span className="text-blue-600 dark:text-blue-400 font-bold">{exercises.length}</span> exercícios. Clique em "Iniciar Treino" para começar.
                </p>
                
                <div className="space-y-4">
                    {exercises.map((exercise, index) => (
                    <div 
                      key={exercise.id} 
                      className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center p-4">
                        <div className="flex items-center mb-3 md:mb-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold mr-3">
                            {index + 1}
                          </div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                            {exercise.name}
                            </h3>
                        </div>
                        
                        <div className="ml-0 md:ml-11 grid grid-cols-2 gap-x-6 gap-y-1 text-sm flex-grow">
                              {exercise.weight && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                              </svg>
                                  <span className="font-medium text-gray-500 dark:text-gray-400">Carga:</span>{' '}
                              <span className="ml-1 font-bold text-gray-700 dark:text-gray-300">{exercise.weight} kg</span>
                                </div>
                              )}
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Séries:</span>{' '}
                            <span className="ml-1 font-bold text-gray-700 dark:text-gray-300">{exercise.sets}</span>
                              </div>
                              {exercise.reps && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                              </svg>
                                  <span className="font-medium text-gray-500 dark:text-gray-400">Repetições:</span>{' '}
                              <span className="ml-1 font-bold text-gray-700 dark:text-gray-300">{exercise.reps}</span>
                                </div>
                              )}
                              {exercise.time && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                                  <span className="font-medium text-gray-500 dark:text-gray-400">Tempo:</span>{' '}
                              <span className="ml-1 font-bold text-gray-700 dark:text-gray-300">{exercise.time} segundos</span>
                                </div>
                              )}
                            </div>
                        
                          {exercise.video_url && (
                            <a
                              href={exercise.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 md:mt-0 inline-flex items-center justify-center px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-300 rounded-full text-sm font-medium transition-colors ml-auto"
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
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-500 p-4 flex justify-between items-center text-white">
                <h2 className="text-xl font-bold">
                  Progresso
                </h2>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                  Exercício {currentExerciseIndex + 1} de {exercises.length}
                </div>
              </div>
              
              <div className="p-5">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300 ease-in-out"
                  style={{
                    width: `${((currentExerciseIndex + (currentSetIndex / currentExercise.sets)) / exercises.length) * 100}%`
                  }}
                ></div>
              </div>
              
                <div className="flex flex-wrap justify-between gap-4 text-sm">
                  <div className="flex items-center bg-blue-50 dark:bg-blue-900/40 rounded-lg px-4 py-3 flex-grow">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                    </svg>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Série atual:</span>{' '}
                    <span className="ml-2 font-bold text-blue-700 dark:text-blue-300">{currentSetIndex + 1} de {currentExercise.sets}</span>
                </div>
                  <div className="flex items-center bg-blue-50 dark:bg-blue-900/40 rounded-lg px-4 py-3 flex-grow">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Tempo de treino:</span>{' '}
                    <span className="ml-2 font-bold text-blue-700 dark:text-blue-300">
                      {formatTime(totalWorkoutTime)}
                  </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Exercício atual */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-400 dark:from-green-700 dark:to-green-500 p-4 text-white">
                <h2 className="text-xl font-bold">
                Exercício Atual
              </h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center font-bold mr-3">
                    {currentExerciseIndex + 1}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {currentExercise.name}
                </h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {currentExercise.weight && (
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-gray-400 mb-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                      </svg>
                      <span className="font-medium text-gray-500 dark:text-gray-400 text-xs">Carga</span>
                      <div className="flex items-center mt-1">
                        <button 
                          onClick={() => updateExerciseWeight(Math.max(0, (currentExercise.weight || 0) - 2.5))}
                          className="h-6 w-6 flex items-center justify-center bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-300 rounded"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                          </svg>
                        </button>
                        <span className="font-bold text-gray-800 dark:text-gray-100 text-lg mx-2">{currentExercise.weight} kg</span>
                        <button 
                          onClick={() => updateExerciseWeight((currentExercise.weight || 0) + 2.5)}
                          className="h-6 w-6 flex items-center justify-center bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-300 rounded"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-gray-400 mb-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                    <span className="font-medium text-gray-500 dark:text-gray-400 text-xs">Séries</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">{currentSetIndex + 1} / {currentExercise.sets}</span>
                  </div>
                  {currentExercise.reps && (
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-gray-400 mb-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                      <span className="font-medium text-gray-500 dark:text-gray-400 text-xs">Repetições</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">{repsCompleted} / {currentExercise.reps}</span>
                    </div>
                  )}
                  {currentExercise.time && timerActive && (
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-gray-400 mb-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="font-medium text-gray-500 dark:text-gray-400 text-xs">Tempo Restante</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">{formatTime(timeRemaining)}</span>
                    </div>
                  )}
                </div>
                
                {currentExercise.reps && !timerActive && (
                  <div className="mb-6">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
                      <div className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-center w-full md:w-auto">
                        <div className="font-medium text-gray-600 dark:text-gray-300 mr-2">Repetições realizadas:</div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="0"
                            max={currentExercise.reps}
                            value={repsCompleted}
                            onChange={handleRepsChange}
                            className="w-16 h-10 px-2 rounded-md border border-gray-300 dark:border-gray-600 text-center font-bold text-blue-700 dark:text-blue-400 text-xl bg-white dark:bg-gray-700"
                          />
                          <span className="ml-2 text-gray-500 dark:text-gray-400">/ {currentExercise.reps}</span>
                        </div>
                      </div>
                      
                    <button
                        onClick={handleRepsCompleted}
                        className={`px-6 py-3 rounded-full font-bold shadow transition-all w-full md:w-auto
                          ${repsCompleted >= currentExercise.reps ? 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white' : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white'}`}
                      >
                        {repsCompleted >= currentExercise.reps ? 'Série Completa' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}
                
                {currentExercise.time && !timerActive && (
                  <div className="flex justify-center mb-6">
                    <button
                      onClick={() => {
                        setTimeRemaining(currentExercise.time);
                        setTimerActive(true);
                        
                        // Inicializar o timer para iOS
                        if (isIOS) {
                          // Limpar qualquer timer existente
                          if (exerciseTimerRef.current) {
                            clearInterval(exerciseTimerRef.current);
                          }
                          
                          const now = Date.now();
                          exerciseTimerEndRef.current = now + (currentExercise.time * 1000);
                          
                          // Salvar no localStorage para persistência
                          localStorage.setItem('treinoPro_exerciseTimerStart', now.toString());
                          localStorage.setItem('treinoPro_exerciseTimerDuration', currentExercise.time.toString());
                          localStorage.setItem('treinoPro_exerciseTimerEnd', exerciseTimerEndRef.current.toString());
                        }
                        
                        // Salvar o estado
                        saveTimersState();
                      }}
                      className="px-6 py-3 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-full font-bold shadow transition-all"
                    >
                      Iniciar Temporizador ({currentExercise.time}s)
                    </button>
                  </div>
                )}
                
                {timerActive && (
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4 relative">
                      <svg className="absolute inset-0" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="5"
                          className="dark:stroke-gray-700"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="5"
                          strokeDasharray="283"
                          strokeDashoffset={283 - ((timeRemaining / currentExercise.time) * 283)}
                          transform="rotate(-90 50 50)"
                          className="dark:stroke-blue-500"
                        />
                      </svg>
                      <span className="text-4xl font-bold text-blue-700 dark:text-blue-400">{Math.ceil(timeRemaining)}s</span>
                    </div>
                    <button
                      onClick={() => setTimerActive(false)}
                      className="px-6 py-3 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-full font-bold shadow transition-all"
                    >
                      Parar
                    </button>
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
                
                {/* Controles adicionais, como a navegação entre exercícios */}
                <div className="flex flex-wrap gap-4 justify-center">
                  {currentExerciseIndex < exercises.length - 1 && (
                    <button
                      onClick={skipExercise}
                      className="px-4 py-2 bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 text-white rounded-lg text-sm font-medium shadow transition-all"
                    >
                      Pular para Próximo Exercício
                    </button>
                  )}
                  
                  {currentExercise.video_url && (
                    <button
                      onClick={toggleVideo}
                      className="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow transition-all flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                      {showVideo ? "Ocultar Vídeo" : "Mostrar Vídeo"}
                    </button>
                  )}
                </div>
                
                {/* Vídeo demonstrativo */}
                {showVideo && videoId && (
                  <div className="mt-6 rounded-lg overflow-hidden shadow-lg bg-black">
                    <div className="relative pt-[56.25%]">
                      <YouTube
                        videoId={videoId}
                        className="absolute inset-0 w-full h-full"
                        opts={{
                          width: '100%',
                          height: '100%',
                          playerVars: {
                            autoplay: 0,
                            controls: 1,
                            modestbranding: 1,
                          },
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Temporizador de descanso */}
            {restTimerActive && (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-700 dark:to-purple-500 p-4 text-white">
                  <h2 className="text-xl font-bold">
                    Tempo de Descanso
                  </h2>
                </div>
                
                <div className="p-6 flex flex-col items-center">
                  <div className="w-36 h-36 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-4 relative">
                    <svg className="absolute inset-0" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="5"
                        className="dark:stroke-gray-700"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#9333ea"
                        strokeWidth="5"
                        strokeDasharray="283"
                        strokeDashoffset={283 - ((restTimeRemaining / (currentExercise?.rest_time || 60)) * 283)}
                        transform="rotate(-90 50 50)"
                        className="dark:stroke-purple-500"
                      />
                    </svg>
                    <span className="text-4xl font-bold text-purple-700 dark:text-purple-400">{Math.ceil(restTimeRemaining)}s</span>
                  </div>
                  
                  <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                    Tempo de descanso antes da próxima série
                  </p>
                  
                  <button
                    onClick={() => {
                      setRestTimerActive(false);
                      setRestTimeRemaining(0);
                    }}
                    className="px-6 py-3 bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-full font-bold shadow transition-all"
                  >
                    Pular Descanso
                  </button>
                </div>
              </div>
            )}
            
            {/* Navegação entre exercícios */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Outros Exercícios
                </h2>
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {exercises.map((exercise, index) => (
                  <div 
                    key={exercise.id} 
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${index === currentExerciseIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                          index === currentExerciseIndex 
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <span className={`font-medium ${
                          index === currentExerciseIndex 
                            ? 'text-blue-600 dark:text-blue-300' 
                            : 'text-gray-700 dark:text-gray-200'
                        }`}>
                          {exercise.name}
                        </span>
                      </div>
                      
                      {index !== currentExerciseIndex && (
                        <button
                          onClick={() => skipToExercise(index)}
                          className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                        >
                          Ir para
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 