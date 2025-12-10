// Import scripts for Firebase
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// ====================================================================================
// CONFIGURACIÓN DE FIREBASE
// ====================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyD_rwoYEzfFo8b4b_KQCNQs3OwwlScPNls",
  authDomain: "bm-contigo-a8ca6.firebaseapp.com",
  projectId: "bm-contigo-a8ca6",
  storageBucket: "bm-contigo-a8ca6.appspot.com",
  messagingSenderId: "865361841368",
  appId: "1:865361841368:web:f74b2f3070b75b7230dbad"
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
    // Datos adicionales para manejar la navegación al hacer clic
    data: {
      url: self.registration.scope
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 2. MANEJO DEL CLIC EN LA NOTIFICACIÓN (CRÍTICO PARA APP CERRADA)
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