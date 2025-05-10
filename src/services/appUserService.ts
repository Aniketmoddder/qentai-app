'use server';

import { db } from '@/lib/firebase';
import type { AppUser, AppUserRole } from '@/types/appUser';
import {
  collection,
  doc,
  getDocs,
  getDoc, 
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  FirestoreError,
  Timestamp,
  setDoc,
  limit
} from 'firebase/firestore';

const usersCollection = collection(db, 'users');
const ADMIN_EMAIL = 'ninjax.desi@gmail.com'; 

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
  
  const convertTimestamp = (field: any): string | undefined => {
    if (field instanceof Timestamp) {
      return field.toDate().toISOString();
    }
    if (typeof field === 'object' && field !== null && 'seconds' in field && 'nanoseconds' in field) {
      return new Timestamp(field.seconds, field.nanoseconds).toDate().toISOString();
    }
    if (typeof field === 'string') { // Already a string, assume ISO
        try {
            // Validate if it's a valid ISO string, otherwise it might be some other string
            new Date(field).toISOString();
            return field;
        } catch (e) {
            // Not a valid date string, return undefined or handle as error
            console.warn(`Invalid date string encountered: ${field}`);
            return undefined; 
        }
    }
    return undefined; // Return undefined if not a recognizable timestamp format
  };

  data.createdAt = convertTimestamp(data.createdAt);
  data.lastLoginAt = convertTimestamp(data.lastLoginAt);
  data.updatedAt = convertTimestamp(data.updatedAt);
  
  return data as AppUser;
};


export const upsertAppUserInFirestore = async (
  userData: Partial<Omit<AppUser, 'createdAt' | 'lastLoginAt' | 'updatedAt'>> & { uid: string }
): Promise<AppUser> => {
  const userRef = doc(usersCollection, userData.uid);
  try {
    const userSnap = await getDoc(userRef);
    let role: AppUserRole;
    let finalStatus: AppUser['status'];
    let finalUserDataForDb: any; // Use 'any' temporarily for DB payload

    if (userSnap.exists()) {
      const existingData = userSnap.data() as AppUser;
      role = existingData.role; 
      finalStatus = existingData.status; 

      if (userData.email === ADMIN_EMAIL) {
        role = 'owner';
        if (finalStatus === 'banned') {
          console.warn(`Owner account (${ADMIN_EMAIL}) is marked as banned in DB. Retaining 'banned' status.`);
        }
      }
      
      finalUserDataForDb = {
        ...userData, 
        role, 
        status: finalStatus, 
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(userRef, finalUserDataForDb);
      // For returning, merge existing with updates, then convert
      const mergedData = { ...existingData, ...userData, role, status: finalStatus, uid: userData.uid, lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
       return convertUserTimestampsForClient(mergedData);

    } else {
      // New user
      role = userData.email === ADMIN_EMAIL ? 'owner' : 'member';
      finalStatus = 'active'; 

      finalUserDataForDb = {
        uid: userData.uid,
        email: userData.email || null,
        displayName: userData.displayName || null,
        photoURL: userData.photoURL || null,
        role: role,
        status: finalStatus,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, finalUserDataForDb);
      // For returning, convert serverTimestamps to something client-can-use immediately
      const newUserDataForClient = {
        ...finalUserDataForDb,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return convertUserTimestampsForClient(newUserDataForClient);
    }
  } catch (error) {
    throw handleFirestoreError(error, `upsertAppUserInFirestore (uid: ${userData.uid})`);
  }
};


export const getAllAppUsers = async (count: number = 50): Promise<AppUser[]> => {
  try {
    // Firestore default order is by document ID if no orderBy is specified.
    // For user management, ordering by 'createdAt' or 'lastLoginAt' is common.
    // Ensure the index `users/createdAt DESC` exists.
    const q = query(usersCollection, orderBy('createdAt', 'desc'), limit(count > 0 ? count : 500));
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
    const userDoc = await getDoc(userRef);
    if (userDoc.exists() && userDoc.data().email === ADMIN_EMAIL && status === 'banned') {
        throw new Error("The owner account cannot be banned.");
    }
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
        // Prevent changing the primary owner's role from 'owner'
        if (currentUserData.email === ADMIN_EMAIL && currentUserData.role === 'owner' && newRole !== 'owner') {
          throw new Error("The primary owner's role cannot be changed from 'owner'.");
        }
        // Prevent assigning 'owner' role to anyone other than the primary owner
        if (newRole === 'owner' && currentUserData.email !== ADMIN_EMAIL) {
          throw new Error("Cannot assign 'owner' role to a non-primary owner account.");
        }
      } else {
        throw new Error(`User with UID ${uid} not found.`);
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
    console.warn(`User document for UID ${uid} not found in getAppUserById.`);
    return null;
  } catch (error) {
    throw handleFirestoreError(error, `getAppUserById (uid: ${uid})`);
  }
};
