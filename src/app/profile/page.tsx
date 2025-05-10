
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnimeCard from '@/components/anime/anime-card';
import type { Anime } from '@/types/anime';
import { getUserFavoriteIds, getUserWishlistIds } from '@/services/userDataService';
import { getAnimesByIds } from '@/services/animeService';
import { Loader2, User, Heart, Bookmark, AlertCircle, RotateCcw, Settings } from 'lucide-react';
import Container from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { FirestoreError } from 'firebase/firestore';
import AccountSettingsTab from '@/components/profile/AccountSettingsTab';

export default function ProfilePage() {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('favorites');
  const [favoritesList, setFavoritesList] = useState<Anime[]>([]);
  const [wishlistList, setWishlistList] = useState<Anime[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/profile');
    }
  }, [user, authLoading, router]);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof FirestoreError) {
      if (error.code === 'unavailable' || error.message.toLowerCase().includes('offline')) {
        return "Network error. Could not fetch your lists. Please check your internet connection and try again. Also, ensure Firestore is enabled in your Firebase project console.";
      }
      if (error.code === 'permission-denied') {
        return "Permission denied. Unable to load your lists.";
      }
      return `Error fetching lists: ${error.message} (Code: ${error.code})`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "An unknown error occurred while fetching your lists. Please try again later.";
  };

  const fetchFullAnimeDetails = async (ids: string[]): Promise<Anime[]> => {
    if (ids.length === 0) return [];
    // Using getAnimesByIds for batch fetching
    return getAnimesByIds(ids);
  };

  const fetchLists = useCallback(async () => {
    if (user) {
      setIsLoadingLists(true);
      setListError(null);
      try {
        const [favoriteIds, wishlistIds] = await Promise.all([
          getUserFavoriteIds(user.uid),
          getUserWishlistIds(user.uid)
        ]);

        const [resolvedFavorites, resolvedWishlist] = await Promise.all([
          fetchFullAnimeDetails(favoriteIds),
          fetchFullAnimeDetails(wishlistIds),
        ]);
        
        setFavoritesList(resolvedFavorites);
        setWishlistList(resolvedWishlist);

      } catch (error: unknown) {
        console.error("Failed to fetch user lists:", error);
        const message = getErrorMessage(error);
        setListError(message);
      } finally {
        setIsLoadingLists(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && (activeTab === 'favorites' || activeTab === 'wishlist')) {
      fetchLists();
    }
  }, [user, fetchLists, activeTab]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <Container className="flex items-center justify-center min-h-[calc(100vh-var(--header-height)-1px)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </Container>
    );
  }
  
  if (!user || !appUser) return null; 

  const renderAnimeList = (list: Anime[], type: 'favorite' | 'wishlist') => {
    if (isLoadingLists) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-4 sm:gap-x-4 place-items-center sm:place-items-stretch">
          {[...Array(6)].map((_, index) => (
             <div key={index} className="w-full">
                <Skeleton className="w-full aspect-[2/3] rounded-lg bg-muted" />
                <Skeleton className="w-3/4 h-4 mt-2 rounded-md bg-muted" />
                <Skeleton className="w-1/2 h-3 mt-1 rounded-md bg-muted" />
            </div>
          ))}
        </div>
      );
    }
    if (listError && (type === 'favorite' && activeTab === 'favorites' || type === 'wishlist' && activeTab === 'wishlist')) { 
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading {type === 'favorite' ? 'Favorites' : 'Wishlist'}</AlertTitle>
          <AlertDescription>
            {listError}
            <Button variant="outline" size="sm" onClick={fetchLists} className="mt-3 ml-auto">
              <RotateCcw className="mr-2 h-3 w-3" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    if (list.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <p>
            {type === 'favorite'
              ? "You haven't added any anime to your favorites yet."
              : "Your wishlist is empty."}
          </p>
          <p>Explore anime and add some to your list!</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-4 sm:gap-x-4 place-items-center sm:place-items-stretch">
        {list.map(anime => (
          <AnimeCard key={anime.id} anime={anime} />
        ))}
      </div>
    );
  };

  return (
    <Container className="py-8 min-h-[calc(100vh-var(--header-height,4rem)-var(--footer-height,0px)-1px)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 pb-6 border-b border-border">
        <User className="w-16 h-16 sm:w-20 sm:h-20 text-primary bg-card p-3 rounded-full" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">{appUser.fullName || appUser.displayName || 'User Profile'}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">@{appUser.username || appUser.email?.split('@')[0]}</p>
          {user.email && <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">{user.email}</p>}
        </div>
      </div>
      
      {listError && !isLoadingLists && (activeTab === 'favorites' || activeTab === 'wishlist') && ( 
         <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Lists</AlertTitle>
            <AlertDescription>
              {listError}
              <Button variant="outline" size="sm" onClick={fetchLists} className="mt-3 ml-auto">
                <RotateCcw className="mr-2 h-3 w-3" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap justify-start gap-1 p-1 mb-6 rounded-md bg-muted text-muted-foreground">
          <TabsTrigger value="favorites" className="flex-auto sm:flex-initial data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-sm px-3 py-1.5 text-sm font-medium flex items-center gap-2">
            <Heart className="w-4 h-4" /> Favorites
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="flex-auto sm:flex-initial data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-sm px-3 py-1.5 text-sm font-medium flex items-center gap-2">
            <Bookmark className="w-4 h-4" /> Wishlist
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-auto sm:flex-initial data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-sm px-3 py-1.5 text-sm font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" /> Account
          </TabsTrigger>
        </TabsList>
        <TabsContent value="favorites">
          {renderAnimeList(favoritesList, 'favorite')}
        </TabsContent>
        <TabsContent value="wishlist">
          {renderAnimeList(wishlistList, 'wishlist')}
        </TabsContent>
         <TabsContent value="settings">
          <AccountSettingsTab />
        </TabsContent>
      </Tabs>
    </Container>
  );
}

