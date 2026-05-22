// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  projectId: "gen-lang-client-0953289644",
  appId: "1:739906773218:web:5d60716e195834b153febb",
  apiKey: "AIzaSyB_VqqVpv1Kwy_in7zEMkWKS69ksmSapJk",
  authDomain: "gen-lang-client-0953289644.firebaseapp.com",
  storageBucket: "gen-lang-client-0953289644.firebasestorage.app",
  messagingSenderId: "739906773218"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'منصة عربون 🔔';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
