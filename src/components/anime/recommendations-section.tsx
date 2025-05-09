
"use client";

import { useEffect, useState } from 'react';
import { generateAnimeRecommendations } from '@/ai/flows/generate-anime-recommendations';
import type { Anime, AnimeRecommendation } from '@/types/anime'; // Using Anime for display card
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { mockAnimeData } from '@/lib/mock-data'; // For placeholder display

// Simulate user watch history - updated to reflect reduced mock data
const mockWatchHistory = ['Attack on Titan', 'Solo Leveling'];

export default function RecommendationsSection() {
  const [recommendations, setRecommendations] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateAnimeRecommendations({ watchHistory: mockWatchHistory });
      
      const detailedRecommendations = result.recommendations
        .map(title => {
          const found = mockAnimeData.find(anime => anime.title.toLowerCase().includes(title.toLowerCase()));
          if (found) return found;
          // Create a fallback if not found in the small mock dataset
          return {
            id: title.replace(/\s+/g, '-').toLowerCase() + `-${Math.random().toString(36).substr(2, 5)}`, // more unique id
            title: title,
            coverImage: `https://picsum.photos/seed/${title.replace(/\s+/g, '')}/300/450`,
            bannerImage: `https://picsum.photos/seed/${title.replace(/\s+/g, '')}-banner/1200/400`,
            year: new Date().getFullYear(),
            genre: ['Recommended'],
            status: 'Ongoing',
            synopsis: `An exciting anime recommended just for you: ${title}. Details may be limited.`,
            type: 'TV',
            episodes: [], // No episodes for purely AI generated titles not in mock
            averageRating: Math.floor(Math.random() * (50 - 35) + 35) / 10, // Random rating 3.5-4.9
          } as Anime;
        })
        .filter(anime => anime !== undefined) as Anime[];

      setRecommendations(detailedRecommendations.slice(0, 5));
    } catch (e) {
      console.error("Failed to fetch recommendations:", e);
      setError("Could not load recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

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
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && recommendations.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="bg-card p-2 sm:p-3 rounded-lg shadow-md animate-pulse w-[45vw] max-w-[180px] h-[270px]">
              <div className="aspect-[2/3] bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && recommendations.length === 0 && !error && (
         <div className="text-center py-8 text-muted-foreground">
          <p>No recommendations available right now. Watch some anime to get personalized suggestions!</p>
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

