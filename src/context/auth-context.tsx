
'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React, { createContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Added db
import { Loader2 } from 'lucide-react';
import Container from '@/components/layout/container';
import Logo from '@/components/common/logo';
import { upsertAppUserInFirestore, getAppUserById } from '@/services/appUserService';
import type { AppUser } from '@/types/appUser';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'; // Added imports

export interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null | undefined; // undefined means still determining, null means no appUser
  loading: boolean; // Global loading for auth and initial appUser fetch
  setLoading: Dispatch<SetStateAction<boolean>>; // To allow components to indicate loading states if needed (use with caution)
  refreshAppUser: () => Promise<void>; // Function to manually refresh appUser
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null | undefined>(undefined);
  const [loading, setLoading] = useState(true); // True initially

  const refreshAppUser = useCallback(async () => {
    if (auth.currentUser) { // Use auth.currentUser to ensure we're checking the latest Firebase auth state
      setLoading(true); // Indicate appUser refresh is in progress
      try {
        const fetchedAppUser = await getAppUserById(auth.currentUser.uid);
        setAppUser(fetchedAppUser);
      } catch (error) {
        console.error("Error refreshing app user data:", error);
        setAppUser(null);
      } finally {
        setLoading(false);
      }
    } else {
      setAppUser(null); // No Firebase user, so no appUser
    }
  }, []); // `user` state might not be updated yet when this is called from a child component

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setLoading(true);
        try {
          let userDoc = await getAppUserById(firebaseUser.uid);

          if (userDoc) {
            // User exists, update lastLoginAt & sync displayName/photoURL from Auth if changed
            const updates: Partial<AppUser> = {
              lastLoginAt: serverTimestamp() as any, // Firestore will convert this
              updatedAt: serverTimestamp() as any,
            };
            let needsFirestoreUpdate = false;

            if (firebaseUser.displayName && firebaseUser.displayName !== userDoc.displayName) {
              updates.displayName = firebaseUser.displayName;
              // If fullName is not set or was same as old displayName, update fullName too
              if (!userDoc.fullName || userDoc.fullName === userDoc.displayName) {
                updates.fullName = firebaseUser.displayName;
              }
              needsFirestoreUpdate = true;
            }
            if (firebaseUser.photoURL && firebaseUser.photoURL !== userDoc.photoURL) {
              updates.photoURL = firebaseUser.photoURL;
              needsFirestoreUpdate = true;
            }

            if (needsFirestoreUpdate || !userDoc.lastLoginAt || !userDoc.updatedAt) { // Always update timestamps
              await updateDoc(doc(db, 'users', firebaseUser.uid), updates);
              userDoc = await getAppUserById(firebaseUser.uid); // Re-fetch to get server-resolved timestamps
            } else {
              // Simulate timestamp update for client if only timestamps would have changed
               userDoc = {
                 ...userDoc,
                 lastLoginAt: new Date().toISOString(),
                 updatedAt: new Date().toISOString(),
               }
            }
            setAppUser(userDoc);
          } else {
            // User does NOT exist in Firestore (e.g., first Google Sign-In, or registration's upsert is pending)
            // Create them with data from Firebase Auth profile. username/fullName will be default from upsert.
            const newAppUserData = await upsertAppUserInFirestore({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName, // Firebase Auth profile displayName
              photoURL: firebaseUser.photoURL,
              // username and fullName are not passed here, upsertAppUserInFirestore will handle defaults.
            });
            setAppUser(newAppUserData);
          }
        } catch (error) {
          console.error("Failed to process AppUser in AuthProvider:", error);
          setAppUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        // No Firebase user
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []); // Runs once on mount

  // This loader handles the very initial app load for auth state and appUser.
  if (loading && appUser === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Container className="text-center">
          <div className="mx-auto mb-6" style={{ width: '100px', height: '100px' }}>
            <Logo iconSize={27} />
          </div>
          <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary mb-6" />
          <p className="text-xl font-semibold text-foreground/90 font-orbitron">Loading Qentai</p>
          <p className="text-muted-foreground font-poppins">Please wait while we prepare your experience.</p>
        </Container>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading, setLoading, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  );
};
