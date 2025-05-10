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
  setDoc // Added for potentially creating user doc on first login if needed
} from 'firebase/firestore';

const usersCollection = collection(db, 'users');

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
// This might be called after successful Firebase Auth sign-up/sign-in
export const upsertAppUserInFirestore = async (userData: Partial<AppUser> & { uid: string }): Promise<void> => {
  const userRef = doc(usersCollection, userData.uid);
  try {
    await setDoc(userRef, {
      uid: userData.uid,
      email: userData.email || null,
      displayName: userData.displayName || null,
      photoURL: userData.photoURL || null,
      role: userData.role || 'member', // Default role
      status: userData.status || 'active', // Default status
      createdAt: userData.createdAt || serverTimestamp(), // Set only on creation
      lastLoginAt: serverTimestamp(), // Always update last login
    }, { merge: true }); // Use merge:true to avoid overwriting existing fields if only partially updating
  } catch (error) {
    throw handleFirestoreError(error, `upsertAppUserInFirestore (uid: ${userData.uid})`);
  }
};


export const getAllAppUsers = async (count: number = 50): Promise<AppUser[]> => {
  try {
    // Simplified sort to reduce likelihood of missing index errors.
    // For sorting by email then createdAt, a composite index (email ASC, createdAt DESC) is needed.
    // The original query was: query(usersCollection, orderBy('email', 'asc'), orderBy('createdAt', 'desc'))
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
      await updateDoc(userRef, { role: role, updatedAt: serverTimestamp() });
    } catch (error) {
      throw handleFirestoreError(error, `updateUserRoleInFirestore (uid: ${uid})`);
    }
  };


// Note: For actually disabling/deleting users from Firebase Authentication,
// you would need to use the Firebase Admin SDK via a Server Action.
// Example (requires Admin SDK setup):
/*
import { adminAuth } from '@/lib/firebase'; // Assuming adminAuth is exported from firebase.ts

export const disableUserAccount = async (uid: string): Promise<void> => {
  try {
    await adminAuth.updateUser(uid, { disabled: true });
  } catch (error) {
    console.error(`Admin SDK Error in disableUserAccount (uid: ${uid}):`, error);
    throw error; // Rethrow or handle as specific error type
  }
};

export const enableUserAccount = async (uid: string): Promise<void> => {
  try {
    await adminAuth.updateUser(uid, { disabled: false });
  } catch (error) {
    console.error(`Admin SDK Error in enableUserAccount (uid: ${uid}):`, error);
    throw error; 
  }
};
*/

