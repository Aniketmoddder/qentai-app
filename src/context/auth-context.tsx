
'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import Container from '@/components/layout/container';
import Logo from '@/components/common/logo';
import { upsertAppUserInFirestore } from '@/services/appUserService'; // Import the new service

export interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>; // Allow components to trigger global loading
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // User is signed in, ensure their document exists in Firestore 'users' collection
        try {
          await upsertAppUserInFirestore({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            // role and status will be set to default if not provided or already existing
          });
        } catch (error) {
          console.error("Failed to upsert user in Firestore:", error);
          // Handle error, e.g., show a toast, but don't block app loading
        }
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Container className="text-center">
          <div className="mx-auto mb-6" style={{ width: '100px', height: '100px' }}> {/* Increased size */}
            <Logo iconSize={27} /> {/* Adjusted for new wrapper size */}
          </div>
          <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary mb-6" />
          <p className="text-xl font-semibold text-foreground/90 font-orbitron">Loading Qentai</p>
          <p className="text-muted-foreground font-poppins">Please wait while we prepare your experience.</p>
        </Container>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
