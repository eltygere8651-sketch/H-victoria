
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

async function run() {
  try {
    console.log('Signing in anonymously...');
    await auth.signInAnonymously();
    console.log('Signed in.');

    const hallData = {
      name: 'Restaurante',
      capacity: '100',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      setupGuides: []
    };

    console.log('Adding hall...');
    const docRef = await db.collection('hotel_victoria_event_halls').add(hallData);
    console.log('Added hall with ID:', docRef.id);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
