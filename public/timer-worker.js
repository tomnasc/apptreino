// Web Worker para gerenciar timers em segundo plano
let timers = {};

self.onmessage = function(e) {
  const { action, id, duration } = e.data;
  
  switch (action) {
    case 'start':
      // Registrar o horário de início
      const startTime = Date.now();
      const endTime = startTime + (duration * 1000);
      
      // Limpar qualquer timer existente com o mesmo ID
      if (timers[id]) {
        clearInterval(timers[id].interval);
      }
      
      // Criar um novo timer
      timers[id] = {
        startTime,
        endTime,
        remaining: duration,
        interval: setInterval(() => {
          const now = Date.now();
          const remaining = Math.ceil((endTime - now) / 1000);
          
          // Enviar atualização para o cliente
          self.postMessage({
            id,
            remaining: Math.max(0, remaining),
            type: 'tick'
          });
          
          // Se o timer acabou, limpá-lo
          if (remaining <= 0) {
            clearInterval(timers[id].interval);
            delete timers[id];
            
            self.postMessage({
              id,
              type: 'complete'
            });
          }
        }, 1000)
      };
      
      break;
      
    case 'stop':
      // Parar um timer existente
      if (timers[id]) {
        clearInterval(timers[id].interval);
        delete timers[id];
        
        self.postMessage({
          id,
          type: 'stopped'
        });
      }
      break;
      
    case 'get':
      // Retornar o tempo restante para um timer
      if (timers[id]) {
        const now = Date.now();
        const remaining = Math.ceil((timers[id].endTime - now) / 1000);
        
        self.postMessage({
          id,
          remaining: Math.max(0, remaining),
          type: 'info'
        });
      } else {
        self.postMessage({
          id,
          remaining: 0,
          type: 'info'
        });
      }
      break;
  }
}; 