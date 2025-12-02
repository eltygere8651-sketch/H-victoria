import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- NEW SERVICE WORKER REGISTRATION LOGIC ---
// Manually register the service worker to ensure it's available for FCM.
// This is more robust than relying on Firebase's implicit registration.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully with scope:', registration.scope);
      }).catch(err => {
        console.error('Service Worker registration failed:', err);
      });
  });
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
