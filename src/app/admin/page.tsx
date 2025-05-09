
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Container from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { fetchAnimeDetailsFromTMDB } from '@/services/tmdbService';
import { addAnimeToFirestore } from '@/services/animeService';
import type { Anime } from '@/types/anime';
import { Loader2, AlertCircle, Tv, Film } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ADMIN_EMAIL = 'ninjax.desi@gmail.com';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [tmdbId, setTmdbId] = useState('');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('tv');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedAnime, setFetchedAnime] = useState<Partial<Anime> | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/admin');
        setIsAuthorized(false);
      } else if (user.email !== ADMIN_EMAIL) {
        toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to access this page.' });
        router.push('/');
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, authLoading, router, toast]);

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
      const animeDataToAdd: Omit<Anime, 'id'> = {
        tmdbId: fetchedAnime.tmdbId,
        title: fetchedAnime.title,
        coverImage: fetchedAnime.coverImage || '',
        bannerImage: fetchedAnime.bannerImage,
        year: fetchedAnime.year || 0,
        genre: fetchedAnime.genre || [],
        status: fetchedAnime.status || 'Unknown',
        synopsis: fetchedAnime.synopsis || '',
        averageRating: fetchedAnime.averageRating,
        episodes: fetchedAnime.episodes || [],
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
  
  if (authLoading || isAuthorized === null) {
    return (
      <Container className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </Container>
    );
  }

  if(!isAuthorized && !authLoading){
     return (
      <Container className="py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </Container>
    );
  }


  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold mb-8 text-foreground">Admin Panel</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add Anime/Movie from TMDB</CardTitle>
          <CardDescription>Enter the TMDB ID and select the media type to fetch details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFetchTMDB} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <Label htmlFor="tmdbId">TMDB ID</Label>
                <Input
                  id="tmdbId"
                  type="text"
                  value={tmdbId}
                  onChange={(e) => setTmdbId(e.target.value)}
                  placeholder="e.g., 1396 (Breaking Bad) or 603 (The Matrix)"
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
                    <SelectItem value="tv"><div className="flex items-center"><Tv className="mr-2 h-4 w-4"/> TV Show</div></SelectItem>
                    <SelectItem value="movie"><div className="flex items-center"><Film className="mr-2 h-4 w-4"/> Movie</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Fetch from TMDB'}
              </Button>
            </div>
             {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>

      {fetchedAnime && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Details: {fetchedAnime.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="md:flex md:space-x-6">
              {fetchedAnime.coverImage && (
                <div className="w-full md:w-1/4 mb-4 md:mb-0">
                  <Image src={fetchedAnime.coverImage} alt={fetchedAnime.title || 'Cover'} width={200} height={300} className="rounded-lg object-cover mx-auto md:mx-0" />
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
                  <p><span className="font-semibold">Note:</span> This is a movie. Video URL will need to be added manually if this system supports direct playback.</p>
                )}
              </div>
            </div>
            <Button onClick={handleAddAnimeToDB} disabled={isLoading} className="w-full btn-primary-gradient">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Add "${fetchedAnime.title}" to Qentai DB`}
            </Button>
          </CardContent>
        </Card>
      )}
      {/* TODO: User Management Section will go here */}
    </Container>
  );
}
