
'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import Container from '@/components/layout/container';
import Logo from '@/components/common/logo';

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Container className="text-center">
          <div className="mb-8">
            <Logo iconSize={20} className="justify-center" /> {/* Increased iconSize from 16 to 20 */}
          </div>
          <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary mb-6" />
          <p className="text-xl font-semibold text-foreground/90">Loading Qentai</p>
          <p className="text-muted-foreground">Please wait while we prepare your experience.</p>
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

