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
  setDoc
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
  if (data.createdAt && data.createdAt instanceof Timestamp) {
    data.createdAt = data.createdAt.toDate().toISOString();
  } else if (typeof data.createdAt === 'object' && data.createdAt?.seconds) {
    data.createdAt = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate().toISOString();
  }

  if (data.lastLoginAt && data.lastLoginAt instanceof Timestamp) {
    data.lastLoginAt = data.lastLoginAt.toDate().toISOString();
  } else if (typeof data.lastLoginAt === 'object' && data.lastLoginAt?.seconds) {
     data.lastLoginAt = new Timestamp(data.lastLoginAt.seconds, data.lastLoginAt.nanoseconds).toDate().toISOString();
  }

  if (data.updatedAt && data.updatedAt instanceof Timestamp) { 
    data.updatedAt = data.updatedAt.toDate().toISOString();
  } else if (typeof data.updatedAt === 'object' && data.updatedAt?.seconds) {
     data.updatedAt = new Timestamp(data.updatedAt.seconds, data.updatedAt.nanoseconds).toDate().toISOString();
  }
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
    let finalUserData: AppUser;

    if (userSnap.exists()) {
      const existingData = userSnap.data() as AppUser;
      role = existingData.role; // Preserve existing role unless owner logic applies
      finalStatus = existingData.status; // Preserve existing status (especially 'banned')

      // Owner check: if this user is the owner, ensure their role is 'owner'
      // and they cannot be 'banned' through this standard upsert flow.
      if (userData.email === ADMIN_EMAIL) {
        role = 'owner';
        if (finalStatus === 'banned') {
          console.warn(`Owner account (${ADMIN_EMAIL}) is marked as banned in DB. This should be rectified manually. Retaining 'banned' status for safety.`);
        }
      }
      
      const updatePayload: Partial<AppUser> = {
        ...userData, // new data from auth provider (displayName, photoURL, email might change)
        role, // determined role
        status: finalStatus, // determined status
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(userRef, updatePayload);
      finalUserData = { ...existingData, ...updatePayload, uid: userData.uid };

    } else {
      // New user
      if (userData.email === ADMIN_EMAIL) {
        role = 'owner';
      } else {
        role = 'member'; // Default new users to 'member'
      }
      finalStatus = 'active'; // New users are 'active' by default

      const newUserData: Omit<AppUser, 'createdAt' | 'lastLoginAt' | 'updatedAt'> & { createdAt: any, lastLoginAt: any, updatedAt: any } = {
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
      await setDoc(userRef, newUserData);
      finalUserData = { ...newUserData, uid: userData.uid } as AppUser; // Cast after setting
    }
    // Return the full user data, converting timestamps for immediate use if needed by caller
    return convertUserTimestampsForClient(finalUserData);
  } catch (error) {
    throw handleFirestoreError(error, `upsertAppUserInFirestore (uid: ${userData.uid})`);
  }
};


export const getAllAppUsers = async (count: number = 50): Promise<AppUser[]> => {
  try {
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
