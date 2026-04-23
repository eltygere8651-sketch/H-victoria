import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SpeechProvider } from './context/SpeechContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <SpeechProvider>
          <App />
        </SpeechProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Registro de Service Worker para capacidad de descarga (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => console.log('HubOS SW Ready:', reg.scope))
      .catch(err => console.log('SW Error:', err));
  });
}
