
'use client';

import type { Anime } from '@/types/anime';
import { Button } from '@/components/ui/button';
import { Heart, Bookmark, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useEffect, useCallback } from 'react';
import {
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
} from '@/services/userDataService';

interface AnimeInteractionControlsProps {
  anime: Anime;
}

export default function AnimeInteractionControls({ anime }: AnimeInteractionControlsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isFavorited, setIsFavorited] = useState(false);
  const [isInWishlisted, setIsInWishlisted] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);


  const checkStatus = useCallback(async () => {
    if (user && anime.id) {
      setLoadingFavorite(true);
      setLoadingWishlist(true);
      try {
        const favStatus = await isFavorite(user.uid, anime.id);
        setIsFavorited(favStatus);
        const wishStatus = await isInWishlist(user.uid, anime.id);
        setIsInWishlisted(wishStatus);
      } catch (error) {
        console.error("Error checking status:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not check favorite/wishlist status." });
      } finally {
        setLoadingFavorite(false);
        setLoadingWishlist(false);
        setInitialCheckDone(true);
      }
    } else {
      setIsFavorited(false);
      setIsInWishlisted(false);
      if (user) setInitialCheckDone(true); // If user is present but no anime.id (should not happen here)
    }
  }, [user, anime.id, toast]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);


  const handleFavoriteToggle = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to add to favorites." });
      return;
    }
    setLoadingFavorite(true);
    try {
      if (isFavorited) {
        await removeFromFavorites(user.uid, anime.id);
        setIsFavorited(false);
        toast({ title: "Removed from Favorites", description: `${anime.title} has been removed from your favorites.` });
      } else {
        await addToFavorites(user.uid, anime.id);
        setIsFavorited(true);
        toast({ title: "Added to Favorites", description: `${anime.title} has been added to your favorites.` });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update favorites. Please try again." });
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to add to wishlist." });
      return;
    }
    setLoadingWishlist(true);
    try {
      if (isInWishlisted) {
        await removeFromWishlist(user.uid, anime.id);
        setIsInWishlisted(false);
        toast({ title: "Removed from Wishlist", description: `${anime.title} has been removed from your wishlist.` });
      } else {
        await addToWishlist(user.uid, anime.id);
        setIsInWishlisted(true);
        toast({ title: "Added to Wishlist", description: `${anime.title} has been added to your wishlist.` });
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update wishlist. Please try again." });
    } finally {
      setLoadingWishlist(false);
    }
  };
  
  const renderButtons = () => {
    if (!initialCheckDone && user) {
        return (
            <>
                <Button variant="outline" size="lg" className="w-full" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </Button>
                <Button variant="outline" size="lg" className="w-full" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </Button>
            </>
        );
    }
     if (!user) {
      return (
        <>
          <Button variant="outline" size="lg" className="w-full" onClick={() => toast({ title: 'Login Required', description: 'Please log in to manage your favorites.'})}>
            <Heart className="mr-2" /> Add to Favorites
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={() => toast({ title: 'Login Required', description: 'Please log in to manage your wishlist.'})}>
            <Bookmark className="mr-2" /> Add to Wishlist
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleFavoriteToggle}
          disabled={loadingFavorite}
        >
          {loadingFavorite ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Heart className={`mr-2 ${isFavorited ? 'fill-destructive text-destructive' : ''}`} />
          )}
          {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleWishlistToggle}
          disabled={loadingWishlist}
        >
          {loadingWishlist ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bookmark className={`mr-2 ${isInWishlisted ? 'fill-primary text-primary' : ''}`} />
          )}
          {isInWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        </Button>
      </>
    );
  };


  return <div className="mt-4 space-y-2">{renderButtons()}</div>;
}
