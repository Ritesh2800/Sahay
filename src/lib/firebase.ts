import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable persistence for offline support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);

export let messaging: any = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.log("Messaging not available or blocked in this environment");
}

export const requestFCMToken = async () => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { 
                // In a real app, generate a VAPID key in Firebase Console -> Project Settings -> Cloud Messaging
                // vapidKey: "YOUR_PUBLIC_VAPID_KEY_HERE" 
            });
            return token;
        }
    } catch(e) {
        console.warn("FCM Token request failed", e);
    }
    return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if(!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

async function testConnection() {
  try {
    // Use a path that is publicly readable according to firestore.rules (ngos collection)
    // to verify connectivity even before sign-in.
    await getDocFromServer(doc(db, 'ngos', '_connection_test_'));
    console.log("Firebase connection established successfully.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('offline')) {
        console.warn("Firestore: Operating in offline mode (cached).");
      } else if (error.message.includes('permission-denied')) {
        // Even if permission is denied, it means we reached the server.
        // We log it as a warning rather than a scary error if we're likely unauthenticated.
        console.warn("Firestore: Connected, but path access requires authentication.");
      } else {
        console.error("Firebase connection error:", error.message);
      }
    }
  }
}
testConnection();
