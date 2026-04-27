// Firebase backend will require these constants directly, normally dynamically fetched 
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Add your Firebase Config here for background tasks
// Make sure to populate this if testing deployed background push:
const firebaseConfig = {
  // Use config from firebase-applet-config.json
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'Nexus Alert';
    const notificationOptions = {
      body: payload.notification?.body,
      icon: '/vite.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch(e) {
  console.log("Fill out firebaseConfig in public/firebase-messaging-sw.js to enable background sync");
}
