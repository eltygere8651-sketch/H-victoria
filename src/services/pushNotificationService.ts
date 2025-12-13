import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';
import * as storageService from './storageService';
import { User } from '../types';
import { VAPID_KEY } from '../firebaseCredentials';

let messagingInstance: firebase.messaging.Messaging | null = null;

export const initializePushNotifications = async (user: User) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Las notificaciones push no son compatibles con este navegador.');
    return;
  }

  if (!VAPID_KEY) {
    console.error("La VAPID key no está configurada en `firebaseCredentials.ts`. Las notificaciones push no funcionarán.");
    return;
  }

  try {
    const messaging = firebase.messaging();
    messagingInstance = messaging;
    
    // Pide permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Permiso para notificaciones concedido.');

      // Wait for our manually registered service worker to be ready.
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker is ready. Using it for FCM token.');

      // Obtiene el token de registro del dispositivo
      const currentToken = await messaging.getToken({
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      
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
  messagingInstance.onMessage((payload) => {
    console.log('Mensaje recibido en primer plano: ', payload);
    // Muestra una notificación del navegador para consistencia
    new Notification(payload.notification?.title || 'Nueva Notificación', {
      body: payload.notification?.body,
      icon: '/favicon.svg'
    });
  });
};