
'use client';
import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, AlertCircle, GaugeCircle, UsersRound, DownloadCloud, LibraryBig, ListVideo, FilePlus2, Palette, Settings as SettingsIcon, LogOut as LogOutIcon } from 'lucide-react';
import Container from '@/components/layout/container'; // For error/loading states
import { Toaster } from '@/components/ui/toaster'; // Ensure Toaster is available if toasts are used here

export type AdminNavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  isOwnerOnly?: boolean;
  isThemeSettings?: boolean; // Special flag for theme settings
  exactMatch?: boolean; // For precise active link matching
};

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'ninjax.desi@gmail.com';

// Updated nav items to point to distinct pages for each section
export const adminNavItems: AdminNavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: GaugeCircle, exactMatch: true },
  { name: 'Content', href: '/admin/content-management', icon: LibraryBig },
  { name: 'Episodes', href: '/admin/episode-editor', icon: ListVideo },
  { name: 'TMDB Import', href: '/admin/tmdb-import', icon: DownloadCloud },
  { name: 'Manual Add', href: '/admin/manual-add', icon: FilePlus2 },
  { name: 'Users', href: '/admin/user-management', icon: UsersRound, isOwnerOnly: true },
  { name: 'Theme', href: '/admin/theme-settings', icon: Palette, isOwnerOnly: true, isThemeSettings: true },
  // { name: 'App Settings', href: '/admin/app-settings', icon: SettingsIcon },
];

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/admin');
      } else if (appUser && !(appUser.role === 'owner' || appUser.role === 'admin')) {
        router.push('/');
      } else if (appUser === null && user.email !== ADMIN_EMAIL) {
        router.push('/');
      }
    }
  }, [user, appUser, authLoading, router]);

  if (authLoading || (!user && !authLoading) || (user && appUser === undefined)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (appUser && !(appUser.role === 'owner' || appUser.role === 'admin')) || (appUser === null && user?.email !== ADMIN_EMAIL)) {
    // Redirecting immediately can cause issues during render.
    // It's better to show an access denied message or handle redirection in a useEffect in the child page.
    // For simplicity here, we'll show an access denied message.
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold text-destructive text-center">Access Denied</h1>
        <p className="text-muted-foreground text-lg text-center">You do not have permission to view the admin panel.</p>
        <Button onClick={() => router.push('/')} variant="link" className="mt-6">
          Go to Homepage
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Sidebar uses theme variables for background/foreground */}
      <AdminSidebar
        navItems={adminNavItems}
        currentAppUserRole={appUser?.role}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        pathname={pathname}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          currentAppUserRole={appUser?.role}
          setIsSidebarOpen={setIsSidebarOpen}
          userDisplayName={appUser?.displayName || user?.email}
          userAvatarUrl={appUser?.photoURL || user?.photoURL}
        />
        {/* Main content area uses a slightly different background for contrast */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-[hsl(var(--muted)/0.3)]">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
