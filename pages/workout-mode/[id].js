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

  // Referência para o áudio de fundo
  const backgroundAudioRef = useRef(null);
  const audioContextRef = useRef(null);

  // Detectar se é um dispositivo iOS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Verificar se estamos em um dispositivo iOS
      const ua = window.navigator.userAgent;
      const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
      setIsIOS(iOS);
      console.log('Dispositivo iOS detectado:', iOS);
    }
  }, []);

  // Inicializar a referência de áudio
  useEffect(() => {
    if (typeof window !== 'undefined' && isIOS) {
      // Criar elementos de áudio para iOS
      try {
        // Audiocontext para iOS (permite continuar em segundo plano)
        if (window.AudioContext || window.webkitAudioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
          console.log('AudioContext criado para iOS');
        }
        
        // Inicializar o elemento de áudio para usar em segundo plano
        const audio = new Audio();
        audio.src = '/sounds/notification.mp3';
        audio.loop = false;
        audio.volume = 1.0;
        
        // Configurar atributos para aumentar chances de reprodução em segundo plano
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        audio.preload = 'auto';

        // Evento que executa quando o arquivo termina de carregar
        audio.oncanplaythrough = () => {
          console.log('Áudio carregado e pronto para reprodução');
        };
        
        // Lidar com erros de áudio
        audio.onerror = (e) => {
          console.error('Erro ao carregar áudio:', e);
        };
        
        // Configurar manipulador para quando o áudio terminar
        audio.onended = () => {
          console.log('Áudio de notificação terminou');
        };
        
        backgroundAudioRef.current = audio;
        
        // Pré-carregar o áudio com um "toque silencioso" para inicializar o sistema de áudio
        document.addEventListener('touchstart', function initAudio() {
          console.log('Inicializando sistema de áudio com interação do usuário');
          audio.volume = 0.01;
          audio.play().then(() => {
            setTimeout(() => {
              audio.pause();
              audio.currentTime = 0;
              audio.volume = 1.0;
              console.log('Sistema de áudio inicializado com sucesso');
            }, 100);
          }).catch(e => {
            console.log('Erro ao inicializar sistema de áudio:', e);
          });
          document.removeEventListener('touchstart', initAudio);
        }, { once: true });
      } catch (error) {
        console.error('Erro ao configurar áudio para iOS:', error);
      }
    }
    
    return () => {
      // Limpar recursos de áudio
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.log('Erro ao fechar AudioContext:', e));
        audioContextRef.current = null;
      }
    };
  }, [isIOS]);

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
        
        localStorage.setItem('appTreino_timerState', JSON.stringify(timerState));
        console.log('Estado dos timers salvo no localStorage');
      } catch (error) {
        console.error('Erro ao salvar o estado dos timers:', error);
      }
    }
  };

  // Função para carregar estado dos timers do localStorage com uso de timestamps absolutos
  const loadTimersState = () => {
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem('appTreino_timerState');
        if (savedState) {
          const state = JSON.parse(savedState);
          const now = Date.now();
          lastUpdatedTimeRef.current = now;
          
          // Verificar se o estado é válido e corresponde à sessão atual
          if (state.workoutId === id && state.sessionId === sessionId && state.isWorkoutActive) {
            console.log('Carregando estado dos timers do localStorage');
            
            // Restaurar o tempo de treino total
            if (state.workoutStartTime) {
              const elapsed = Math.floor((now - state.workoutStartTime) / 1000);
              setTotalWorkoutTime(elapsed);
              setWorkoutStartTime(new Date(state.workoutStartTime));
              workoutStartRef.current = state.workoutStartTime;
            }
            
            // Restaurar o tempo de exercício
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
            
            // Restaurar o tempo de descanso com maior precisão
            if (state.restEndTime && state.restTimerActive) {
              const remaining = Math.max(0, (state.restEndTime - now) / 1000);
              console.log(`Tempo de descanso restante: ${remaining}s`);
              if (remaining > 0) {
                setRestTimeRemaining(remaining);
                setRestTimerActive(true);
                restTimerEndRef.current = state.restEndTime;
              } else {
                // O temporizador deveria ter terminado enquanto estava em segundo plano
                setRestTimeRemaining(0);
                setRestTimerActive(false);
                restTimerEndRef.current = null;
                // Enviar notificação se o temporizador acabou enquanto estava em segundo plano
                sendRestFinishedNotification();
              }
            }
            
            // Restaurar índices
            setCurrentExerciseIndex(state.currentExerciseIndex);
            setCurrentSetIndex(state.currentSetIndex);
          } else {
            // Se o estado não corresponder, limpar
            localStorage.removeItem('appTreino_timerState');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar o estado dos timers:', error);
      }
    }
  };

  // Temporizador absoluto para iOS - usado para verificar o tempo quando o app volta ao foco
  useEffect(() => {
    // Identificar iOS de forma mais abrangente
    const detectIOS = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return true;
      }
      return /iOS/.test(userAgent);
    };
    
    if (typeof window !== 'undefined') {
      const isIOSDevice = detectIOS();
      setIsIOS(isIOSDevice);
      console.log('Detectando iOS:', isIOSDevice);
    }
    
    if (isIOS) {
      console.log('Dispositivo iOS detectado, configurando sistema de verificação de retorno');
      
      // Temporizador específico para iOS que verifica quando o app volta ao foco
      const checkTimerOnFocus = () => {
        if (document.visibilityState === 'visible' && isWorkoutActive) {
          console.log('iOS: Aplicativo voltou ao foco, verificando temporizadores');
          
          const now = Date.now();
          
          // Verificar timer de descanso usando valores absolutos do localStorage para maior precisão
          const endTimeStr = localStorage.getItem('appTreino_restTimerEnd');
          
          if (endTimeStr && restTimerActive) {
            const endTime = parseInt(endTimeStr);
            const remaining = Math.max(0, (endTime - now) / 1000);
            console.log(`iOS: Tempo de descanso restante: ${remaining.toFixed(1)}s (end: ${new Date(endTime).toLocaleTimeString()})`);
            
            if (remaining <= 0) {
              console.log('iOS: Timer de descanso finalizado enquanto em segundo plano');
              setRestTimerActive(false);
              setRestTimeRemaining(0);
              restTimerEndRef.current = null;
              localStorage.removeItem('appTreino_restTimerStart');
              localStorage.removeItem('appTreino_restTimerDuration');
              localStorage.removeItem('appTreino_restTimerEnd');
              
              // Mostrar apenas o popup simples
              showIOSAlert();
              console.log('iOS: Alerta visual mostrado ao voltar ao foco');
            } else {
              // Atualizar o tempo restante com valor preciso do localStorage
              setRestTimeRemaining(remaining);
              // Atualizar referência local para manter consistência
              restTimerEndRef.current = endTime;
            }
          }
        }
      };
      
      // Salvar timestamp quando o app vai para segundo plano
      const saveTimestampOnBlur = () => {
        if (document.visibilityState === 'hidden' && isWorkoutActive) {
          console.log('iOS: Aplicativo em segundo plano, salvando timestamp preciso');
          const now = Date.now();
          localStorage.setItem('appTreino_backgroundTimestamp', now.toString());
          
          // Salvar estado atual dos timers antes de ir para segundo plano
          if (restTimerActive && restTimerEndRef.current) {
            localStorage.setItem('appTreino_restTimerEnd', restTimerEndRef.current.toString());
            console.log(`iOS: Timer terminará em: ${new Date(restTimerEndRef.current).toLocaleTimeString()}`);
          }
        }
      };
      
      // Eventos para detectar mudanças de foco no iOS
      document.addEventListener('visibilitychange', checkTimerOnFocus);
      document.addEventListener('visibilitychange', saveTimestampOnBlur);
      window.addEventListener('focus', checkTimerOnFocus);
      window.addEventListener('blur', saveTimestampOnBlur);
      window.addEventListener('pageshow', checkTimerOnFocus);
      window.addEventListener('pagehide', saveTimestampOnBlur);
      
      // Verificar a cada 1 segundo enquanto o app estiver visível
      const visibleInterval = setInterval(() => {
        if (isWorkoutActive && document.visibilityState === 'visible' && restTimerActive && restTimerEndRef.current) {
          const now = Date.now();
          const remaining = Math.max(0, (restTimerEndRef.current - now) / 1000);
          
          // Verificar se o timer acabou
          if (remaining <= 0) {
            console.log('iOS: Tempo de descanso finalizado enquanto app visível');
            setRestTimerActive(false);
            setRestTimeRemaining(0);
            restTimerEndRef.current = null;
            localStorage.removeItem('appTreino_restTimerStart');
            localStorage.removeItem('appTreino_restTimerDuration');
            localStorage.removeItem('appTreino_restTimerEnd');
            
            // Apenas mostrar o popup simples
            showIOSAlert();
          } else {
            // Atualizar o tempo restante com precisão de 1 casa decimal
            const newRestTime = Number(remaining.toFixed(1));
            setRestTimeRemaining(newRestTime);
          }
        }
      }, 100); // Intervalo menor para maior precisão quando visível
      
      return () => {
        document.removeEventListener('visibilitychange', checkTimerOnFocus);
        document.removeEventListener('visibilitychange', saveTimestampOnBlur);
        window.removeEventListener('focus', checkTimerOnFocus);
        window.removeEventListener('blur', saveTimestampOnBlur);
        window.removeEventListener('pageshow', checkTimerOnFocus);
        window.removeEventListener('pagehide', saveTimestampOnBlur);
        clearInterval(visibleInterval);
      };
    }
  }, [isIOS, isWorkoutActive, restTimerActive]);

  // Efeito para inicializar o intervalo principal com maior estabilidade
  useEffect(() => {
    if (isWorkoutActive) {
      // Limpar qualquer intervalo existente
      if (mainIntervalRef.current) {
        clearInterval(mainIntervalRef.current);
      }
      
      // Definir o intervalo de atualização para 1000ms (1s) para evitar oscilações
      const INTERVAL_MS = 1000;
      
      // Criar novo intervalo para atualizar todos os timers frequentemente
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
            const newTime = prev - (INTERVAL_MS / 1000);
            if (newTime <= 0) {
              handleSetCompleted();
              return 0;
            }
            return Math.max(0, Math.floor(newTime));
          });
        }
        
        // Atualizar tempo de descanso, evitando atualizações em iOS (que usa sua própria lógica)
        if (restTimerActive && restTimerEndRef.current && !isIOS) {
          const remaining = Math.max(0, (restTimerEndRef.current - now) / 1000);
          
          // Verificar se o timer acabou
          if (remaining <= 0) {
            console.log('Tempo de descanso finalizado!');
            setRestTimerActive(false);
            setRestTimeRemaining(0);
            restTimerEndRef.current = null;
            // Enviar notificação para trazer o app para o primeiro plano
            sendRestFinishedNotification();
          } else {
            // Atualizar o tempo restante (usando floor para evitar flutuações)
            setRestTimeRemaining(Math.floor(remaining));
          }
        }
        
        // Salvar estado continuamente apenas se não for iOS (iOS tem sua própria lógica)
        if (!isIOS) {
          saveTimersState();
        }
      }, INTERVAL_MS);
      
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
        localStorage.removeItem('appTreino_restTimerStart');
        localStorage.removeItem('appTreino_restTimerDuration');
        localStorage.removeItem('appTreino_restTimerEnd');
        localStorage.removeItem('appTreino_backgroundTimestamp');
      }
    }
  }, [isWorkoutActive, isIOS]);

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
    if (!confirm('Deseja realmente pular este exercício? Ele será movido para o final da ficha.')) {
      return;
    }

    // Se estamos no último exercício, não há para onde pular
    if (currentExerciseIndex >= exercises.length - 1) {
      alert('Este é o último exercício da ficha.');
      return;
    }

    // Copiar a lista de exercícios
    const updatedExercises = [...exercises];
    
    // Remover o exercício atual
    const skippedExercise = updatedExercises.splice(currentExerciseIndex, 1)[0];
    
    // Adicionar o exercício ao final da lista
    updatedExercises.push(skippedExercise);
    
    // Atualizar o estado com a nova lista de exercícios
    setExercises(updatedExercises);
    
    // Não precisamos incrementar o índice porque ao remover o exercício atual,
    // o próximo exercício já passa para a posição atual automaticamente
    
    // Resetar contadores relacionados ao exercício
    setCurrentSetIndex(0);
    setRepsCompleted(0);
    if (updatedExercises[currentExerciseIndex].time) {
      setTimeRemaining(updatedExercises[currentExerciseIndex].time);
      setTimerActive(false);
    }

    // Atualizar o tempo inicial da série
    setCurrentSetStartTime(new Date());
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

  // Solicitar permissão para notificações ao iniciar a aplicação
  useEffect(() => {
    // Verificar se o navegador suporta notificações
    if ('Notification' in window) {
      // Verificar permissão atual
      if (Notification.permission === 'granted') {
        setNotificationPermission(true);
        
        // Se for iOS, tentar registrar para notificações push se possível
        if (isIOS) {
          registerForPushNotifications();
        }
      } else if (Notification.permission !== 'denied') {
        // Se ainda não negou, solicitar permissão
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setNotificationPermission(true);
            
            // Se for iOS, tentar registrar para notificações push se possível
            if (isIOS) {
              registerForPushNotifications();
            }
          }
        });
      }
    }
  }, [isIOS]);
  
  // Função para registrar para notificações push no iOS
  const registerForPushNotifications = () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Notificações push não são suportadas neste navegador');
      return;
    }
    
    try {
      console.log('Tentando registrar para notificações push');
      
      // Registrar service worker para notificações push
      navigator.serviceWorker.register('/push-sw.js')
        .then(registration => {
          console.log('Service Worker registrado com sucesso:', registration);
          
          // Solicitar permissão para notificações push
          return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              'BFnrxGZ2-TzxWgXNiP-GG_Wo-Nau0r_07i9RgQIHGdx4Wy3PoZwMx00XvoFJkP4Bx1pZ6sKCtjsZZpbTUoxnMpw'
            )
          });
        })
        .then(subscription => {
          console.log('Inscrito para notificações push:', subscription);
          // Aqui você poderia enviar o subscription para seu servidor
        })
        .catch(err => {
          console.error('Erro ao registrar para notificações push:', err);
        });
    } catch (error) {
      console.error('Erro ao configurar notificações push:', error);
    }
  };
  
  // Função auxiliar para converter a chave pública em formato adequado
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Função para enviar notificação
  const sendRestFinishedNotification = () => {
    if (!notificationPermission) {
      console.log('Notificações não permitidas. Tentando reproduzir som como alternativa.');
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 1.0;
        audio.play().catch(e => console.log('Erro ao tocar som:', e));
        
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        
        // Mostrar alerta visual para iOS mesmo sem permissão
        if (isIOS) {
          showIOSAlert();
        }
      } catch (audioError) {
        console.error('Erro ao inicializar áudio:', audioError);
      }
      return;
    }
    
    try {
      const currentExercise = exercises[currentExerciseIndex];
      const notificationTitle = 'Descanso finalizado!';
      const notificationBody = `Hora de começar a próxima série de ${currentExercise.name}`;
      
      // Para iOS, usar uma abordagem específica com alerta visual
      if (isIOS) {
        console.log('Enviando notificação para iOS, standalone mode:', window.navigator.standalone);
        
        // Mostrar alerta visual para iOS (overlay ou modal que chama atenção)
        showIOSAlert();
        
        // Vibrar o dispositivo duas vezes para aumentar a atenção
        if ('vibrate' in navigator) {
          navigator.vibrate([300, 100, 300, 100, 300]);
        }
        
        // Tocar um som mais alto em iOS
        try {
          // Criar e configurar áudio com volume alto
          const audio = new Audio('/sounds/notification.mp3');
          audio.volume = 1.0; // Volume máximo
          
          // Função para tentar reproduzir o som com repetição
          const playSound = () => {
            console.log('Tentando reproduzir som no iOS');
            
            // Tentar reproduzir múltiplas vezes (iOS pode limitar a reprodução automática)
            const playAttempt = () => {
              audio.play().catch(e => {
                console.log('Erro ao tentar reproduzir som no iOS:', e);
                
                // Se falhar, tentar novamente quando o usuário interagir com a página
                document.addEventListener('touchstart', function playOnTouch() {
                  audio.play().catch(err => console.log('Erro após interação:', err));
                  document.removeEventListener('touchstart', playOnTouch);
                }, { once: true });
              });
            };
            
            // Tentar reproduzir agora
            playAttempt();
            
            // E tentar novamente em 1 segundo para aumentar as chances
            setTimeout(playAttempt, 1000);
          };
          
          // Reproduzir som agora
          playSound();
          
          // Força a tela a ficar ligada (quando possível)
          if ('wakeLock' in navigator) {
            try {
              navigator.wakeLock.request('screen').then(wakeLock => {
                console.log('WakeLock ativado para manter a tela ligada');
                
                // Liberar após 10 segundos
                setTimeout(() => {
                  wakeLock.release();
                  console.log('WakeLock liberado');
                }, 10000);
              }).catch(e => console.log('Erro ao tentar WakeLock:', e));
            } catch (wlError) {
              console.log('WakeLock não suportado:', wlError);
            }
          }
        } catch (audioError) {
          console.log('Erro ao inicializar áudio no iOS:', audioError);
        }
      } else {
        // Abordagem padrão para outros navegadores
        try {
          const notification = new Notification(notificationTitle, {
            body: notificationBody,
            icon: '/icon-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'rest-finished',
            renotify: true,
            requireInteraction: true // Requer interação do usuário para fechar
          });
          
          // Quando o usuário clicar na notificação, trazer o app para o primeiro plano
          notification.onclick = function() {
            console.log('Notificação clicada, focando na janela');
            window.focus();
            notification.close();
          };
          
          // Tocar um som de alerta com tratamento de erros aprimorado
          const audio = new Audio('/sounds/notification.mp3');
          audio.volume = 0.8;
          audio.play().catch(e => console.log('Erro ao reproduzir som:', e));
          
          // Vibrar dispositivo
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        } catch (notificationError) {
          console.error('Erro ao criar notificação:', notificationError);
          
          // Fallback para som se a notificação falhar
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 1.0;
            audio.play().catch(e => console.log('Erro no fallback de som:', e));
          } catch (audioError) {
            console.error('Fallback de áudio também falhou:', audioError);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
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
      localStorage.setItem('appTreino_restTimerStart', now.toString());
      localStorage.setItem('appTreino_restTimerDuration', intDuration.toString());
      localStorage.setItem('appTreino_restTimerEnd', restTimerEndRef.current.toString());
      localStorage.setItem('appTreino_backgroundTimestamp', '0');
    }
    
    // Salvar o estado após iniciar o temporizador de descanso
    saveTimersState();
  };

  useEffect(() => {
    // Verificar áudio a cada segundo para superar limitações do iOS
    if (isIOS && typeof window !== 'undefined') {
      // Intervalo para verificar se o áudio deve tocar
      const audioCheckInterval = setInterval(() => {
        try {
          const notificationTimeStr = localStorage.getItem('appTreino_audioNotificationTime');
          if (notificationTimeStr) {
            const notificationTime = parseInt(notificationTimeStr);
            const now = Date.now();
            
            // Verificar se está na hora de tocar o áudio
            if (now >= notificationTime) {
              console.log('Hora de tocar o áudio de notificação!');
              playBackgroundNotificationSound();
              
              // Limpar o timestamp após tocar
              localStorage.removeItem('appTreino_audioNotificationTime');
            }
          }
        } catch (error) {
          console.error('Erro ao verificar tempo de áudio:', error);
        }
      }, 1000);
      
      return () => {
        clearInterval(audioCheckInterval);
      };
    }
  }, [isIOS]);

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
                          <input
                            type="number"
                            min="0"
                            max={currentExercise.reps}
                            value={repsCompleted}
                            onChange={handleRepsChange}
                            className="w-16 h-10 px-2 rounded-md border border-gray-300 text-center font-bold text-blue-700 text-xl"
                          />
                          <span className="ml-2 text-gray-500">/ {currentExercise.reps}</span>
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
                    
                    <div className="flex justify-center">
                      {currentExerciseIndex < exercises.length - 1 && (
                        <button 
                          onClick={skipExercise}
                          className="px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow transition-all text-sm"
                        >
                          Pular Exercício
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {currentExercise.time && (
                  <div className="mb-6 flex flex-col items-center">
                    <div className="w-48 h-48 rounded-full bg-blue-50 border-8 border-blue-100 flex flex-col items-center justify-center mb-4">
                      <span className="text-4xl font-bold text-blue-700">{timeRemaining}</span>
                      <span className="text-gray-500">segundos</span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full justify-center items-center">
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
                      
                      {currentExerciseIndex < exercises.length - 1 && (
                        <button 
                          onClick={skipExercise}
                          className="px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow transition-all text-sm"
                        >
                          Pular Exercício
                        </button>
                      )}
                    </div>
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