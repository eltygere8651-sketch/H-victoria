import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';
import * as storageService from './storageService';
import { User } from '../types';

// ====================================================================================
// IMPORTANTE: CONFIGURACIÓN MANUAL REQUERIDA
// ====================================================================================
// Reemplaza "TU_VAPID_KEY_AQUI" con la clave VAPID de tu proyecto de Firebase
// para que las notificaciones push funcionen correctamente.
// Puedes encontrar esta clave en tu Consola de Firebase:
// Engranaje (Ajustes) > Configuración del proyecto > Cloud Messaging > Certificados de notificaciones push web.
// ====================================================================================
const VAPID_KEY = "TU_VAPID_KEY_AQUI";

// FIX: Use compat messaging type
let messagingInstance: firebase.messaging.Messaging | null = null;

export const initializePushNotifications = async (user: User) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Las notificaciones push no son compatibles con este navegador.');
    return;
  }

  if (!VAPID_KEY || VAPID_KEY === "TU_VAPID_KEY_AQUI") {
    console.error("VAPID_KEY no está configurada en services/pushNotificationService.ts. Las notificaciones push no funcionarán.");
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
      icon: '/favicon.svg'
    });
  });
};
