
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { fetchAnimeDetailsFromTMDB } from '@/services/tmdbService';
import { addAnimeToFirestore } from '@/services/animeService';
import type { Anime } from '@/types/anime';
import { Loader2, Film, Tv as TvIcon } from 'lucide-react'; // Renamed Tv to TvIcon to avoid conflict
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TmdbImportTab() {
  const { toast } = useToast();

  const [tmdbId, setTmdbId] = useState('');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('tv');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedAnime, setFetchedAnime] = useState<Partial<Anime> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchTMDB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmdbId) {
      setError('Please enter a TMDB ID.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setFetchedAnime(null);
    try {
      const details = await fetchAnimeDetailsFromTMDB(tmdbId, mediaType);
      if (details) {
        setFetchedAnime(details);
        toast({ title: 'Data Fetched', description: `Successfully fetched ${details.title} from TMDB.` });
      } else {
        setError(`Could not find ${mediaType === 'tv' ? 'TV show' : 'movie'} with ID ${tmdbId} on TMDB.`);
        toast({ variant: 'destructive', title: 'Fetch Failed', description: `Could not find ${mediaType === 'tv' ? 'TV show' : 'movie'} with ID ${tmdbId} on TMDB.` });
      }
    } catch (err) {
      console.error('Error fetching from TMDB:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching from TMDB.';
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'Fetch Error', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAnimeToDB = async () => {
    if (!fetchedAnime || !fetchedAnime.title) return;
    setIsLoading(true);
    setError(null);
    try {
      // Ensure all required fields for Anime are present, providing defaults if necessary
      const animeDataToAdd: Omit<Anime, 'id'> = {
        tmdbId: fetchedAnime.tmdbId,
        title: fetchedAnime.title,
        coverImage: fetchedAnime.coverImage || '', // Default to empty string if not present
        bannerImage: fetchedAnime.bannerImage, // Can be undefined
        year: fetchedAnime.year || new Date().getFullYear(), // Default to current year
        genre: fetchedAnime.genre || [], // Default to empty array
        status: fetchedAnime.status || 'Unknown', // Default status
        synopsis: fetchedAnime.synopsis || '', // Default to empty string
        averageRating: fetchedAnime.averageRating, // Can be undefined
        episodes: fetchedAnime.episodes || [], // Default to empty array
        type: fetchedAnime.type || (mediaType === 'tv' ? 'TV' : 'Movie'),
        sourceAdmin: 'tmdb',
      };
      
      const newAnimeId = await addAnimeToFirestore(animeDataToAdd);
      toast({ title: 'Anime Added', description: `${fetchedAnime.title} successfully added to Firestore with ID: ${newAnimeId}.` });
      setFetchedAnime(null);
      setTmdbId('');
    } catch (err) {
      console.error('Error adding anime to Firestore:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while saving to Firestore.';
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'Save Error', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from TMDB</CardTitle>
        <CardDescription>Fetch anime or movie details from The Movie Database and add to Qentai.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFetchTMDB} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="tmdbId">TMDB ID</Label>
              <Input
                id="tmdbId"
                type="text"
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
                placeholder="e.g., 1396 (TV) or 603 (Movie)"
                className="bg-input"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mediaType">Media Type</Label>
              <Select value={mediaType} onValueChange={(value) => setMediaType(value as 'movie' | 'tv')}>
                <SelectTrigger id="mediaType" className="bg-input">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tv"><div className="flex items-center"><TvIcon className="mr-2 h-4 w-4"/> TV Show</div></SelectItem>
                  <SelectItem value="movie"><div className="flex items-center"><Film className="mr-2 h-4 w-4"/> Movie</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Fetch from TMDB'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </form>

        {fetchedAnime && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Confirm Details: {fetchedAnime.title}</h3>
            <div className="md:flex md:space-x-6">
              {fetchedAnime.coverImage && (
                <div className="w-full md:w-1/4 mb-4 md:mb-0">
                   <Image 
                    src={fetchedAnime.coverImage} 
                    alt={fetchedAnime.title || 'Cover'} 
                    width={200} 
                    height={300} 
                    className="rounded-lg object-cover mx-auto md:mx-0 shadow-md"
                    data-ai-hint="anime movie poster" 
                    />
                </div>
              )}
              <div className="md:w-3/4 space-y-3">
                <p><span className="font-semibold">Year:</span> {fetchedAnime.year}</p>
                <p><span className="font-semibold">Type:</span> {fetchedAnime.type}</p>
                <p><span className="font-semibold">Status:</span> <Badge>{fetchedAnime.status}</Badge></p>
                <p><span className="font-semibold">Rating:</span> {fetchedAnime.averageRating || 'N/A'}</p>
                <div className="space-x-1">
                  <span className="font-semibold">Genres:</span>
                  {fetchedAnime.genre?.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}
                </div>
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Synopsis:</span> {fetchedAnime.synopsis}</p>
                {fetchedAnime.type === 'TV' && fetchedAnime.episodes && (
                  <p><span className="font-semibold">Episodes Found:</span> {fetchedAnime.episodes.length}</p>
                )}
                 {fetchedAnime.type === 'Movie' && (
                  <p><span className="font-semibold">Note:</span> This is a movie. Video URL will need to be added if this system supports direct playback for movies.</p>
                )}
              </div>
            </div>
            <Button onClick={handleAddAnimeToDB} disabled={isLoading} className="w-full mt-6 btn-primary-gradient">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Add "${fetchedAnime.title}" to Qentai DB`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
