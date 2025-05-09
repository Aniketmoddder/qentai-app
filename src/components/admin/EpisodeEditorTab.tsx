
'use client';

import React, { useEffect, useState } from 'react';
import { getAllAnimes, updateAnimeEpisode } from '@/services/animeService';
import type { Anime, Episode } from '@/types/anime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, AlertCircle, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function EpisodeEditorTab() {
  const [allAnimes, setAllAnimes] = useState<Anime[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingAnimes, setIsLoadingAnimes] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllAnimes = async () => {
      setIsLoadingAnimes(true);
      setError(null);
      try {
        const animes = await getAllAnimes(200); // Fetch a larger list for select
        setAllAnimes(animes);
      } catch (err) {
        console.error('Failed to fetch animes for editor:', err);
        setError('Could not load anime list.');
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load anime list for editor.' });
      } finally {
        setIsLoadingAnimes(false);
      }
    };
    fetchAllAnimes();
  }, [toast]);

  const handleAnimeSelect = (animeId: string) => {
    setError(null);
    const anime = allAnimes.find(a => a.id === animeId);
    if (anime) {
      setSelectedAnime(anime);
      setEpisodes(anime.episodes || []); // Initialize with current episodes or empty array
    } else {
      setSelectedAnime(null);
      setEpisodes([]);
    }
  };

  const handleEpisodeUrlChange = (episodeId: string, newUrl: string) => {
    setEpisodes(prevEpisodes =>
      prevEpisodes.map(ep =>
        ep.id === episodeId ? { ...ep, url: newUrl } : ep
      )
    );
  };

  const handleSaveEpisodeUrl = async (episode: Episode) => {
    if (!selectedAnime || !episode.url) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing anime selection or episode URL.' });
      return;
    }
    setIsLoadingEpisodes(true); // Indicate saving for this specific episode action
    try {
      await updateAnimeEpisode(selectedAnime.id, episode.id, { url: episode.url });
      toast({ title: 'Episode Updated', description: `URL for ${selectedAnime.title} - Episode ${episode.episodeNumber} saved.` });
      // Optional: refetch selectedAnime to ensure episodes state is in sync if backend modifies more
    } catch (err) {
      console.error('Failed to save episode URL:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Save Error', description: `Failed to save URL: ${errorMessage}` });
      // Revert optimistic update if needed, or refetch
       if(selectedAnime) setEpisodes(selectedAnime.episodes || []);
    } finally {
      setIsLoadingEpisodes(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Episode Editor</CardTitle>
        <CardDescription>Select an anime to view and edit its episode video URLs.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label htmlFor="anime-select">Select Anime/Movie</Label>
          <Select
            onValueChange={handleAnimeSelect}
            disabled={isLoadingAnimes || allAnimes.length === 0}
          >
            <SelectTrigger id="anime-select" className="bg-input">
              <SelectValue placeholder={isLoadingAnimes ? "Loading animes..." : "Select an anime/movie"} />
            </SelectTrigger>
            <SelectContent>
              {allAnimes.length > 0 ? (
                allAnimes.map(anime => (
                  <SelectItem key={anime.id} value={anime.id}>
                    {anime.title} ({anime.year}) - {anime.type}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-anime" disabled>No animes found</SelectItem>
              )}
            </SelectContent>
          </Select>
          {isLoadingAnimes && <Loader2 className="mt-2 h-4 w-4 animate-spin" />}
        </div>

        {error && <p className="text-destructive mb-4"><AlertCircle className="inline mr-1 h-4 w-4" />{error}</p>}

        {selectedAnime && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              Episodes for: {selectedAnime.title}
            </h3>
            {episodes.length === 0 ? (
              <p className="text-muted-foreground">No episodes found for this anime, or it's a movie.</p>
            ) : (
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-4">
                  {episodes.map((episode, index) => (
                    <Card key={episode.id || index} className="p-3 bg-card/70">
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-grow space-y-1">
                          <Label htmlFor={`ep-url-${episode.id}`}>
                            Ep. {episode.episodeNumber}: {episode.title} (Season {episode.seasonNumber || 1})
                          </Label>
                          <Input
                            id={`ep-url-${episode.id}`}
                            type="url"
                            placeholder="Enter video URL (e.g., .mp4, .m3u8)"
                            value={episode.url || ''}
                            onChange={(e) => handleEpisodeUrlChange(episode.id, e.target.value)}
                            className="bg-input"
                          />
                        </div>
                        <Button
                          onClick={() => handleSaveEpisodeUrl(episode)}
                          disabled={isLoadingEpisodes || !episode.url}
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          {isLoadingEpisodes ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                          Save URL
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
             {selectedAnime.type === 'Movie' && episodes.length > 0 && (
                <Card className="mt-4 p-3 bg-card/70">
                     <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-grow space-y-1">
                          <Label htmlFor={`movie-url-${episodes[0].id}`}>
                            Movie: {episodes[0].title}
                          </Label>
                          <Input
                            id={`movie-url-${episodes[0].id}`}
                            type="url"
                            placeholder="Enter video URL (e.g., .mp4, .m3u8)"
                            value={episodes[0].url || ''}
                            onChange={(e) => handleEpisodeUrlChange(episodes[0].id, e.target.value)}
                            className="bg-input"
                          />
                        </div>
                        <Button
                          onClick={() => handleSaveEpisodeUrl(episodes[0])}
                          disabled={isLoadingEpisodes || !episodes[0].url}
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          {isLoadingEpisodes ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                          Save URL
                        </Button>
                      </div>
                </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
