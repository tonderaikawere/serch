import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyB56lZzCi5QQNpTFPUQDqvthlCbmmV-HSk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "uncommon-seo-and-aeo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "uncommon-seo-and-aeo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "uncommon-seo-and-aeo.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "831513360632",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:831513360632:web:5fc48cac65753bb8c1630d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-HSKNKNKF99",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const realtimeDb = getDatabase(firebaseApp);
export const functions = getFunctions(firebaseApp);

export async function getFirebaseAnalytics() {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getAnalytics(firebaseApp);
}
