import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { firebaseApp, firebaseMessagingConfig, hasFirebaseMessagingConfig } from './firebase';

const requiredFirebaseEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_VAPID_KEY',
] as const;

const assertFirebaseConfig = (): void => {
  if (!hasFirebaseMessagingConfig || !firebaseApp) {
    throw new Error('Push notifications are disabled: missing Firebase config.');
  }

  for (const key of requiredFirebaseEnv) {
    if (!import.meta.env[key]) {
      throw new Error(`Push notifications are disabled: missing ${key}`);
    }
  }
};

const registerMessagingServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }

  const encodedConfig = btoa(JSON.stringify(firebaseMessagingConfig));
  const swUrl = `/firebase-messaging-sw.js?config=${encodeURIComponent(encodedConfig)}`;
  return navigator.serviceWorker.register(swUrl);
};

export const requestPushPermission = async () => {
  assertFirebaseConfig();
  const app = firebaseApp;
  if (!app) {
    throw new Error('Push notifications are disabled: Firebase app is not initialized.');
  }

  if (!(await isSupported())) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted.');
  }

  const serviceWorkerRegistration = await registerMessagingServiceWorker();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration,
  });

  return token;
};

export const listenForMessages = (handler: (payload: unknown) => void) => {
  if (!hasFirebaseMessagingConfig) return;
  const app = firebaseApp;
  if (!app) return;
  isSupported().then((supported) => {
    if (!supported) return;
    const messaging = getMessaging(app);
    onMessage(messaging, handler);
  });
};
