// Import scripts for Firebase
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// This config is copied from firebaseConfig.ts.
// It's necessary for the service worker to initialize Firebase in the background.
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
  const iconDataUri = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIyIiByeT0iMjIiIGZpbGw9IiNkYzI2MjYiLz48cGF0aCBkPSJNMzAgMzUgTDUwIDc1IEw3MCAzNSBINTggTDUwIDUxIEw0MiAzNSBaIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+";
  
  const notificationOptions = {
    body: payload.notification.body,
    icon: iconDataUri,
    badge: iconDataUri,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
