// Service Worker para gerenciar temporizadores em segundo plano
const CACHE_NAME = 'treinopro-timer-cache-v1';

// Variáveis para controlar os temporizadores
let exerciseTimer = null;
let restTimer = null;
let exerciseTimeRemaining = 0;
let restTimeRemaining = 0;
let lastHeartbeat = Date.now();
let isTimerActive = false;
let isRestTimerActive = false;

// Eventos do Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativado');
  return self.clients.claim();
});

// Função para enviar mensagem para todos os clientes
const sendMessageToClients = async (message) => {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  allClients.forEach(client => {
    client.postMessage(message);
  });
};

// Iniciar timer de exercício em segundo plano
const startExerciseTimer = (duration) => {
  if (exerciseTimer) {
    clearInterval(exerciseTimer);
  }
  
  exerciseTimeRemaining = duration;
  isTimerActive = true;
  
  exerciseTimer = setInterval(() => {
    exerciseTimeRemaining -= 0.1;
    
    // Verificar se o timer terminou
    if (exerciseTimeRemaining <= 0) {
      clearInterval(exerciseTimer);
      exerciseTimer = null;
      exerciseTimeRemaining = 0;
      isTimerActive = false;
      
      // Notificar clientes que o timer terminou
      sendMessageToClients({
        type: 'TIMER_COMPLETE',
        timer: 'exercise'
      });
    } else {
      // Notificar clientes sobre a atualização do tempo
      sendMessageToClients({
        type: 'TIMER_UPDATE',
        data: {
          timeRemaining: exerciseTimeRemaining,
          restTimeRemaining
        }
      });
    }
  }, 100);
};

// Iniciar timer de descanso em segundo plano
const startRestTimer = (duration) => {
  if (restTimer) {
    clearInterval(restTimer);
  }
  
  restTimeRemaining = duration;
  isRestTimerActive = true;
  
  restTimer = setInterval(() => {
    restTimeRemaining -= 0.1;
    
    // Verificar se o timer terminou
    if (restTimeRemaining <= 0) {
      clearInterval(restTimer);
      restTimer = null;
      restTimeRemaining = 0;
      isRestTimerActive = false;
      
      // Notificar clientes que o timer terminou
      sendMessageToClients({
        type: 'TIMER_COMPLETE',
        timer: 'rest'
      });
    } else {
      // Notificar clientes sobre a atualização do tempo
      sendMessageToClients({
        type: 'TIMER_UPDATE',
        data: {
          timeRemaining: exerciseTimeRemaining,
          restTimeRemaining
        }
      });
    }
  }, 100);
};

// Parar todos os timers
const stopAllTimers = () => {
  if (exerciseTimer) {
    clearInterval(exerciseTimer);
    exerciseTimer = null;
  }
  
  if (restTimer) {
    clearInterval(restTimer);
    restTimer = null;
  }
  
  exerciseTimeRemaining = 0;
  restTimeRemaining = 0;
  isTimerActive = false;
  isRestTimerActive = false;
};

// Verificar se o cliente está ativo a cada 30 segundos
setInterval(() => {
  const now = Date.now();
  // Se não recebeu um heartbeat nos últimos 60 segundos, parar os timers
  if (now - lastHeartbeat > 60000) {
    stopAllTimers();
  }
}, 30000);

// Processar mensagens da página
self.addEventListener('message', (event) => {
  const message = event.data;
  
  if (message.type === 'HEARTBEAT') {
    // Atualizar o timestamp do último heartbeat
    lastHeartbeat = Date.now();
    
    // Atualizar o estado dos temporizadores se necessário
    if (message.data.timerActive && message.data.timeRemaining > 0) {
      if (!isTimerActive || Math.abs(exerciseTimeRemaining - message.data.timeRemaining) > 1) {
        startExerciseTimer(message.data.timeRemaining);
      }
    } else if (!message.data.timerActive && isTimerActive) {
      if (exerciseTimer) {
        clearInterval(exerciseTimer);
        exerciseTimer = null;
      }
      isTimerActive = false;
    }
    
    if (message.data.restTimerActive && message.data.restTimeRemaining > 0) {
      if (!isRestTimerActive || Math.abs(restTimeRemaining - message.data.restTimeRemaining) > 1) {
        startRestTimer(message.data.restTimeRemaining);
      }
    } else if (!message.data.restTimerActive && isRestTimerActive) {
      if (restTimer) {
        clearInterval(restTimer);
        restTimer = null;
      }
      isRestTimerActive = false;
    }
  } else if (message.type === 'START_EXERCISE_TIMER') {
    startExerciseTimer(message.duration);
  } else if (message.type === 'START_REST_TIMER') {
    startRestTimer(message.duration);
  } else if (message.type === 'STOP_ALL_TIMERS') {
    stopAllTimers();
  }
}); 