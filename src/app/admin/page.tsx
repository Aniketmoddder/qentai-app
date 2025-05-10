
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Container from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, GaugeCircle, Wrench, LibraryBig, ListVideo, FilePlus2, UsersRound } from 'lucide-react';
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
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </Container>
    );
  }

  if (!isAuthorized && !authLoading) {
    return (
      <Container className="py-12 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground text-lg">You do not have permission to view this page.</p>
        <Button asChild variant="link" className="mt-6 text-lg">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-8 md:py-12">
      <div className="mb-8 md:mb-10 text-center md:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-primary mb-2">Admin Control Center</h1>
        <p className="text-lg text-muted-foreground">Manage Qentai's content, users, and settings.</p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex flex-nowrap overflow-x-auto md:grid md:grid-cols-3 lg:grid-cols-6 gap-2 mb-8 p-1 bg-card rounded-lg shadow-md scrollbar-hide">
          <TabsTrigger value="dashboard" className="admin-tab-trigger">
            <GaugeCircle className="w-5 h-5 mr-2" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="tools" className="admin-tab-trigger">
            <Wrench className="w-5 h-5 mr-2" /> Tools
          </TabsTrigger>
          <TabsTrigger value="content-management" className="admin-tab-trigger">
            <LibraryBig className="w-5 h-5 mr-2" /> Content
          </TabsTrigger>
          <TabsTrigger value="episode-editor" className="admin-tab-trigger">
            <ListVideo className="w-5 h-5 mr-2" /> Episodes
          </TabsTrigger>
          <TabsTrigger value="manual-add" className="admin-tab-trigger">
            <FilePlus2 className="w-5 h-5 mr-2" /> Manual Add
          </TabsTrigger>
          <TabsTrigger value="user-management" className="admin-tab-trigger">
            <UsersRound className="w-5 h-5 mr-2" /> Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminDashboardTab />
        </TabsContent>
        <TabsContent value="tools">
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
      <style jsx global>{`
        .admin-tab-trigger {
          padding: 0.75rem 1rem;
          border-radius: 0.375rem; /* rounded-md */
          font-weight: 500; /* medium */
          font-size: 0.875rem; /* text-sm */
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem; /* gap-2 */
          transition: all 0.2s ease-in-out;
          white-space: nowrap;
          flex-shrink: 0; /* Prevent shrinking in flex container */
        }
        .admin-tab-trigger[data-state='active'] {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .admin-tab-trigger[data-state='inactive']:hover {
          background-color: hsl(var(--muted) / 0.5);
        }
      `}</style>
    </Container>
  );
}
