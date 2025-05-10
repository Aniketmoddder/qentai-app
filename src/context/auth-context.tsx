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

export interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null | undefined; // undefined means loading, null means no appUser found/exists
  loading: boolean; // True if Firebase auth state OR appUser data is loading
  setLoading: Dispatch<SetStateAction<boolean>>; 
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null | undefined>(undefined); // Initial state is undefined (loading)
  const [loading, setLoading] = useState(true); // Overall loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAppUser(undefined); // Set appUser to loading when Firebase user changes
        try {
          // Upsert first to ensure document exists or is updated with lastLogin
          const updatedAppUser = await upsertAppUserInFirestore({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });
          setAppUser(updatedAppUser); // Set the fetched/updated appUser
        } catch (error) {
          console.error("Failed to upsert/fetch user in Firestore during auth change:", error);
          setAppUser(null); // Error case, no appUser data
        }
      } else {
        setAppUser(null); // No Firebase user, so no appUser
      }
      setLoading(false); // Firebase auth state resolved
    });

    return () => unsubscribe();
  }, []);
  
  // This effect handles the case where appUser might be undefined initially after Firebase user is set
  useEffect(() => {
    if (user && appUser === undefined && !loading) { // If firebase user is set, appUser is loading, and initial auth loading is done
      const fetchAppUserData = async () => {
        try {
          const fetchedAppUser = await getAppUserById(user.uid);
          setAppUser(fetchedAppUser);
        } catch (error) {
          console.error("Error fetching app user data:", error);
          setAppUser(null);
        }
      };
      fetchAppUserData();
    }
  }, [user, appUser, loading]);


  // Global loading spinner shown if Firebase auth is loading OR if Firebase user is present but appUser data is still being fetched
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
