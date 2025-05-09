
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AnimeCard from '@/components/anime/anime-card';
import type { Anime } from '@/types/anime';
import { mockAnimeData } from '@/lib/mock-data';
import { getUserFavoriteIds, getUserWishlistIds } from '@/services/userDataService';
import { Loader2, User, Heart, Bookmark } from 'lucide-react';
import Container from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('favorites');
  const [favoritesList, setFavoritesList] = useState<Anime[]>([]);
  const [wishlistList, setWishlistList] = useState<Anime[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchLists = async () => {
      if (user) {
        setIsLoadingLists(true);
        try {
          const favoriteIds = await getUserFavoriteIds(user.uid);
          const wishlistIds = await getUserWishlistIds(user.uid);

          const resolvedFavorites = favoriteIds
            .map(id => mockAnimeData.find(anime => anime.id === id))
            .filter((anime): anime is Anime => anime !== undefined);
          setFavoritesList(resolvedFavorites);

          const resolvedWishlist = wishlistIds
            .map(id => mockAnimeData.find(anime => anime.id === id))
            .filter((anime): anime is Anime => anime !== undefined);
          setWishlistList(resolvedWishlist);

        } catch (error) {
          console.error("Failed to fetch user lists:", error);
          // Potentially set an error state here to show in UI
        } finally {
          setIsLoadingLists(false);
        }
      }
    };

    if (user) {
      fetchLists();
    }
  }, [user]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <Container className="flex items-center justify-center min-h-[calc(100vh-var(--header-height)-1px)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </Container>
    );
  }
  
  if (!user) return null; // Should be redirected, but as a fallback

  const renderAnimeList = (list: Anime[], type: 'favorite' | 'wishlist') => {
    if (isLoadingLists) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="w-[45vw] max-w-[180px] h-[270px] bg-card rounded-lg p-2">
              <Skeleton className="w-full h-[200px] rounded-md bg-muted" />
              <Skeleton className="w-3/4 h-4 mt-2 rounded-md bg-muted" />
              <Skeleton className="w-1/2 h-3 mt-1 rounded-md bg-muted" />
            </div>
          ))}
        </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
        {list.map(anime => (
          <AnimeCard key={anime.id} anime={anime} />
        ))}
      </div>
    );
  };

  return (
    <Container className="py-8 min-h-[calc(100vh-var(--header-height)-var(--footer-height)-1px)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 pb-6 border-b border-border">
        <User className="w-16 h-16 sm:w-20 sm:h-20 text-primary bg-card p-3 rounded-full" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">My Profile</h1>
          {user.email && <p className="text-muted-foreground text-sm sm:text-base">{user.email}</p>}
        </div>
      </div>

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
