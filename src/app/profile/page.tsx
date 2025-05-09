'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnimeCard from '@/components/anime/anime-card';
import type { Anime } from '@/types/anime';
import { mockAnimeData } from '@/lib/mock-data';
import { getUserFavoriteIds, getUserWishlistIds } from '@/services/userDataService';
import { Loader2, User, Heart, Bookmark, AlertCircle, RotateCcw } from 'lucide-react';
import Container from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { FirestoreError } from 'firebase/firestore';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('favorites');
  const [favoritesList, setFavoritesList] = useState<Anime[]>([]);
  const [wishlistList, setWishlistList] = useState<Anime[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof FirestoreError) {
      if (error.code === 'unavailable' || error.message.toLowerCase().includes('offline')) {
        return "Network error. Could not fetch your lists. Please check your internet connection and try again.";
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

  const fetchLists = useCallback(async () => {
    if (user) {
      setIsLoadingLists(true);
      setListError(null);
      try {
        const [favoriteIds, wishlistIds] = await Promise.all([
          getUserFavoriteIds(user.uid),
          getUserWishlistIds(user.uid)
        ]);

        const resolvedFavorites = favoriteIds
          .map(id => mockAnimeData.find(anime => anime.id === id))
          .filter((anime): anime is Anime => anime !== undefined);
        setFavoritesList(resolvedFavorites);

        const resolvedWishlist = wishlistIds
          .map(id => mockAnimeData.find(anime => anime.id === id))
          .filter((anime): anime is Anime => anime !== undefined);
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
    if (user) {
      fetchLists();
    }
  }, [user, fetchLists]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <Container className="flex items-center justify-center min-h-[calc(100vh-var(--header-height)-1px)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </Container>
    );
  }
  
  if (!user) return null; // Should be redirected

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
    if (listError && type === activeTab) { // Show error only for the active tab if it's the one failing, or a general one if needed
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
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">My Profile</h1>
          {user.email && <p className="text-muted-foreground text-sm sm:text-base">{user.email}</p>}
        </div>
      </div>
      
      {listError && !isLoadingLists && activeTab === '' && ( 
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
        <TabsList className="grid w-full grid-cols-2 md:max-w-md mb-6">
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Heart className="w-4 h-4" /> Favorites
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="flex items-center gap-2">
            <Bookmark className="w-4 h-4" /> Wishlist
          </TabsTrigger>
        </TabsList>
        <TabsContent value="favorites">
          {renderAnimeList(favoritesList, 'favorite')}
        </TabsContent>
        <TabsContent value="wishlist">
          {renderAnimeList(wishlistList, 'wishlist')}
        </TabsContent>
      </Tabs>
    </Container>
  );
}