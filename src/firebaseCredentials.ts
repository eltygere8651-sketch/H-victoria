/**
 * ====================================================================================
 * CENTRALIZED FIREBASE CONFIGURATION
 * ====================================================================================
 * This file centralizes all Firebase credentials. This approach was chosen for
 * compatibility with execution environments that do not support build-time
 * environment variables (like import.meta.env).
 *
 * The values here are copied from the project's README and other files.
 * The service worker in `public/firebase-messaging-sw.js` also needs these values
 * copied manually. If you change them here, change them there too.
 * ====================================================================================
 */
export const firebaseConfig = {
  apiKey: "AIzaSyD_rwoYEzfFo8b4b_KQCNQs3OwwlScPNls",
  authDomain: "bm-contigo-a8ca6.firebaseapp.com",
  projectId: "bm-contigo-a8ca6",
  storageBucket: "bm-contigo-a8ca6.appspot.com",
  messagingSenderId: "865361841368",
  appId: "1:865361841368:web:f74b2f3070b75b7230dbad"
};


/**
 * ====================================================================================
 * ACTION REQUIRED: VAPID KEY FOR PUSH NOTIFICATIONS
 * ====================================================================================
 * Push notifications require a VAPID key from your Firebase project.
 *
 * TO ENABLE PUSH NOTIFICATIONS:
 * 1. Go to your Firebase project settings.
 * 2. Navigate to the "Cloud Messaging" tab.
 * 3. Under "Web configuration", find the "Web Push certificates" section.
 * 4. Copy your key pair value.
 * 5. Replace the empty string below with your key.
 * ====================================================================================
 */
export const VAPID_KEY = 'BGqFBv56gYXrK319J3D8i9u45AlbNA5g1IEDS94C8B2w_QWFpmHSv-97FYcdseP2lYrqx5M7olVRcLlf3IQfKX8';