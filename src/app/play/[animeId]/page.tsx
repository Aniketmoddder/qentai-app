
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import type { Anime, Episode } from "@/types/anime";
import { getAnimeById } from '@/services/animeService'; 
import Container from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MessageSquareWarning, Loader2, List, Star, PlayCircleIcon } from "lucide-react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Vidstack imports
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import type { MediaPlayerInstance, MediaSrc, MediaViewType, QualitySymbol } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
// Ensure Vidstack CSS is imported in globals.css or layout

// Helper to determine if a URL is M3U8
const isM3U8 = (url: string) => url.toLowerCase().endsWith('.m3u8');

export default function PlayerPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const animeId = params.animeId as string;

  const [anime, setAnime] = useState<Anime | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerKey, setPlayerKey] = useState(0); // To force re-render of player

  const playerRef = useRef<MediaPlayerInstance>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!animeId) {
        setError("Anime ID is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const details = await getAnimeById(animeId);
        if (details) {
          setAnime(details);
          const epId = searchParams.get("episode");
          let ep = details.episodes?.[0]; // Default to first episode if available
          if (epId) {
            const found = details.episodes?.find((e) => e.id === epId);
            if (found) ep = found;
          }
          if (!epId && ep && details.episodes && details.episodes.length > 0) {
            router.replace(`/play/${animeId}?episode=${ep.id}`, { scroll: false });
          }
          setCurrentEpisode(ep || null);
           setPlayerKey(prevKey => prevKey + 1); // Force player re-initialization
        } else {
          setError("Anime not found.");
        }
      } catch(e) {
        console.error("Failed to load anime details:", e);
        setError("Failed to load anime details. Please check the console for more information.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [animeId, searchParams, router]);


  const handleEpisodeSelect = useCallback(
    (ep: Episode) => {
      if (ep.id === currentEpisode?.id) return; // Avoid reloading same episode
      setError(null);
      setCurrentEpisode(ep);
      router.push(`/play/${animeId}?episode=${ep.id}`, { scroll: false });
      setPlayerKey(prevKey => prevKey + 1); // Force player re-initialization
    },
    [router, animeId, currentEpisode]
  );

  const handleNextEpisode = useCallback(() => {
    if (!anime || !currentEpisode || !anime.episodes) return;
    const idx = anime.episodes.findIndex((e) => e.id === currentEpisode.id);
    if (idx !== -1 && idx < anime.episodes.length - 1) {
      handleEpisodeSelect(anime.episodes[idx + 1]);
    }
  }, [anime, currentEpisode, handleEpisodeSelect]);

  const handlePreviousEpisode = useCallback(() => {
    if (!anime || !currentEpisode || !anime.episodes) return;
    const currentIndex = anime.episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (currentIndex > 0) {
      const prevEpisode = anime.episodes[currentIndex - 1];
      handleEpisodeSelect(prevEpisode);
    }
  }, [anime, currentEpisode, handleEpisodeSelect]);

  // Vidstack Player Event Handlers
  const onPlayerCanPlay = () => {
    console.log('Player can play');
    setError(null); // Clear previous errors
  };

  const onPlayerError = (event: any) => {
    console.error("Vidstack Player Error:", event.detail);
    const errorDetail = event.detail;
    let message = "Video Error: Failed to load video.";
    if (errorDetail?.message) {
      message = `Video Error: ${errorDetail.message}`;
    } else if (errorDetail?.data?.type) {
      message = `Video Error: Type ${errorDetail.data.type}, Code ${errorDetail.data.code}`;
    }
    setError(message);
  };
  
  const onPlayerEnded = () => {
    console.log('Player ended');
    handleNextEpisode();
  };

  if (isLoading) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,4rem)-1px)] py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading player...</p>
      </Container>
    );
  }

  if (error && !anime && !currentEpisode) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,4rem)-1px)] py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Error</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/">Go back to Home</Link>
        </Button>
      </Container>
    );
  }
  
  if (!anime) { 
    return ( 
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,4rem)-1px)] py-12 text-center">
         <h1 className="text-2xl font-bold">Anime Not Found</h1>
         <p className="text-muted-foreground">Could not find details for anime ID: {animeId}</p>
         <Button asChild variant="link" className="mt-4">
          <Link href="/">Go back to Home</Link>
        </Button>
      </Container>
    );
  }
  
  const currentEpisodeIndex = anime.episodes?.findIndex(ep => ep.id === currentEpisode?.id) ?? -1;
  const videoSrc: MediaSrc[] | undefined = currentEpisode?.url ? [{ 
    src: currentEpisode.url, 
    type: isM3U8(currentEpisode.url) ? 'application/x-mpegurl' : 'video/mp4' 
  }] : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background -mt-[calc(var(--header-height,4rem)+1px)] pt-[calc(var(--header-height,4rem)+1px)]">
      <Container className="py-4 md:py-6 flex-grow w-full max-w-full px-0 sm:px-4 md:px-6 lg:px-8">
        <div className="lg:flex lg:gap-6 xl:gap-8 h-full">
          <div className="lg:flex-grow mb-6 lg:mb-0 h-full flex flex-col">
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl mb-4 w-full relative">
              {currentEpisode?.url && videoSrc ? (
                <MediaPlayer
                  key={playerKey} // Force re-mount on episode change
                  ref={playerRef}
                  title={currentEpisode.title}
                  src={videoSrc}
                  poster={currentEpisode.thumbnail || anime?.coverImage || `https://picsum.photos/seed/${animeId}-${currentEpisode.id}-poster/1280/720`}
                  crossorigin=""
                  playsinline
                  autoplay
                  volume={0.8}
                  onCanPlay={onPlayerCanPlay}
                  onError={onPlayerError}
                  onEnded={onPlayerEnded}
                  className="w-full h-full"
                >
                  <MediaProvider />
                  <DefaultVideoLayout icons={defaultLayoutIcons} />
                </MediaPlayer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-card">
                    <PlayCircleIcon className="w-24 h-24 opacity-30" />
                    <p className="mt-4 text-lg">
                        {(!anime.episodes || anime.episodes.length === 0) ? 'No episodes available for this anime.' :
                         !currentEpisode ? 'Select an episode to start watching.' :
                         'Video source is missing for this episode.'}
                    </p>
                </div>
              )}
               {error && currentEpisode && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center z-10">
                    <AlertTriangle className="w-10 h-10 text-destructive mb-2" />
                    <p className="text-destructive-foreground text-sm">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                        setError(null); 
                        setPlayerKey(prevKey => prevKey + 1); // Attempt to re-initialize player
                    }}>Retry</Button>
                  </div>
                )}
            </div>

            <div className="px-2 sm:px-0">
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-0">
                        <Link href={`/anime/${anime.id}`} className="hover:text-primary transition-colors">
                            {anime.title}
                        </Link>
                    </h1>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={handlePreviousEpisode} disabled={!anime.episodes || currentEpisodeIndex <= 0}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleNextEpisode} disabled={!anime.episodes || currentEpisodeIndex < 0 || currentEpisodeIndex >= anime.episodes.length - 1}>
                            Next
                        </Button>
                    </div>
                 </div>

                {currentEpisode && (
                <h2 className="text-base sm:text-lg text-primary mb-1">
                    Episode {currentEpisode.episodeNumber}: {currentEpisode.title}
                </h2>
                )}
                <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-3">
                    <span>{anime.year}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <Badge variant={anime.status === 'Completed' ? 'default' : 'secondary'} className={`text-xs ${anime.status === 'Completed' ? 'bg-primary/80' : ''}`}>
                        {anime.status}
                    </Badge>
                    {anime.type && (
                        <>
                            <Separator orientation="vertical" className="h-4" />
                            <span>{anime.type}</span>
                        </>
                    )}
                     {anime.averageRating && (
                        <>
                            <Separator orientation="vertical" className="h-4" />
                             <Star className="w-3 h-3 mr-1 text-yellow-400 fill-yellow-400" />
                            <span>{anime.averageRating.toFixed(1)}</span>
                        </>
                    )}
                </div>
            </div>
          </div>

          <div className="lg:w-[320px] xl:w-[380px] flex-shrink-0">
            <div className="bg-card p-3 sm:p-4 rounded-lg shadow-lg h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center">
                    <List className="mr-2 w-5 h-5" /> Episodes ({anime.episodes?.length || 0})
                </h3>
              </div>
              
              <ScrollArea className="flex-grow h-[calc(100vh-280px)] lg:h-[calc(100vh-var(--header-height,4rem)-180px)] pr-2 -mr-2 scrollbar-thin">
                <div className="space-y-1.5">
                    {anime.episodes?.map((ep) => (
                    <TooltipProvider key={ep.id} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={currentEpisode?.id === ep.id ? 'secondary' : 'ghost'}
                                className={`w-full justify-start text-left h-auto py-2.5 px-3 text-xs sm:text-sm ${
                                currentEpisode?.id === ep.id ? 'bg-primary/20 text-primary font-semibold' : 'hover:bg-primary/10'
                                }`}
                                onClick={() => handleEpisodeSelect(ep)}
                                title={`Episode ${ep.episodeNumber}: ${ep.title}`}
                            >
                                <div className="flex items-center w-full">
                                    <span className={`mr-2 font-mono text-muted-foreground text-[0.7rem] sm:text-xs w-6 sm:w-7 text-center ${currentEpisode?.id === ep.id ? 'text-primary' : ''}`}>
                                        {ep.episodeNumber}
                                    </span>
                                    <span className={`flex-grow truncate ${currentEpisode?.id === ep.id ? 'text-primary' : 'text-foreground'}`}>
                                    {ep.title}
                                    </span>
                                    {currentEpisode?.id === ep.id && <PlayCircleIcon className="w-4 h-4 ml-2 text-primary flex-shrink-0" />}
                                </div>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" align="center" className="bg-popover text-popover-foreground p-2 rounded-md shadow-lg max-w-xs">
                            <p className="font-semibold">Ep {ep.episodeNumber}: {ep.title}</p>
                            {ep.duration && <p className="text-xs text-muted-foreground">{ep.duration}</p>}
                            {ep.overview && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{ep.overview}</p>}
                        </TooltipContent>
                       </Tooltip>
                    </TooltipProvider>
                    ))}
                    {(!anime.episodes || anime.episodes.length === 0) && (
                        <p className="text-sm text-muted-foreground py-4 text-center">No episodes available for this series.</p>
                    )}
                </div>
              </ScrollArea>

                <div className="mt-4 pt-3 border-t border-border space-y-3">
                     <div>
                        <h4 className="text-sm font-semibold text-primary mb-1.5 flex items-center">
                            <Star className="mr-1.5 w-4 h-4" /> Rate this Anime
                        </h4>
                        <p className="text-xs text-muted-foreground">Rating feature coming soon!</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-destructive mb-1.5 flex items-center">
                            <MessageSquareWarning className="mr-1.5 w-4 h-4" /> Report Issue
                        </h4>
                        <p className="text-xs text-muted-foreground">Report functionality coming soon.</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
