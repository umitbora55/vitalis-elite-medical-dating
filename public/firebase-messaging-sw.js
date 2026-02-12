/* eslint-disable */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const readConfigFromUrl = () => {
  try {
    const url = new URL(self.location.href);
    const encoded = url.searchParams.get('config');
    if (!encoded) return null;
    return JSON.parse(atob(decodeURIComponent(encoded)));
  } catch {
    return null;
  }
};

const firebaseConfig = readConfigFromUrl();
if (!firebaseConfig) {
  // Keep the service worker alive without background handlers when config is absent.
  self.addEventListener('push', () => undefined);
} else {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Vitalis';
    const options = {
      body: payload.notification?.body || 'New notification',
      icon: '/favicon.ico',
    };

    self.registration.showNotification(title, options);
  });
}
