import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

let auth = null;
let googleProvider = null;

// Only initialize Firebase if a valid API key is present
if (apiKey && apiKey.trim() !== "" && apiKey !== "your_firebase_api_key") {
  try {
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "aegiscampus-ai.firebaseapp.com",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "aegiscampus-ai",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "aegiscampus-ai.firebasestorage.app",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (err) {
    console.warn("[AegisCampus-AI] Firebase initialization notice:", err);
  }
}

export { auth, googleProvider };