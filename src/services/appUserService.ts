'use server';

import { db } from '@/lib/firebase';
import type { AppUser } from '@/types/appUser';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  FirestoreError,
  Timestamp,
  setDoc 
} from 'firebase/firestore';

const usersCollection = collection(db, 'users');
const ADMIN_EMAIL = 'ninjax.desi@gmail.com'; // Define admin email

const handleFirestoreError = (error: unknown, context: string): FirestoreError => {
  console.error(`Firestore Error in ${context}:`, error);
  if (error instanceof FirestoreError) {
    return error;
  }
  const genericError = new FirestoreError('unknown', `An unknown error occurred in ${context}.`);
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    (genericError as any).message = error.message;
  }
  return genericError;
};

// Helper to convert Firestore Timestamps if they exist
const convertUserTimestampsForClient = (userData: any): AppUser => {
  const data = { ...userData };
  if (data.createdAt && data.createdAt instanceof Timestamp) {
    data.createdAt = data.createdAt.toDate().toISOString();
  }
  if (data.lastLoginAt && data.lastLoginAt instanceof Timestamp) {
    data.lastLoginAt = data.lastLoginAt.toDate().toISOString();
  }
  return data as AppUser;
};


// Function to create or update user document in Firestore 'users' collection
export const upsertAppUserInFirestore = async (userData: Partial<AppUser> & { uid: string }): Promise<void> => {
  const userRef = doc(usersCollection, userData.uid);
  try {
    let role: AppUser['role'] = userData.role || 'member'; // Default role
    if (userData.email === ADMIN_EMAIL) {
      role = 'admin'; // Override to admin if email matches
    }

    const dataToSet: Partial<AppUser> = {
      uid: userData.uid,
      email: userData.email || null,
      displayName: userData.displayName || null,
      photoURL: userData.photoURL || null,
      role: role, 
      status: userData.status || 'active', // Default status
      lastLoginAt: serverTimestamp(), // Always update last login
    };

    // Only set createdAt if it's a new document or not already set
    // This requires a read first, or a more complex transaction.
    // For simplicity, we'll set it if userData.createdAt is not provided.
    // A more robust solution would check if the doc exists before deciding to set createdAt.
    // For now, if userData.createdAt is undefined, we assume it's a new user or an update where createdAt should be set.
    if (!userData.createdAt) {
      dataToSet.createdAt = serverTimestamp();
    }


    await setDoc(userRef, dataToSet, { merge: true }); 
  } catch (error) {
    throw handleFirestoreError(error, `upsertAppUserInFirestore (uid: ${userData.uid})`);
  }
};


export const getAllAppUsers = async (count: number = 50): Promise<AppUser[]> => {
  try {
    const q = query(usersCollection, orderBy('email', 'asc')); 
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertUserTimestampsForClient(doc.data() as AppUser));
  } catch (error) {
    throw handleFirestoreError(error, 'getAllAppUsers');
  }
};

export const updateUserStatusInFirestore = async (uid: string, status: AppUser['status']): Promise<void> => {
  const userRef = doc(usersCollection, uid);
  try {
    await updateDoc(userRef, { status: status, updatedAt: serverTimestamp() });
  } catch (error) {
    throw handleFirestoreError(error, `updateUserStatusInFirestore (uid: ${uid})`);
  }
};


export const updateUserRoleInFirestore = async (uid: string, role: AppUser['role']): Promise<void> => {
    const userRef = doc(usersCollection, uid);
    try {
      // Prevent changing the admin's role via this function if it's the hardcoded admin email
      const userDoc = await setDoc(userRef, {}, {merge: true}); // Ensure doc exists
      // const currentUserData = (await getDoc(userRef)).data() as AppUser | undefined;
      // if (currentUserData?.email === ADMIN_EMAIL && role !== 'admin') {
      //   throw new Error("Cannot change the primary admin's role.");
      // }
      await updateDoc(userRef, { role: role, updatedAt: serverTimestamp() });
    } catch (error) {
      throw handleFirestoreError(error, `updateUserRoleInFirestore (uid: ${uid})`);
    }
  };

