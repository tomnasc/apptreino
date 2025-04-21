import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import Layout from './Layout';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Importe o YouTube dinamicamente para evitar problemas de SSR
const YouTube = dynamic(() => import('react-youtube'), { ssr: false });

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
  const [repsCompleted, setRepsCompleted] = useState(''); 
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
  const wakeLockRef = useRef(null); 
  const isSubmittingRef = useRef(false);

  // Adicionar timerRef para controlar o timer
  const timerRef = useRef(null);
  // Referência para o timer de exercício
  const exerciseTimerRef = useRef(null);

  // Calculamos o objeto de exercício atual com base no índice
  const currentExercise = exercises[currentExerciseIndex] || null;
  
  // Adicionar estado para o modal de erro
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  
  // ... resto do código original (formatTime, showErrorMessageModal, etc.) ...

  // Formatação de tempo para exibição
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Função para mostrar modal de erro personalizado
  const showErrorMessageModal = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
    setIsRecovering(false);
  };
  
  // Extração de ID de vídeo do YouTube
  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    
    return match ? match[1] : null;
  };

  // ... resto do código

  // Função específica para verificar o alerta de aumento de carga
  const checkWeightIncrease = (exerciseKey, reps) => {
    // Verificar se deve mostrar o alerta de aumentar carga
    // Somente se:
    // 1. Estamos na última série do exercício
    // 2. O usuário atingiu o número alvo de repetições em TODAS as séries deste exercício
    if (
      currentExercise?.reps && 
      typeof currentExercise?.sets !== 'undefined' && 
      currentExercise?.sets !== null &&
      currentSetIndex === (currentExercise?.sets || 1) - 1
    ) {
      // Verificar se todas as séries atingiram o número alvo de repetições
      const updatedSetRepsHistory = { ...setRepsHistory };
      if (!updatedSetRepsHistory[exerciseKey]) {
        updatedSetRepsHistory[exerciseKey] = [];
      }
      updatedSetRepsHistory[exerciseKey][currentSetIndex] = reps;
      
      const allSeriesCompleted = updatedSetRepsHistory[exerciseKey].length === currentExercise?.sets;
      const allSeriesReachedTarget = allSeriesCompleted && 
        updatedSetRepsHistory[exerciseKey].every(reps => reps >= currentExercise?.reps);
      
      if (allSeriesReachedTarget) {
        setShowWeightIncreaseAlert(true);
      }
    }
  }

  // ... resto do código

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
      
      {/* Conteúdo do treino */}
      <div className="space-y-6">
        {/* Cabeçalho com botões de ação */}
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

        {/* Restante do componente... */}
      </div>
    </Layout>
  );
} 