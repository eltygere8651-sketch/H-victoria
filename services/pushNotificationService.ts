// FIX: Use Firebase compat libraries for consistency
import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';
import * as storageService from './storageService';
import { User } from '../types';

// Clave pública VAPID de Firebase Cloud Messaging.
const VAPID_KEY = "BGqFBv56gYXrK319J3D8i9u45AlbNA5g1IEDS94C8B2w_QWFpmHSv-97FYcdseP2lYrqx5M7olVRcLlf3IQfKX8";

// FIX: Use compat messaging type
let messagingInstance: firebase.messaging.Messaging | null = null;

export const initializePushNotifications = async (user: User) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Las notificaciones push no son compatibles con este navegador.');
    return;
  }

  try {
    // FIX: Use compat messaging
    const messaging = firebase.messaging();
    messagingInstance = messaging;
    
    // Pide permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Permiso para notificaciones concedido.');

      // --- NEW ROBUST METHOD ---
      // Wait for our manually registered service worker to be ready.
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker is ready. Using it for FCM token.');

      // Obtiene el token de registro del dispositivo, explicitly using our SW registration
      const currentToken = await messaging.getToken({
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration, // Explicitly provide the registration
      });
      // --- END OF NEW METHOD ---
      
      if (currentToken) {
        console.log('Token FCM obtenido:', currentToken);
        // Guarda el token en Firestore si es nuevo o ha cambiado
        if (user.pushToken !== currentToken) {
          await storageService.savePushToken(user.id, currentToken);
        }
      } else {
        console.log('No se pudo obtener el token. Se necesita permiso para generarlo.');
      }
    } else {
      console.warn('Permiso para notificaciones denegado.');
    }
  } catch (error) {
    console.error('Error al inicializar las notificaciones push.', error);
  }

  if (!messagingInstance) return;

  // Opcional: Escucha mensajes mientras la app está en primer plano
  // FIX: Use compat onMessage method
  messagingInstance.onMessage((payload) => {
    console.log('Mensaje recibido en primer plano: ', payload);
    // Muestra una notificación del navegador para consistencia
    new Notification(payload.notification?.title || 'Nueva Notificación', {
      body: payload.notification?.body,
      icon: '/logo192.png' // Asegúrate de tener este ícono en tu carpeta pública
    });
  });
};
