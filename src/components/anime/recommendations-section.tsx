"use client";

import { useEffect, useState } from 'react';
import { generateAnimeRecommendations } from '@/ai/flows/generate-anime-recommendations';
import type { Anime, AnimeRecommendation } from '@/types/anime'; // Using Anime for display card
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { mockAnimeData } from '@/lib/mock-data'; // For placeholder display

// Simulate user watch history
const mockWatchHistory = ['Attack on Titan', 'Jujutsu Kaisen'];

export default function RecommendationsSection() {
  const [recommendations, setRecommendations] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // This assumes the user is authenticated and watchHistory is available.
      // For now, using mockWatchHistory.
      const result = await generateAnimeRecommendations({ watchHistory: mockWatchHistory });
      
      // The AI flow returns titles. We need to map these to full Anime objects.
      // This is a placeholder: in a real app, you'd fetch details for these titles.
      const detailedRecommendations = result.recommendations
        .map(title => mockAnimeData.find(anime => anime.title.toLowerCase().includes(title.toLowerCase())) || {
          id: title.replace(/\s+/g, '-').toLowerCase(), // crude id
          title: title,
          coverImage: `https://picsum.photos/seed/${title.replace(/\s+/g, '')}/300/450`,
          year: new Date().getFullYear(),
          genre: ['Recommended'],
          status: 'Ongoing', // Default status
          synopsis: `An exciting anime recommended just for you: ${title}.`,
          type: 'TV',
        } as Anime)
        .filter(anime => anime !== undefined) as Anime[];

      setRecommendations(detailedRecommendations.slice(0, 5)); // Limit to 5 recommendations
    } catch (e) {
      console.error("Failed to fetch recommendations:", e);
      setError("Could not load recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recommendations on component mount or when watch history changes (if real)
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="bg-card p-4 rounded-lg shadow-md animate-pulse">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recommendations.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </section>
  );
}
