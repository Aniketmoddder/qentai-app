
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Container from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, LayoutDashboard, Clapperboard, Tv, ListOrdered, UserCog, Film } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import AdminDashboardTab from '@/components/admin/AdminDashboardTab';
import TmdbImportTab from '@/components/admin/TmdbImportTab';
import ContentManagementTab from '@/components/admin/ContentManagementTab';
import EpisodeEditorTab from '@/components/admin/EpisodeEditorTab';
import ManualAddTab from '@/components/admin/ManualAddTab';
import UserManagementTab from '@/components/admin/UserManagementTab';

const ADMIN_EMAIL = 'ninjax.desi@gmail.com';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/admin');
        setIsAuthorized(false);
      } else if (user.email !== ADMIN_EMAIL) {
        toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to access this page.' });
        router.push('/');
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, authLoading, router, toast]);

  if (authLoading || isAuthorized === null) {
    return (
      <Container className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </Container>
    );
  }

  if (!isAuthorized && !authLoading) {
    return (
      <Container className="py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage Qentai content and users.</p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2"><LayoutDashboard /> Dashboard</TabsTrigger>
          <TabsTrigger value="tmdb-import" className="flex items-center gap-2"><Film /> TMDB Import</TabsTrigger>
          <TabsTrigger value="content-management" className="flex items-center gap-2"><Clapperboard /> Content Mgmt</TabsTrigger>
          <TabsTrigger value="episode-editor" className="flex items-center gap-2"><ListOrdered /> Episode Editor</TabsTrigger>
          <TabsTrigger value="manual-add" className="flex items-center gap-2"><Tv /> Manual Add</TabsTrigger>
          <TabsTrigger value="user-management" className="flex items-center gap-2"><UserCog /> Users</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminDashboardTab />
        </TabsContent>
        <TabsContent value="tmdb-import">
          <TmdbImportTab />
        </TabsContent>
        <TabsContent value="content-management">
          <ContentManagementTab />
        </TabsContent>
        <TabsContent value="episode-editor">
          <EpisodeEditorTab />
        </TabsContent>
        <TabsContent value="manual-add">
          <ManualAddTab />
        </TabsContent>
        <TabsContent value="user-management">
          <UserManagementTab />
        </TabsContent>
      </Tabs>
    </Container>
  );
}
