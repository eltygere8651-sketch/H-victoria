import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// La configuración de Firebase está ahora directamente en el código para asegurar la compatibilidad
// con entornos que no usan un proceso de build (como el que causa el error).
// Estos valores son una copia de los que ya estaban en `public/firebase-messaging-sw.js`.
const firebaseConfig = {
  apiKey: "AIzaSyD_rwoYEzfFo8b4b_KQCNQs3OwwlScPNls",
  authDomain: "bm-contigo-a8ca6.firebaseapp.com",
  projectId: "bm-contigo-a8ca6",
  storageBucket: "bm-contigo-a8ca6.appspot.com",
  messagingSenderId: "865361841368",
  appId: "1:865361841368:web:f74b2f3070b75b7230dbad"
};

// Valida que todas las variables de entorno estén presentes
if (Object.values(firebaseConfig).some(value => !value)) {
  console.error("Firebase config is missing or incomplete. Check your .env file or Vercel environment variables.");
}

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const app = firebase.app();
export const db = firebase.firestore();
export const auth = firebase.auth();
export const storage = firebase.storage();

// Habilitar la persistencia offline de Firestore
try {
  db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firebase persistence failed: multiple tabs open. Offline features might be limited.');
      } else if (err.code === 'unimplemented') {
        console.warn('Firebase persistence is not available in this browser. The app will not work offline.');
      }
    });
} catch (error) {
  console.error("Could not enable Firestore persistence", error);
}
