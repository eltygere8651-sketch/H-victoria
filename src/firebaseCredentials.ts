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
  apiKey: "AIzaSyC_307oqtFzOMggDIzv0o0loFvLc-Xhg8A",
  authDomain: "flux-player-82c1c.firebaseapp.com",
  projectId: "flux-player-82c1c",
  storageBucket: "flux-player-82c1c.firebasestorage.app",
  messagingSenderId: "707903273084",
  appId: "1:707903273084:web:494c1262291b024b45b1f9"
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