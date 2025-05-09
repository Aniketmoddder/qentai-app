
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';
import { AuthForm } from '@/components/auth/auth-form';
import Container from '@/components/layout/container';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Chrome } from 'lucide-react'; // Using Chrome icon for Google, can be changed


const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/'); // Redirect if already logged in
    }
  }, [user, authLoading, router]);

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/'); 
    } catch (e: any) {
      setError(e.message?.replace('Firebase: ', '').split(' (')[0] || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (e: any) {
      setError(e.message?.replace('Firebase: ', '').split(' (')[0] || 'Failed to sign in with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  if (authLoading || (!authLoading && user)) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
             <p className="text-muted-foreground">Loading...</p>
        </div>
    );
  }

  return (
    <Container className="flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <Logo />
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
                <p className="relative bg-card px-2 text-xs text-muted-foreground text-center mx-auto w-fit">OR CONTINUE WITH</p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
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
