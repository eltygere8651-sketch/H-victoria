// FIX: Use compat library to resolve initializeApp import error and align with sw.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD_rwoYEzfFo8b4b_KQCNQs3OwwlScPNls",
  authDomain: "bm-contigo-a8ca6.firebaseapp.com",
  projectId: "bm-contigo-a8ca6",
  storageBucket: "bm-contigo-a8ca6.appspot.com", // Corrected storage bucket URL
  messagingSenderId: "865361841368",
  appId: "1:865361841368:web:f74b2f3070b75b7230dbad"
};

// Initialize Firebase
// FIX: Use compat initialization. Check if app is already initialized.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const app = firebase.app();
export const db = firebase.firestore();
export const auth = firebase.auth();
export const storage = firebase.storage();

// Habilitar la persistencia offline de Firestore
// Esto permite que la aplicación funcione sin conexión y sincronice los datos cuando se restablezca la conexión.
// synchronizeTabs: true asegura una experiencia consistente si el usuario abre la app en múltiples pestañas.
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Esto suele ocurrir si hay múltiples pestañas abiertas. La persistencia se habilitará en una sola.
      console.warn('Firebase persistence failed: multiple tabs open. Offline features might be limited.');
    } else if (err.code === 'unimplemented') {
      // El navegador actual no soporta la persistencia (ej. modo incógnito en algunos navegadores).
      console.warn('Firebase persistence is not available in this browser. The app will not work offline.');
    }
  });
