
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams as useNextSearchParams } from 'next/navigation'; // Renamed useSearchParams to avoid conflict
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
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


const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useNextSearchParams(); // Using the renamed import
  const { user, loading: authLoading, setLoading: setAuthContextLoading } = useAuth();
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

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      const redirectUrl = searchParams.get('redirect') || '/';
      router.push(redirectUrl); 
    } catch (e: any) {
      const errorMessage = e.message?.replace('Firebase: ', '').split(' (')[0] || 'Failed to sign in. Please check your credentials.';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setAuthContextLoading(true); // Indicate auth state might change
    try {
      await signInWithPopup(auth, googleProvider);
      toast({
        title: "Login Successful",
        description: "Welcome!",
      });
      const redirectUrl = searchParams.get('redirect') || '/';
      router.push(redirectUrl);
    } catch (e: any) {
      let errorMessage = "Failed to sign in with Google. Please try again.";
      const errorCode = e.code;
      console.error("Google Sign-In Error:", e); 

      if (errorCode === 'auth/popup-closed-by-user') {
        errorMessage = "Google Sign-In was cancelled. Please try again.";
      } else if (errorCode === 'auth/cancelled-popup-request') {
        errorMessage = "Google Sign-In request was cancelled. Please ensure only one sign-in window is open.";
      } else if (errorCode === 'auth/popup-blocked') {
        errorMessage = "Google Sign-In popup was blocked by your browser. Please disable your popup blocker and try again.";
      } else if (errorCode === 'auth/operation-not-allowed') {
        errorMessage = "Google Sign-In is not enabled for this app. Please check Firebase console settings.";
      } else if (errorCode === 'auth/unauthorized-domain') {
        errorMessage = "This domain is not authorized for Google Sign-In. Please check Firebase console settings (Authorized JavaScript origins).";
      } else if (e.message) {
        errorMessage = e.message.replace('Firebase: ', '').split(' (')[0] || errorMessage;
      }
      
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: `${errorMessage}${errorCode ? ` (Error: ${errorCode})` : ''}`,
      });
    } finally {
      setIsGoogleLoading(false);
      setAuthContextLoading(false); // Reset global loading after attempt
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
            <Logo iconSize={18} /> {/* Increased iconSize from 14 to 18 */}
          </div>
          <CardTitle className="text-3xl font-bold">Welcome Back!</CardTitle>
          <CardDescription>Sign in to continue to Qentai.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            formSchema={loginSchema}
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error}
            setError={setError}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
                <Separator className="absolute top-1/2 -translate-y-1/2" />
                <p className="relative bg-card/80 px-2 text-xs text-muted-foreground text-center mx-auto w-fit">OR CONTINUE WITH</p>
            </div>
            <Button variant="outline" className="w-full hover:bg-primary/10" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
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

