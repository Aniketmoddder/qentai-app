
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, UserCircle, ChevronDown, LogOut, Settings, Shield, Home } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';


interface AdminHeaderProps {
  setIsSidebarOpen: (isOpen: boolean) => void;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  currentAppUserRole?: 'owner' | 'admin' | 'member';
}

export default function AdminHeader({
  setIsSidebarOpen,
  userDisplayName,
  userAvatarUrl,
  currentAppUserRole,
}: AdminHeaderProps) {
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log out." });
    }
  };

  const getAvatarFallback = () => {
    if (userDisplayName) return userDisplayName.charAt(0).toUpperCase();
    return 'A';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] px-4 sm:px-6 shadow-sm">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] md:hidden"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open sidebar</span>
        </Button>
        {/* Optionally, add a breadcrumb or title here for larger screens */}
        {/* <h1 className="text-lg font-semibold hidden md:block">Admin Dashboard</h1> */}
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm" asChild className="border-[hsl(var(--sidebar-border))] hover:bg-[hsl(var(--sidebar-accent))] text-xs">
           <Link href="/"><Home size={14} className="mr-1.5"/> View Site</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative flex items-center space-x-2 p-1.5 rounded-full hover:bg-[hsl(var(--sidebar-accent))]">
              <Avatar className="h-8 w-8 border border-[hsl(var(--sidebar-border))]">
                <AvatarImage src={userAvatarUrl || undefined} alt={userDisplayName || 'Admin'} />
                <AvatarFallback className="bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]">
                  {getAvatarFallback()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-[hsl(var(--sidebar-foreground))] sm:inline-block">
                {userDisplayName || 'Admin'}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-[hsl(var(--sidebar-foreground))/70 sm:inline-block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover border-[hsl(var(--border))]" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium leading-none text-foreground">
                  {userDisplayName || 'Admin User'}
                </p>
                {currentAppUserRole && (
                    <p className="text-xs leading-none text-muted-foreground capitalize flex items-center">
                        <Shield size={12} className="mr-1 text-primary"/> {currentAppUserRole}
                    </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[hsl(var(--border))]" />
            <DropdownMenuItem asChild className="cursor-pointer hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]">
              <Link href="/profile/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                User Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[hsl(var(--border))]" />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/20 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
