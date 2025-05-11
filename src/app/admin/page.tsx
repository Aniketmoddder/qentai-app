
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

import type { AppUser, AppUserRole } from '@/types/appUser';

type EffectiveAuthStatus = 'loading' | 'authorized' | 'unauthorized' | 'unauthenticated';


function AdminLoaderScreen() {
  return (
    <Container className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-16 h-16 animate-spin text-primary" />
    </Container>
  );
}

function AccessDeniedScreen() {
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


export default function AdminPage() {
  const { user, loading: authLoading, appUser } = useAuth(); 
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const defaultTabFromUrl = searchParams.get('tab') || "dashboard";
  
  const [effectiveAuthStatus, setEffectiveAuthStatus] = useState<EffectiveAuthStatus>('loading');

  useEffect(() => {
    if (!authLoading) { 
      if (!user) { 
        router.push('/login?redirect=/admin');
        setEffectiveAuthStatus('unauthenticated');
      } else if (appUser === undefined) { 
        setEffectiveAuthStatus('loading'); 
      } else if (appUser === null) { 
        if (user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
          setEffectiveAuthStatus('authorized'); 
        } else {
          toast({ variant: 'destructive', title: 'Profile Error', description: 'User profile not found or not fully loaded. Please try again or contact support.' });
          router.push('/');
          setEffectiveAuthStatus('unauthorized');
        }
      } else { 
        if (appUser.role === 'owner' || appUser.role === 'admin') {
          setEffectiveAuthStatus('authorized');
        } else {
          toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to access this page.' });
          router.push('/');
          setEffectiveAuthStatus('unauthorized');
        }
      }
    }
  }, [user, authLoading, appUser, router, toast]);

  if (effectiveAuthStatus === 'loading') {
    return <AdminLoaderScreen />;
  }

  if (effectiveAuthStatus === 'unauthenticated' || effectiveAuthStatus === 'unauthorized') {
     return <AccessDeniedScreen />;
  }

  const currentUserAppRole = appUser?.role;
  const canViewUserManagement = currentUserAppRole === 'owner';
  const canViewStandardAdminTabs = currentUserAppRole === 'owner' || currentUserAppRole === 'admin';


  return (
    <Container className="py-8 md:py-12">
      <div className="mb-8 md:mb-10 text-center md:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-primary mb-2">Admin Control Center</h1>
        <p className="text-lg text-muted-foreground">Manage Qentai's content, users, and settings.</p>
      </div>

      <Tabs defaultValue={defaultTabFromUrl} className="w-full">
        {/* Wrapper for horizontal scrolling on mobile */}
        <div className="overflow-x-auto scrollbar-hide mb-8">
          <TabsList className="inline-flex items-center justify-start gap-2 p-1 bg-card rounded-lg shadow-md md:grid md:grid-cols-3 lg:grid-cols-6">
            {/* Note: Removed flex, flex-nowrap, overflow-x-auto, scrollbar-hide from TabsList itself.
                It now defaults to inline-flex which is fine for the scroll wrapper.
                The md:grid and lg:grid-cols-6 will override display for larger screens. */}
            {canViewStandardAdminTabs && (
              <>
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
              </>
            )}
            {canViewUserManagement && (
              <TabsTrigger value="user-management" className="admin-tab-trigger">
                <UsersRound className="w-5 h-5 mr-2" /> Users
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {canViewStandardAdminTabs && (
          <>
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
          </>
        )}
        {canViewUserManagement && (
          <TabsContent value="user-management">
            <UserManagementTab />
          </TabsContent>
        )}
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

