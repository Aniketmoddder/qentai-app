
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // Import GoogleAuthProvider
import { getFirestore } from "firebase/firestore";
// Import other Firebase services as needed, e.g., getStorage, getAnalytics

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app); // For Firestore
const googleProvider = new GoogleAuthProvider(); // Create GoogleAuthProvider instance

export { app, auth, db, googleProvider };

// Important: Ensure you have installed firebase SDK (npm install firebase or yarn add firebase)
// Also, ensure your .env.local or .env file has all the NEXT_PUBLIC_FIREBASE_ variables set.
// Restart your development server after updating .env files.
// For Google Sign-In, ensure you've enabled it as a sign-in provider in your Firebase project console.
