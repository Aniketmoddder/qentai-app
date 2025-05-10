
'use server';

import { db } from '@/lib/firebase';
import type { AppUser, AppUserRole } from '@/types/appUser';
import {
  collection,
  doc,
  getDocs,
  getDoc, // Import getDoc
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
  if (data.updatedAt && data.updatedAt instanceof Timestamp) { // Added handling for updatedAt
    data.updatedAt = data.updatedAt.toDate().toISOString();
  }
  return data as AppUser;
};


// Function to create or update user document in Firestore 'users' collection
export const upsertAppUserInFirestore = async (userData: Partial<Omit<AppUser, 'role' | 'createdAt' | 'lastLoginAt' | 'updatedAt'>> & { uid: string; role?: AppUserRole }): Promise<void> => {
  const userRef = doc(usersCollection, userData.uid);
  try {
    const userSnap = await getDoc(userRef);
    let role: AppUserRole;
    let existingStatus: AppUser['status'] | undefined;

    if (userSnap.exists()) {
        const existingData = userSnap.data() as AppUser;
        role = existingData.role;
        existingStatus = existingData.status;
         // If the user is the owner, ensure their role remains 'owner'
        if (userData.email === ADMIN_EMAIL) {
            role = 'owner';
        }
    } else {
        // New user
        if (userData.email === ADMIN_EMAIL) {
            role = 'owner';
        } else {
            role = userData.role || 'member'; // Default to member or provided role
        }
    }


    const dataToSet: Partial<AppUser> = {
      uid: userData.uid,
      email: userData.email || null,
      displayName: userData.displayName || null,
      photoURL: userData.photoURL || null,
      role: role,
      status: existingStatus || userData.status || 'active', // Keep existing status or default to active
      lastLoginAt: serverTimestamp(),
    };

    if (!userSnap.exists()) {
      dataToSet.createdAt = serverTimestamp();
      dataToSet.updatedAt = serverTimestamp(); // Also set updatedAt on creation
    } else {
      dataToSet.updatedAt = serverTimestamp(); // Always update updatedAt timestamp
    }
    
    await setDoc(userRef, dataToSet, { merge: true });
  } catch (error) {
    throw handleFirestoreError(error, `upsertAppUserInFirestore (uid: ${userData.uid})`);
  }
};


export const getAllAppUsers = async (count: number = 50): Promise<AppUser[]> => {
  try {
    // Ensure the owner's document is created/updated first if they are logging in.
    // This scenario is typically handled by upsertAppUserInFirestore on login,
    // but as a safeguard for this listing:
    // (This part is complex to add here directly without auth context,
    //  assuming upsert handles the owner role creation reliably on their login)

    const q = query(usersCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertUserTimestampsForClient(doc.data() as AppUser));
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn("Firestore query in getAllAppUsers requires an index on 'createdAt'. Please create this index in your Firebase console: Collection ID: users, Field: createdAt, Order: Descending.", error.message);
    }
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


export const updateUserRoleInFirestore = async (uid: string, newRole: AppUserRole): Promise<void> => {
    const userRef = doc(usersCollection, uid);
    try {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentUserData = userDoc.data() as AppUser;
        if (currentUserData.email === ADMIN_EMAIL && newRole !== 'owner') {
          throw new Error("Cannot change the primary owner's role.");
        }
         if (currentUserData.role === 'owner' && currentUserData.email !== ADMIN_EMAIL && newRole === 'owner') {
          throw new Error("Cannot assign 'owner' role to a non-primary owner account.");
        }
      }
      await updateDoc(userRef, { role: newRole, updatedAt: serverTimestamp() });
    } catch (error) {
      throw handleFirestoreError(error, `updateUserRoleInFirestore (uid: ${uid})`);
    }
  };

export const getAppUserById = async (uid: string): Promise<AppUser | null> => {
  if (!uid) return null;
  const userRef = doc(usersCollection, uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return convertUserTimestampsForClient(docSnap.data() as AppUser);
    }
    // If user doc doesn't exist, attempt to create it - this might happen if first access is directly to admin
    // For example, if the owner logs in and immediately goes to /admin before AuthProvider upsert fully completes or if there was an error
    // However, this is best handled by the AuthProvider's upsert logic.
    // For now, we'll just return null if not found, assuming AuthProvider does its job.
    console.warn(`User document for UID ${uid} not found in getAppUserById. This might be normal if the user is new and upsert is pending, or indicates an issue with user document creation.`);
    return null;
  } catch (error) {
    throw handleFirestoreError(error, `getAppUserById (uid: ${uid})`);
  }
};

