// Import scripts for Firebase
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// ====================================================================================
// IMPORTANTE: CONFIGURACIÓN MANUAL
// ====================================================================================
// El Service Worker se ejecuta en un entorno separado y no puede acceder
// a las variables de entorno (VITE_...) de la aplicación principal.
// Debes asegurarte de que esta configuración de Firebase esté COPIADA EXACTAMENTE
// desde tus variables de entorno o tu archivo .env.local.
// Si cambias las claves en tu app, ¡debes actualizarlas aquí también!
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

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  const notificationTitle = payload.notification.title;
  const iconDataUri = "/favicon.svg";
  
  const notificationOptions = {
    body: payload.notification.body,
    icon: iconDataUri,
    badge: iconDataUri,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});