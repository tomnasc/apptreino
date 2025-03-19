// Service Worker para notificações push
self.addEventListener('install', function(event) {
  console.log('Service Worker instalado com sucesso');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker ativado com sucesso');
  return self.clients.claim();
});

// Lidar com notificações push
self.addEventListener('push', function(event) {
  console.log('Push recebido:', event);

  let title = 'Descanso Finalizado!';
  let options = {
    body: 'Hora de começar a próxima série',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'rest-timer',
    renotify: true,
    requireInteraction: true,
    data: {
      url: self.location.origin + '/workout-mode'
    }
  };

  // Extrair dados da mensagem push, se disponíveis
  if (event.data) {
    try {
      const data = event.data.json();
      if (data.title) title = data.title;
      if (data.body) options.body = data.body;
    } catch (e) {
      console.error('Erro ao processar dados da notificação push:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Lidar com cliques em notificações
self.addEventListener('notificationclick', function(event) {
  console.log('Notificação clicada:', event);
  
  event.notification.close();
  
  // Focar na janela do aplicativo ou abri-la se estiver fechada
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      // Se já houver uma janela aberta, focar nela
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      
      // Se não houver janela aberta, abrir uma nova
      if (clients.openWindow) {
        const url = event.notification.data?.url || self.location.origin;
        return clients.openWindow(url);
      }
    })
  );
}); 