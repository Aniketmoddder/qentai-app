'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import Container from '@/components/layout/container';
import Logo from '@/components/common/logo';
import { upsertAppUserInFirestore, getAppUserById } from '@/services/appUserService';
import type { AppUser } from '@/types/appUser';
import { convertUserTimestampsForClient } from '@/lib/userUtils'; // Import the shared utility
import { Timestamp } from 'firebase/firestore'; // Keep if Timestamp is used for instanceof, or for serverTimestamp elsewhere


export interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null | undefined;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAppUser(undefined);
        try {
          const freshAppUser = await upsertAppUserInFirestore({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });
          // upsertAppUserInFirestore in appUserService now handles conversion
          setAppUser(freshAppUser);
        } catch (error) {
          console.error("Failed to upsert/fetch user in Firestore during auth change:", error);
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && appUser === undefined && !loading) {
      const fetchAppUserData = async () => {
        try {
          const fetchedAppUserFromDb = await getAppUserById(user.uid);
          // getAppUserById in appUserService now handles conversion
          setAppUser(fetchedAppUserFromDb);
        } catch (error) {
          console.error("Error fetching app user data:", error);
          setAppUser(null);
        }
      };
      fetchAppUserData();
    }
  }, [user, appUser, loading]);

  const showGlobalLoader = loading || (user && appUser === undefined);

  if (showGlobalLoader) {
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
    <AuthContext.Provider value={{ user, appUser, loading: showGlobalLoader, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
