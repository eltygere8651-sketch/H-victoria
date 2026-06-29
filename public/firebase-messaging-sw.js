// Import scripts for Firebase
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// ====================================================================================
// CONFIGURACIÓN DE FIREBASE
// ====================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyC_307oqtFzOMggDIzv0o0loFvLc-Xhg8A",
  authDomain: "flux-player-82c1c.firebaseapp.com",
  projectId: "flux-player-82c1c",
  storageBucket: "flux-player-82c1c.firebasestorage.app",
  messagingSenderId: "707903273084",
  appId: "1:707903273084:web:494c1262291b024b45b1f9"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 1. MANEJO DE MENSAJES EN SEGUNDO PLANO
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Mensaje en background recibido:", payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/favicon.svg", // Asegúrate de que este archivo sea accesible
    badge: "/favicon.svg",
    vibrate: [200, 100, 200, 100, 200], // Patrón de vibración: vibra-pausa-vibra...
    requireInteraction: true, // La notificación se queda hasta que el usuario interactúa
    tag: 'hub-notification', // Agrupa notificaciones similares
    renotify: true, // Vuelve a vibrar si llega una nueva con el mismo tag
    // Datos adicionales para manejar la navegación al hacer clic
    data: {
      url: self.registration.scope
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 3. MANEJO DE FETCH (REQUERIDO PARA PWA INSTALLABILITY)
self.addEventListener('fetch', (event) => {
  // Pass-through fetch handler to satisfy PWA requirements
  event.respondWith(fetch(event.request).catch(() => new Response("Offline")));
});
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notificación clickeada.');
  
  // Cierra la notificación
  event.notification.close();

  // Intenta abrir la ventana de la app o enfocarla si ya está abierta
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(windowClients) {
      // Si hay una ventana abierta, enfócala
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf('/') !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abre una nueva
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});