
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// Import other Firebase services as needed, e.g., getFirestore, getStorage, getAnalytics

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Added for completeness, used by RTDB
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Ensured this is used
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  // Example: Initialize Analytics if measurementId is present and you plan to use it
  // if (firebaseConfig.measurementId) {
  //   getAnalytics(app);
  // }
} else {
  app = getApp();
}

const auth = getAuth(app);
// const db = getFirestore(app); // For Firestore
// const database = getDatabase(app); // For Realtime Database
// const storage = getStorage(app); // For Firebase Storage

export { app, auth /*, db, database, storage */ };

// Important: Ensure you have installed firebase SDK (npm install firebase or yarn add firebase)
// Also, ensure your .env.local or .env file has all the NEXT_PUBLIC_FIREBASE_ variables set.
// Restart your development server after updating .env files.
