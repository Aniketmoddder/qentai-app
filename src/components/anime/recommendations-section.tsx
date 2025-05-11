
"use client";

import { useEffect, useState, useCallback } from 'react';
import { generateAnimeRecommendations } from '@/ai/flows/generate-anime-recommendations';
import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import AnimeCardSkeleton from './AnimeCardSkeleton'; 
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAllAnimes } from '@/services/animeService'; // To find existing anime

// Simulate user watch history - replace with actual user data in a real app
const mockWatchHistoryTitles = ['Attack on Titan', 'Solo Leveling', 'One Punch Man']; // Titles the user has watched

export default function RecommendationsSection() {
  const [recommendations, setRecommendations] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allAnimesCache, setAllAnimesCache] = useState<Anime[]>([]);

  const fetchAllAnimesForMatching = useCallback(async () => {
    try {
      // Fetch a larger number to have a good catalog for the AI
      const animesFromDB = await getAllAnimes({ count: 200, filters: {} }); 
      setAllAnimesCache(animesFromDB);
    } catch (e) {
      console.error("Failed to fetch all animes for recommendation matching:", e);
      setError("Could not load anime catalog for recommendations. Please try again.");
    }
  }, []);

  useEffect(() => {
    fetchAllAnimesForMatching();
  }, [fetchAllAnimesForMatching]);

  const fetchRecommendations = useCallback(async () => {
    if (allAnimesCache.length === 0) {
      setError("Anime catalog is not loaded yet. Cannot fetch recommendations.");
      setIsLoading(false); 
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const availableAnimeTitles = allAnimesCache.map(anime => anime.title);
      const result = await generateAnimeRecommendations({ 
        watchHistory: mockWatchHistoryTitles,
        availableAnimeTitles 
      });
      
      const detailedRecommendations = result.recommendations
        .map(title => {
          return allAnimesCache.find(anime => 
            anime.title.toLowerCase() === title.toLowerCase()
          );
        })
        .filter((anime): anime is Anime => anime !== undefined); 

      setRecommendations(detailedRecommendations.slice(0, 5)); 
    } catch (e: any) {
      console.error("Failed to fetch recommendations:", e);
      let errorMessage = "Could not load recommendations. Please try again.";
      if (e && e.message) {
        if (e.message.includes("503") || e.message.toLowerCase().includes("service unavailable")) {
          errorMessage = "The recommendation service is temporarily unavailable. Please try again later.";
        } else {
          errorMessage = e.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [allAnimesCache]); 

  // Fetch recommendations once the cache is populated
  useEffect(() => {
    if (allAnimesCache.length > 0 && recommendations.length === 0 && !isLoading && !error) { 
      fetchRecommendations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnimesCache, fetchRecommendations]); 

  return (
    <section className="py-6 md:py-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center section-title-bar">
          <Wand2 className="w-7 h-7 mr-2 text-primary" />
          Recommended For You
        </h2>
        <Button variant="ghost" onClick={fetchRecommendations} disabled={isLoading || allAnimesCache.length === 0}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && recommendations.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-4 sm:gap-x-4 place-items-center sm:place-items-stretch">
          {[...Array(5)].map((_, index) => (
            <AnimeCardSkeleton key={index} />
          ))}
        </div>
      )}

      {!isLoading && recommendations.length === 0 && !error && (
         <div className="text-center py-8 text-muted-foreground">
          <p>No recommendations available right now. Watch some anime to get personalized suggestions!</p>
          <p className="text-xs mt-1">(Or ensure the recommendation AI is working correctly.)</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-4 sm:gap-x-4 place-items-center sm:place-items-stretch">
          {recommendations.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </section>
  );
}

