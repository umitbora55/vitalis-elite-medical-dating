import { FirebaseOptions, getApps, initializeApp } from 'firebase/app';

export const firebaseMessagingConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasRequiredMessagingConfig = Boolean(
  firebaseMessagingConfig.apiKey &&
    firebaseMessagingConfig.authDomain &&
    firebaseMessagingConfig.projectId &&
    firebaseMessagingConfig.messagingSenderId &&
    firebaseMessagingConfig.appId
);

export const hasFirebaseMessagingConfig = hasRequiredMessagingConfig;

export const firebaseApp = hasRequiredMessagingConfig
  ? getApps()[0] ?? initializeApp(firebaseMessagingConfig)
  : null;
