
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'; // Renamed
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';
import { AuthForm } from '@/components/auth/auth-form';
import Container from '@/components/layout/container';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Chrome, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { upsertAppUserInFirestore } from '@/services/appUserService';

const registerSchema = z
  .object({
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }).max(50, { message: 'Full name must be at most 50 characters.'}),
    username: z.string().min(3, { message: 'Username must be at least 3 characters.' }).max(20, { message: 'Username must be at most 20 characters.'}).regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores.'}),
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useNextSearchParams(); // Renamed
  const { user, loading: authLoading, setLoading: setAuthContextLoading, refreshAppUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

 useEffect(() => {
    if (!authLoading && user) {
      const redirectUrl = searchParams.get('redirect') || '/';
      router.push(redirectUrl); 
    }
  }, [user, authLoading, router, searchParams]);

  const handleRegister = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    setAuthContextLoading(true); // Indicate global loading start
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: values.fullName, 
      });
      
      // Upsert user data in Firestore, including new fields
      // This call is crucial for setting the initial username and fullName
      await upsertAppUserInFirestore({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: values.fullName, // Passed as displayName to upsert
        photoURL: firebaseUser.photoURL,
        username: values.username,     // Explicitly pass username
        fullName: values.fullName,     // Explicitly pass fullName
      });

      await refreshAppUser(); // Refresh appUser in context

      toast({
        title: "Account Created",
        description: "Welcome to Qentai!",
      });
      const redirectUrl = searchParams.get('redirect') || '/';
      router.push(redirectUrl); 
    } catch (e: any) {
      const errorMessage = e.message?.replace('Firebase: ', '').split(' (')[0] || 'Failed to create account. Please try again.';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      setAuthContextLoading(false); // Indicate global loading end
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setAuthContextLoading(true); 
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = userCredential.user;

      await upsertAppUserInFirestore({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName, // Firebase Auth displayName
        photoURL: firebaseUser.photoURL,
        // username and fullName will be defaulted by upsertAppUserInFirestore
        // as they are not provided directly from Google Sign-Up form.
      });
      
      await refreshAppUser(); // Refresh appUser in context

      toast({
        title: "Sign Up Successful",
        description: "Welcome to Qentai!",
      });
      const redirectUrl = searchParams.get('redirect') || '/';
      router.push(redirectUrl);
    } catch (e: any) {
      let errorMessage = "Failed to sign up with Google. Please try again.";
      const errorCode = e.code; 
      console.error("Google Sign-Up Error:", e); 

      if (errorCode === 'auth/popup-closed-by-user') {
        errorMessage = "Google Sign-Up was cancelled. Please try again.";
      } else if (errorCode === 'auth/cancelled-popup-request') {
        errorMessage = "Google Sign-Up request was cancelled. Please ensure only one sign-up window is open.";
      } else if (errorCode === 'auth/popup-blocked') {
        errorMessage = "Google Sign-Up popup was blocked by your browser. Please disable your popup blocker and try again.";
      } else if (errorCode === 'auth/operation-not-allowed') {
        errorMessage = "Google Sign-Up is not enabled for this app. Please check Firebase console settings.";
      } else if (errorCode === 'auth/unauthorized-domain') {
         errorMessage = "This domain is not authorized for Google Sign-Up. Please check Firebase console settings (Authorized JavaScript origins).";
      } else if (e.message) {
        errorMessage = e.message.replace('Firebase: ', '').split(' (')[0] || errorMessage;
      }

      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Google Sign-Up Failed",
        description: `${errorMessage}${errorCode ? ` (Error: ${errorCode})` : ''}`,
      });
    } finally {
      setIsGoogleLoading(false);
      setAuthContextLoading(false); 
    }
  };

  if (authLoading || (!authLoading && user)) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <Container className="flex items-center justify-center min-h-[calc(100vh-var(--header-height)-1px)] py-12">
      <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm">
         <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <Logo iconSize={27} /> 
          </div>
          <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>
          <CardDescription>Join Qentai to discover and watch your favorite anime.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            formSchema={registerSchema}
            onSubmit={handleRegister}
            isRegister
            isLoading={isLoading}
            error={error}
            setError={setError}
            defaultValues={{
              fullName: '',
              username: '',
              email: '',
              password: '',
              confirmPassword: '',
            }}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
                <Separator className="absolute top-1/2 -translate-y-1/2" />
                <p className="relative bg-card/80 px-2 text-xs text-muted-foreground text-center mx-auto w-fit">OR CONTINUE WITH</p>
            </div>
            <Button variant="outline" className="w-full hover:bg-primary/10" onClick={handleGoogleSignUp} disabled={isGoogleLoading || isLoading}>
                 {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Chrome className="mr-2 h-4 w-4" />
                )}
                Google
            </Button>
        </CardFooter>
      </Card>
    </Container>
  );
}
