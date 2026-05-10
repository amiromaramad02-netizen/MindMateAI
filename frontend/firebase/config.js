import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCPL2BuZRDTOQUeUn0LOaBT2I1c1sLrKR8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mindmate-13f29.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mindmate-13f29",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mindmate-13f29.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "133668318715",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:133668318715:web:123fb4329ba013a0286f5e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };