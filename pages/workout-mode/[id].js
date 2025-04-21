import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from '../../components/Layout';
import Head from 'next/head';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
  const [customWeight, setCustomWeight] = useState('');
  const [showLoadDecreaseAlert, setShowLoadDecreaseAlert] = useState(false);
  const [showLoadIncreaseAlert, setShowLoadIncreaseAlert] = useState(false);
  const [exerciseTimerActive, setExerciseTimerActive] = useState(false);
  const [exerciseTimeRemaining, setExerciseTimeRemaining] = useState(0);
  const [wakeLock, setWakeLock] = useState(null);
  
  // Estado para armazenar o histórico de pesos dos exercícios
  const [weightHistory, setWeightHistory] = useState({});
  
  // Referências para timers
  const restTimerRef = useRef(null);
  const exerciseTimerRef = useRef(null);
  
  // Referência para o WakeLock
  const wakeLockRef = useRef(null);
  
  // Calculamos o objeto de exercício atual com base no índice
  const currentExercise = exercises[currentExerciseIndex] || null;

  // Estado para o input de peso
  const [weightInput, setWeightInput] = useState('');
  
  // Verificar se existe um treino em andamento para esta lista quando a página carrega
  useEffect(() => {
    if (id && user) {
      fetchWorkoutList();
      fetchExercises();
      checkExistingSession();
    }
  }, [id, user]);

  // Carregar histórico de pesos do localStorage
  useEffect(() => {
    try {
      const savedWeightHistory = localStorage.getItem('weightHistory');
      if (savedWeightHistory) {
        setWeightHistory(JSON.parse(savedWeightHistory));
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de pesos:', error);
    }
  }, []);

  // Efeito para iniciar o wakeLock quando o treino estiver ativo
  useEffect(() => {
    if (isWorkoutActive) {
      requestWakeLock();
    }
    
    return () => {
      releaseWakeLock();
    };
  }, [isWorkoutActive]);

  // Adquirir WakeLock quando a página carrega
  useEffect(() => {
    if (id) {
      acquireWakeLock();
    }
    
    // Liberar WakeLock quando o componente é desmontado
    return () => {
      releaseWakeLock();
    };
  }, [id]);

  // Função para solicitar o WakeLock (manter tela acesa)
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        
        lock.addEventListener('release', () => {
          console.log('Tela pode adormecer novamente');
          setWakeLock(null);
        });
        
        console.log('WakeLock ativo - tela permanecerá acesa');
      } catch (err) {
        console.error(`Erro ao ativar WakeLock: ${err.name}, ${err.message}`);
      }
    } else {
      console.warn('WakeLock API não disponível neste navegador');
    }
  };
  
  // Função para liberar o WakeLock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('WakeLock liberado');
      } catch (err) {
        console.error('Erro ao liberar WakeLock:', err);
      }
    }
  };

  // Função para adquirir o WakeLock
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('WakeLock adquirido');
        
        // Reativar o WakeLock quando o documento volta a ficar visível
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible' && !wakeLockRef.current) {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            console.log('WakeLock reativado');
          }
        });
      } else {
        console.log('WakeLock API não suportada neste navegador');
      }
    } catch (err) {
      console.error('Erro ao adquirir WakeLock:', err);
    }
  };
  
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

  // Efeito para gerenciar o timer de descanso
  useEffect(() => {
    if (restTimerActive && restTimeRemaining > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current);
            setRestTimerActive(false);
            playAlertSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (restTimeRemaining <= 0 && restTimerRef.current) {
      clearInterval(restTimerRef.current);
      setRestTimerActive(false);
    }
    
    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
    };
  }, [restTimerActive, restTimeRemaining]);
  
  // Efeito para gerenciar o timer de exercício baseado em tempo
  useEffect(() => {
    if (exerciseTimerActive && exerciseTimeRemaining > 0) {
      exerciseTimerRef.current = setInterval(() => {
        setExerciseTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(exerciseTimerRef.current);
            setExerciseTimerActive(false);
            playAlertSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (exerciseTimeRemaining <= 0 && exerciseTimerRef.current) {
      clearInterval(exerciseTimerRef.current);
      setExerciseTimerActive(false);
    }
    
    return () => {
      if (exerciseTimerRef.current) {
        clearInterval(exerciseTimerRef.current);
      }
    };
  }, [exerciseTimerActive, exerciseTimeRemaining]);

  // Função para tocar um som de alerta quando o timer terminar
  const playAlertSound = () => {
    try {
      const audio = new Audio('/beep.mp3');
      audio.play();
    } catch (error) {
      console.error('Erro ao tocar som:', error);
    }
  };
  
  // Iniciar o cronômetro para exercícios baseados em tempo
  const startExerciseTimer = () => {
    if (currentExercise?.time) {
      setExerciseTimeRemaining(currentExercise.time);
      setExerciseTimerActive(true);
    }
  };
  
  // Reiniciar o cronômetro para exercícios baseados em tempo
  const resetExerciseTimer = () => {
    setExerciseTimerActive(false);
    if (currentExercise?.time) {
      setExerciseTimeRemaining(currentExercise.time);
    }
  };

  // Função para marcar uma série como concluída
  const completeSet = async () => {
    if (!currentExercise) return;
    
    try {
      // Verificar se é necessário mostrar alertas de carga
      if (currentExercise.reps) {
        const reps = parseInt(repsCompleted);
        
        // Se fez 6 ou menos repetições, mostrar alerta para diminuir a carga
        if (reps <= 6 && reps > 0) {
          setShowLoadDecreaseAlert(true);
          setTimeout(() => setShowLoadDecreaseAlert(false), 5000);
        }
      }
      
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
      
      // Salvar o peso customizado se foi alterado
      const weightToSave = customWeight !== '' ? parseFloat(customWeight) : currentExercise.weight;
      
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
            weight: weightToSave || 0
          }
        ]);
      
      // Verificar se todas as séries foram concluídas com o número máximo de repetições
      if (currentExercise.reps && 
          currentSetIndex === currentExercise.sets - 1 && 
          updatedCompletedSets[exerciseKey].length === currentExercise.sets) {
        
        // Verificar se todas as séries atingiram o número máximo de repetições
        const allMaxReps = updatedCompletedSets[exerciseKey].every((_, idx) => {
          const setDetails = { reps_completed: parseInt(repsCompleted) }; // Para a série atual
          return setDetails.reps_completed >= currentExercise.reps;
        });
        
        if (allMaxReps) {
          setShowLoadIncreaseAlert(true);
          setTimeout(() => setShowLoadIncreaseAlert(false), 5000);
        }
      }
      
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
      
      // Limpar campos
      setRepsCompleted('');
      setCustomWeight('');
      setExerciseTimerActive(false);
      
      // Iniciar timer de descanso
      if (currentExercise.rest_time) {
        setRestTimeRemaining(currentExercise.rest_time);
        setRestTimerActive(true);
      }
    } catch (error) {
      console.error('Erro ao completar série:', error);
    }
  };

  // Função para verificar se o botão de concluir deve estar ativo
  const isCompleteButtonActive = () => {
    if (!currentExercise) return false;
    
    if (currentExercise.reps) {
      // Exercícios baseados em repetições precisam ter um valor no campo
      return repsCompleted !== '';
    } else if (currentExercise.time) {
      // Exercícios baseados em tempo precisam ter o timer finalizado
      return exerciseTimeRemaining === 0 || !exerciseTimerActive;
    }
    
    return false;
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

  // Pular para o próximo exercício
  const skipExercise = () => {
    if (currentExerciseIndex + 1 < exercises.length) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
      setRepsCompleted('');
      setCustomWeight('');
      
      // Reiniciar timer para exercícios baseados em tempo
      const nextExercise = exercises[currentExerciseIndex + 1];
      if (nextExercise && !nextExercise.reps && nextExercise.time) {
        setExerciseTimeRemaining(nextExercise.time);
        setExerciseTimerActive(false);
      }
    }
  };
  
  // Voltar para o exercício anterior
  const goToPreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setCurrentSetIndex(0);
      setRepsCompleted('');
      setCustomWeight('');
      
      // Reiniciar timer para exercícios baseados em tempo
      const prevExercise = exercises[currentExerciseIndex - 1];
      if (prevExercise && !prevExercise.reps && prevExercise.time) {
        setExerciseTimeRemaining(prevExercise.time);
        setExerciseTimerActive(false);
      }
    }
  };
  
  // Calcular o progresso total do treino
  const calculateProgress = () => {
    if (!exercises || exercises.length === 0) return 0;
    
    let totalSets = 0;
    let completedSetsCount = 0;
    
    exercises.forEach(exercise => {
      totalSets += exercise.sets;
      
      const key = `exercise_${exercise.id}`;
      const exCompletedSets = completedSets[key] || [];
      completedSetsCount += exCompletedSets.length;
    });
    
    return totalSets > 0 ? (completedSetsCount / totalSets) * 100 : 0;
  };
  
  // Estado para controlar a exibição do modal de vídeo
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // Função para atualizar o peso
  const handleWeightAdjustment = (newWeight) => {
    if (parseInt(newWeight) < 0 || isNaN(parseInt(newWeight))) {
      return;
    }
    
    setExercises(prevExercises => {
      const updatedExercises = [...prevExercises];
      const currentExIndex = currentExerciseIndex;
      
      updatedExercises[currentExIndex] = {
        ...updatedExercises[currentExIndex],
        weight: newWeight
      };
      
      return updatedExercises;
    });
  };

  // Função para lidar com a mudança de peso manualmente
  const handleWeightChange = (e) => {
    const value = e.target.value;
    // Permite apenas números e ponto decimal
    if (/^(\d*\.?\d*)$/.test(value) || value === '') {
      setWeightInput(value);
    }
  };
  
  // Função para atualizar o peso ao pressionar Enter ou ao perder o foco
  const updateWeight = () => {
    if (weightInput === '') return;
    
    const newWeight = parseFloat(weightInput);
    if (!isNaN(newWeight)) {
      setCustomWeight(newWeight.toString());
      handleWeightAdjustment(newWeight.toString());
      
      // Atualiza o histórico de pesos
      const updatedWeightHistory = {
        ...weightHistory,
        [currentExercise.id]: newWeight
      };
      setWeightHistory(updatedWeightHistory);
      localStorage.setItem('weightHistory', JSON.stringify(updatedWeightHistory));
    }
  };
  
  // Atualiza o input de peso quando o exercício muda
  useEffect(() => {
    if (currentExercise) {
      // Usar um valor padrão caso não haja peso salvo
      const savedWeight = weightHistory[currentExercise.id] || currentExercise.weight || 0;
      setCustomWeight(savedWeight.toString());
      setWeightInput(savedWeight.toString());
    }
  }, [currentExercise, weightHistory]);
  
  // Renderizar a interface
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Carregando treino...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }
  
  if (!currentExercise) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Nenhum exercício encontrado</h1>
        <button 
          onClick={() => router.push('/workouts')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Voltar para treinos
        </button>
      </div>
    );
  }
  
  const progress = calculateProgress();
  const exerciseKey = `exercise_${currentExercise.id}`;
  const completedForExercise = completedSets[exerciseKey] || [];
  
  // Função para renderizar o modal de vídeo do exercício
  const renderVideoModal = () => {
    if (!showVideoModal || !currentExercise?.videoUrl) return null;
    
    // Extrair o ID do vídeo da URL do YouTube
    const getYoutubeVideoId = (url) => {
      if (!url) return null;
      const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(regex);
      return match ? match[1] : null;
    };
    
    const videoId = getYoutubeVideoId(currentExercise.videoUrl);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
        <div className="relative w-full max-w-2xl bg-white rounded-lg overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">{currentExercise.name}</h3>
            <button 
              onClick={() => setShowVideoModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-0 aspect-video">
            {videoId ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={`${currentExercise.name} video`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video"
              ></iframe>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100">
                <p className="text-gray-500">URL de vídeo inválida</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Renderiza o controle de peso
  const renderWeightControl = () => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Peso (kg)
        </label>
        <div className="flex items-center">
          <input
            type="text"
            value={weightInput}
            onChange={handleWeightChange}
            onBlur={updateWeight}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                updateWeight();
                e.target.blur();
              }
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Digite o peso"
          />
        </div>
      </div>
    );
  };
  
  return (
    <>
      <Head>
        <title>Treino - {workoutList?.name || 'Carregando...'}</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-6">
          {/* Áudio de alerta */}
          <audio ref={alertAudioRef} src="/alert-sound.mp3" preload="auto"></audio>
          
          {/* Cabeçalho do treino */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">{workoutList?.name || 'Treino'}</h1>
            <div className="text-sm">
              Exercício {currentExerciseIndex + 1} de {exercises.length}
            </div>
          </div>
          
          {/* Barra de progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Alerta de carga */}
          {showLoadDecreaseAlert && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4">
              <p className="text-sm">Poucas repetições! Considere diminuir a carga.</p>
            </div>
          )}
          
          {showLoadIncreaseAlert && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 mb-4">
              <p className="text-sm">Você completou todas as séries com o máximo de repetições! Considere aumentar a carga no próximo treino.</p>
            </div>
          )}
          
          {/* Timer de descanso */}
          {restTimerActive && (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 rounded-r">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">Descanso</p>
                  <p className="text-2xl">{formatTime(restTimeRemaining)}</p>
                </div>
                <button 
                  onClick={() => setRestTimerActive(false)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm"
                >
                  Pular
                </button>
              </div>
            </div>
          )}
          
          {/* Card do exercício atual */}
          <div className="bg-white shadow-md rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-lg font-bold">{currentExercise.name}</h2>
                <p className="text-sm text-gray-600">{currentExercise.muscle_group}</p>
              </div>
              <button 
                onClick={() => setShowVideoModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Vídeo
              </button>
            </div>
            
            {/* Detalhes do exercício */}
            <div className="bg-gray-100 p-3 rounded-md mb-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Séries</p>
                  <p className="font-bold">
                    {completedForExercise.length}/{currentExercise.sets}
                  </p>
                </div>
                {currentExercise.time ? (
                  <div>
                    <p className="text-xs text-gray-500">Tempo</p>
                    <p className="font-bold">{formatTime(currentExercise.time)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500">Repetições</p>
                    <p className="font-bold">{currentExercise.reps || '-'}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Peso</p>
                  <p className="font-bold">{weightInput || '0'} kg</p>
                </div>
              </div>
            </div>
            
            {/* Controle de peso */}
            {renderWeightControl()}
            
            {/* Timer para exercícios baseados em tempo */}
            {currentExercise.time && (
              <div className="mb-4">
                <div className="text-center mb-2">
                  <p className="text-lg font-bold">{formatTime(exerciseTimeRemaining)}</p>
                </div>
                <div className="flex justify-center space-x-2">
                  {!exerciseTimerActive ? (
                    <button
                      onClick={startExerciseTimer}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                    >
                      Iniciar
                    </button>
                  ) : (
                    <button
                      onClick={() => setExerciseTimerActive(false)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
                    >
                      Pausar
                    </button>
                  )}
                  <button
                    onClick={resetExerciseTimer}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Reiniciar
                  </button>
                </div>
              </div>
            )}
            
            {/* Input de repetições para exercícios não baseados em tempo */}
            {!currentExercise.time && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repetições Realizadas:
                </label>
                <input
                  type="number"
                  value={repsCompleted}
                  onChange={(e) => setRepsCompleted(e.target.value)}
                  placeholder="Número de repetições"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            )}
            
            {/* Informação da série atual */}
            <div className="text-center mb-3">
              <p className="text-sm text-gray-600">
                Série atual: {currentSetIndex + 1} de {currentExercise.sets}
              </p>
            </div>
            
            {/* Botões de ação */}
            <div className="flex justify-between space-x-2">
              <button
                onClick={goToPreviousExercise}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-3 rounded text-sm"
              >
                Anterior
              </button>
              
              <button
                onClick={completeSet}
                disabled={!isCompleteButtonActive()}
                className={`flex-grow font-bold py-2 px-4 rounded ${
                  isCompleteButtonActive()
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Concluir
              </button>
              
              <button
                onClick={skipExercise}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-3 rounded text-sm"
              >
                Próximo
              </button>
            </div>
          </div>
          
          {/* Renderiza o modal de vídeo */}
          {renderVideoModal()}
          
          {/* Botão para finalizar treino */}
          <div className="mt-6 text-center">
            <button 
              onClick={() => router.push('/workouts')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2"
            >
              Sair do Treino
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Função para extrair o ID do vídeo do YouTube de uma URL
const getYoutubeVideoId = (url) => {
  if (!url) return null;
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[2].length === 11)
    ? match[2]
    : null;
};