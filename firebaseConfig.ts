import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD_rwoYEzfFo8b4b_KQCNQs3OwwlScPNls",
  authDomain: "bm-contigo-a8ca6.firebaseapp.com",
  projectId: "bm-contigo-a8ca6",
  storageBucket: "bm-contigo-a8ca6.firebasestorage.app",
  messagingSenderId: "865361841368",
  appId: "1:865361841368:web:f74b2f3070b75b7230dbad"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);