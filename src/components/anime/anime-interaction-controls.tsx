
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
  
  const [loadingFavoriteToggle, setLoadingFavoriteToggle] = useState(false); // For favorite toggle action
  const [loadingWishlistToggle, setLoadingWishlistToggle] = useState(false); // For wishlist toggle action
  
  const [isCheckingInitialStatus, setIsCheckingInitialStatus] = useState(true); // For initial status check

  const checkStatus = useCallback(async () => {
    if (!user || !anime.id) {
      setIsFavorited(false);
      setIsInWishlisted(false);
      setIsCheckingInitialStatus(false);
      return;
    }

    setIsCheckingInitialStatus(true);
    try {
      const favStatus = await isFavorite(user.uid, anime.id);
      setIsFavorited(favStatus);
      const wishStatus = await isInWishlist(user.uid, anime.id);
      setIsInWishlisted(wishStatus);
    } catch (error: any) {
      console.error("Error checking initial status:", error);
      let description = "Could not check favorite/wishlist status. Please try again.";
      if (error.message && error.message.toLowerCase().includes('offline')) {
        description = "You appear to be offline. Please check your connection and try to refresh.";
      }
      toast({ variant: "destructive", title: "Status Check Failed", description });
      setIsFavorited(false); // Default to false on error
      setIsInWishlisted(false); // Default to false on error
    } finally {
      setIsCheckingInitialStatus(false);
    }
  }, [user, anime.id, toast]);

  useEffect(() => {
    if (user && anime.id) {
      checkStatus();
    } else {
      // If no user or no anime.id, no need to check, ensure loading is false.
      setIsCheckingInitialStatus(false);
      setIsFavorited(false);
      setIsInWishlisted(false);
    }
  }, [user, anime.id, checkStatus]);


  const handleFavoriteToggle = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to add to favorites." });
      return;
    }
    setLoadingFavoriteToggle(true);
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
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      let description = "Could not update favorites. Please try again.";
       if (error.message && error.message.toLowerCase().includes('offline')) {
        description = "Action failed: You appear to be offline. Please check your connection.";
      }
      toast({ variant: "destructive", title: "Error", description });
    } finally {
      setLoadingFavoriteToggle(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to add to wishlist." });
      return;
    }
    setLoadingWishlistToggle(true);
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
    } catch (error: any) {
      console.error("Error toggling wishlist:", error);
      let description = "Could not update wishlist. Please try again.";
      if (error.message && error.message.toLowerCase().includes('offline')) {
        description = "Action failed: You appear to be offline. Please check your connection.";
      }
      toast({ variant: "destructive", title: "Error", description });
    } finally {
      setLoadingWishlistToggle(false);
    }
  };
  
  const renderButtons = () => {
    if (isCheckingInitialStatus) {
        return (
            <>
                <Button variant="outline" size="lg" className="w-full" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Status...
                </Button>
                <Button variant="outline" size="lg" className="w-full" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Status...
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
          disabled={loadingFavoriteToggle}
        >
          {loadingFavoriteToggle ? (
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
          disabled={loadingWishlistToggle}
        >
          {loadingWishlistToggle ? (
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
