/* eslint-disable */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCPQlxgMDdmtQztaM4DM2E4_swsh7NuxuU',
  authDomain: 'vitalis-6087e.firebaseapp.com',
  projectId: 'vitalis-6087e',
  messagingSenderId: '43480499042',
  appId: '1:43480499042:web:8492924afba7213715e23b',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Vitalis';
  const options = {
    body: payload.notification?.body || 'New notification',
    icon: '/favicon.ico',
  };

  self.registration.showNotification(title, options);
});
