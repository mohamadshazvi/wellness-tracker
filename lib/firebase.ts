import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBu1_xZT4OkwmlhUKteXMPL0cMcYZolhcE",
  authDomain: "wellness-tracker-bb385.firebaseapp.com",
  projectId: "wellness-tracker-bb385",
  storageBucket: "wellness-tracker-bb385.firebasestorage.app",
  messagingSenderId: "900615384899",
  appId: "1:900615384899:web:111c8e70ebf619284509f6",
  measurementId: "G-ZHKDEBC909"
};

// Initialize Firebase (check if already initialized for Next.js hot reloads)
const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = isNewApp
  ? initializeFirestore(app, {
      experimentalForceLongPolling: true,
    })
  : getFirestore(app);

export { app, auth, db };
