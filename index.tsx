import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- NEW SERVICE WORKER REGISTRATION LOGIC ---
// Manually register the service worker, but add a check for the sandboxed environment.
const isSandboxed = window.location.origin.includes('usercontent.goog');

if ('serviceWorker' in navigator && !isSandboxed) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully with scope:', registration.scope);
      }).catch(err => {
        console.error('Service Worker registration failed:', err);
      });
  });
} else if (isSandboxed) {
  console.warn("Service Worker registration is disabled in the Google AI Studio sandbox environment. Push notifications with the app closed will not work here, but will work when deployed to a standard hosting service like Vercel.");
}
// --- END OF NEW LOGIC ---

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);