
"use client";

import { useEffect, useState, useCallback } from 'react';
import { generateAnimeRecommendations } from '@/ai/flows/generate-anime-recommendations';
import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import AnimeCardSkeleton from './AnimeCardSkeleton'; // Import skeleton
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
      const animesFromDB = await getAllAnimes({ count: 100, filters: {} }); // Fetch a decent number for matching
      setAllAnimesCache(animesFromDB);
    } catch (e) {
      console.error("Failed to fetch all animes for recommendation matching:", e);
      // Non-critical error, AI can still generate titles
    }
  }, []);

  useEffect(() => {
    fetchAllAnimesForMatching();
  }, [fetchAllAnimesForMatching]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure allAnimesCache is populated before generating recommendations that rely on it for matching
      if (allAnimesCache.length === 0) {
         await fetchAllAnimesForMatching(); // Ensure cache is populated if empty
      }

      const result = await generateAnimeRecommendations({ watchHistory: mockWatchHistoryTitles });
      
      const detailedRecommendations = result.recommendations
        .map(title => {
          // Try to find the anime in our existing DB (allAnimesCache)
          const foundInDB = allAnimesCache.find(anime => 
            anime.title.toLowerCase() === title.toLowerCase() || 
            anime.title.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(anime.title.toLowerCase())
          );

          if (foundInDB) return foundInDB;
          
          // Create a fallback if not found in the DB
          return {
            id: title.replace(/\s+/g, '-').toLowerCase() + `-${Math.random().toString(36).substr(2, 5)}`,
            title: title,
            coverImage: `https://picsum.photos/seed/${encodeURIComponent(title)}/300/450`,
            bannerImage: `https://picsum.photos/seed/${encodeURIComponent(title)}-banner/1200/400`,
            year: new Date().getFullYear(),
            genre: ['Recommended'],
            status: 'Unknown',
            synopsis: `An exciting anime recommended just for you: ${title}. Details are AI-generated.`,
            type: 'Unknown',
            episodes: [],
            averageRating: parseFloat((Math.random() * (4.9 - 3.5) + 3.5).toFixed(1)),
            sourceAdmin: 'tmdb', // Assuming AI might pull from TMDB-like knowledge
          } as Anime;
        })
        .filter((anime): anime is Anime => anime !== undefined);

      setRecommendations(detailedRecommendations.slice(0, 5)); // Show top 5
    } catch (e) {
      console.error("Failed to fetch recommendations:", e);
      setError("Could not load recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnimesCache]); // Re-fetch if cache changes (though it's fetched once)

  return (
    <section className="py-6 md:py-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center">
          <Wand2 className="w-7 h-7 mr-2 text-primary" />
          Recommended For You
        </h2>
        <Button variant="ghost" onClick={fetchRecommendations} disabled={isLoading}>
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
