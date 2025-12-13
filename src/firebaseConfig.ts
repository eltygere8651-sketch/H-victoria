import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { firebaseConfig } from './firebaseCredentials';

// Valida que todas las variables de entorno estén presentes
if (Object.values(firebaseConfig).some(value => !value)) {
  console.error("Firebase config is missing or incomplete. Check your firebaseCredentials.ts file.");
}

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const app = firebase.app();
export const db = firebase.firestore();
export const auth = firebase.auth();
export const storage = firebase.storage();

// Fix: Enable experimentalForceLongPolling to handle network issues.
// Removed invalid 'merge' property which caused build errors.
db.settings({
  experimentalForceLongPolling: true,
});

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