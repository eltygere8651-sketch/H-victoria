
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function addRestaurante() {
  try {
    await signInAnonymously(auth);
    console.log('Signed in anonymously');
    
    const hallRef = collection(db, 'hotel_victoria_event_halls');
    await addDoc(hallRef, {
      name: 'Restaurante',
      capacity: '100',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      setupGuides: []
    });
    console.log('Restaurante hall added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error adding hall:', error);
    process.exit(1);
  }
}

addRestaurante();
