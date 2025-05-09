// src/app/play/[animeId]/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import type { Anime, Episode } from '@/types/anime';
import { mockAnimeData } from '@/lib/mock-data';
import Container from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageSquareWarning, Loader2, List, Star, PlayCircleIcon } from 'lucide-react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type PlyrType from 'plyr';
import Hls from 'hls.js';

// Dynamically import Plyr to avoid SSR issues
import dynamic from 'next/dynamic';
import type { APITypes as PlyrReactAPITypes } from 'plyr-react'; // Renamed to avoid conflict
import 'plyr-react/plyr.css';


const Plyr = dynamic(() => import('plyr-react').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-card flex items-center justify-center text-muted-foreground rounded-lg">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
    </div>
  ),
});


async function getAnimeDetails(id: string): Promise<Anime | undefined> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockAnimeData.find((anime) => anime.id === id);
}

const getMimeType = (url: string): string | undefined => {
  if (url.endsWith('.m3u8')) {
    return 'application/x-mpegURL';
  }
  if (url.endsWith('.mp4')) {
    return 'video/mp4';
  }
  return undefined;
};


export default function PlayerPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const animeId = params.animeId as string;

  const [anime, setAnime] = useState<Anime | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const plyrRef = useRef<PlyrReactAPITypes | null>(null); 
  const hlsRef = useRef<Hls | null>(null);


  useEffect(() => {
    const fetchDetails = async () => {
      if (!animeId) {
        setError('Anime ID is missing.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const details = await getAnimeDetails(animeId);
        if (details) {
          setAnime(details);
          const episodeIdFromQuery = searchParams.get('episode');
          let initialEpisode = details.episodes?.[0];
          
          if (episodeIdFromQuery) {
            const foundEpisode = details.episodes?.find(ep => ep.id === episodeIdFromQuery);
            if (foundEpisode) initialEpisode = foundEpisode;
          } else if (details.episodes && details.episodes.length > 0) {
            initialEpisode = details.episodes[0];
             // Update URL only if it's different to avoid unnecessary history entries
            if (searchParams.get('episode') !== initialEpisode.id) {
                 router.replace(`/play/${animeId}?episode=${initialEpisode.id}`, { scroll: false });
            }
          }
          setCurrentEpisode(initialEpisode || null);
        } else {
          setError('Anime not found.');
        }
      } catch (e) {
        setError('Failed to load anime details.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [animeId, searchParams, router]); // router added as dependency

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  const handlePlayerError = useCallback((plyrErrorSource: any ) => {
    let errorMessage = "An unknown player error occurred.";
    if (plyrErrorSource && typeof plyrErrorSource === 'object') {
        if (plyrErrorSource.message) errorMessage = plyrErrorSource.message;
        else if (plyrErrorSource.error && plyrErrorSource.error.message) errorMessage = plyrErrorSource.error.message;
        else if (plyrErrorSource.source && plyrErrorSource.source.error && plyrErrorSource.source.error.message) errorMessage = plyrErrorSource.source.error.message;
    } else if (typeof plyrErrorSource === 'string') {
        errorMessage = plyrErrorSource;
    }
    setError(`Player error: ${errorMessage}`);
}, [setError]);


  const setupHlsOrMp4 = useCallback((player: PlyrType.Player) => {
    if (!currentEpisode?.url) {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (player && player.media && (player.media as HTMLVideoElement).src) {
             (player.media as HTMLVideoElement).src = ''; 
        }
        return;
    }
    
    const sourceUrl = currentEpisode.url;
    const mimeType = getMimeType(sourceUrl);
    const videoElement = player.media as HTMLVideoElement;

    if (!videoElement) {
        console.error("Plyr media element not found for HLS/MP4 setup.");
        setError("Player media element could not be accessed.");
        return;
    }

    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }
    
    if (player.playing) player.stop();

    if (Hls.isSupported() && mimeType === 'application/x-mpegURL') {
        const hlsInstance = new Hls({
            debug: process.env.NODE_ENV === 'development',
            capLevelToPlayerSize: true, 
            maxMaxBufferLength: 30, 
            maxBufferHole: 0.5,
        });
        hlsRef.current = hlsInstance;

        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS.js Error:', event, data);
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        setError(`Network error loading video: ${data.details}.`);
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        setError(`Media error: ${data.details}.`);
                        break;
                    default:
                        setError(`Video stream error: ${data.details}.`);
                        break;
                }
                if(hlsRef.current) {
                    if (hlsRef.current.media) hlsRef.current.detachMedia();
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                }
            }
        });
        
        hlsInstance.loadSource(sourceUrl);
        hlsInstance.attachMedia(videoElement);
        // player.play(); // Plyr should handle play, or autoPlay option
        
    } else if (mimeType === 'video/mp4') {
      // For MP4, Plyr handles it via the `source` prop update.
      // No direct HLS setup needed. Player should re-initialize with new source.
    } else if (sourceUrl) { 
        console.warn("Unsupported video type or HLS not supported for this source:", mimeType, sourceUrl);
        setError("Unsupported video format or HLS is not supported by your browser.");
    }
  }, [currentEpisode, setError]);


  const handleEpisodeSelect = useCallback((episode: Episode) => {
    setError(null); 
    setCurrentEpisode(episode);
    router.push(`/play/${animeId}?episode=${episode.id}`, { scroll: false });
  }, [router, animeId, setError]);

  const handleNextEpisode = useCallback(() => {
    if (!anime || !currentEpisode || !anime.episodes) return;
    const currentIndex = anime.episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (currentIndex !== -1 && currentIndex < anime.episodes.length - 1) {
      const nextEpisode = anime.episodes[currentIndex + 1];
      handleEpisodeSelect(nextEpisode);
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

  const videoSource = useMemo(() => {
    if (!currentEpisode?.url) return null;
    const sourceUrl = currentEpisode.url;
    const mimeType = getMimeType(sourceUrl);

    let plyrSources: PlyrType.Source[] = [];
    if (mimeType === 'application/x-mpegURL' || mimeType === 'video/mp4') {
      plyrSources.push({ src: sourceUrl, type: mimeType }); 
    } else if (sourceUrl) { 
        plyrSources.push({src: sourceUrl }); 
    } else {
        return null;
    }

    return {
      type: 'video' as const,
      title: currentEpisode.title,
      sources: plyrSources,
      poster: currentEpisode.thumbnail || anime?.coverImage || `https://picsum.photos/seed/${animeId}-${currentEpisode.id}-poster/1280/720`,
    };
  }, [currentEpisode, anime?.coverImage, animeId]);
  
  const playerOptions = useMemo<PlyrType.Options>(() => ({ 
    controls: [
        'play-large', 'rewind', 'play', 'fast-forward', 'progress', 
        'current-time', 'duration', 'mute', 'volume', 'captions', 
        'settings', 'pip', 'airplay', 'fullscreen'
    ],
    settings: ['captions', 'quality', 'speed', 'loop'],
    tooltips: { controls: true, seek: true },
    autoplay: false, // Autoplay can be problematic, manage manually if needed
    loop: { active: false },
    keyboard: { focused: true, global: false },
    // Ensure html5 is enabled for HLS.js and MP4
    html5: {
      hls: {
        // HLS.js specific options if Plyr is managing it internally (not our case here as we manage HLS externally)
        // qualityLevels: true, // Example
      }
    }
  }), []);

  useEffect(() => {
    const playerInstanceAPI = plyrRef.current?.plyr; // Actual Plyr.JS instance
    if (playerInstanceAPI && currentEpisode?.url) {
      // console.log("useEffect [currentEpisode, plyrRef.current?.plyr]: Setting up HLS or MP4 for", currentEpisode.title);
      setupHlsOrMp4(playerInstanceAPI);

      // Event listeners setup
      const onEnded = () => handleNextEpisode();
      // Note: For HLS.js errors, they are handled inside setupHlsOrMp4. 
      // This 'error' listener is for Plyr's own media errors (e.g. non-HLS MP4 issues).
      const onError = (event: any) => handlePlayerError(event.detail.plyr); 

      playerInstanceAPI.on('ended', onEnded);
      playerInstanceAPI.on('error', onError);
      
      return () => {
        // console.log("useEffect [currentEpisode, plyrRef.current?.plyr]: Cleanup. Detaching listeners for", currentEpisode?.title);
        try {
          playerInstanceAPI.off('ended', onEnded);
          playerInstanceAPI.off('error', onError);
        } catch (e) {
          // console.warn("Error during event listener cleanup:", e);
        }
      };
    }
  }, [currentEpisode, setupHlsOrMp4, handleNextEpisode, handlePlayerError]); // plyrRef is stable, actual instance accessed inside


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
         <Button asChild variant="link" className="mt-4">
          <Link href="/">Go back to Home</Link>
        </Button>
      </Container>
    );
  }
  
  const currentEpisodeIndex = anime.episodes?.findIndex(ep => ep.id === currentEpisode?.id) ?? -1;

  return (
    <div className="min-h-screen flex flex-col bg-background -mt-[calc(var(--header-height,4rem)+1px)] pt-[calc(var(--header-height,4rem)+1px)]">
      <Container className="py-4 md:py-6 flex-grow w-full max-w-full px-0 sm:px-4 md:px-6 lg:px-8">
        <div className="lg:flex lg:gap-6 xl:gap-8 h-full">
          <div className="lg:flex-grow mb-6 lg:mb-0 h-full flex flex-col">
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl mb-4 w-full relative">
                {Plyr && videoSource ? (
                    <Plyr
                        key={currentEpisode?.id || 'plyr-player'} 
                        ref={plyrRef}
                        source={videoSource} 
                        options={playerOptions}
                        // onReady prop removed as it was causing warnings and logic is handled in useEffect
                        className="[&>.plyr]:rounded-lg"
                    />
                ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-card">
                    <PlayCircleIcon className="w-24 h-24 opacity-30" />
                    <p className="mt-4 text-lg">
                        {(anime.episodes && anime.episodes.length > 0 && !currentEpisode) ? 'Select an episode to start watching' : 
                         (!anime.episodes || anime.episodes.length === 0) ? 'No episodes available for this anime.' : 
                         (error && !currentEpisode) ? error :
                         'Preparing player...'}
                    </p>
                </div>
                )}
                {error && currentEpisode && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center z-10">
                    <AlertTriangle className="w-10 h-10 text-destructive mb-2" />
                    <p className="text-destructive-foreground text-sm">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => {setError(null); if(currentEpisode) handleEpisodeSelect(currentEpisode)}}>Retry</Button>
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
                    <Tooltip key={ep.id} delayDuration={200}>
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
                        </TooltipContent>
                    </Tooltip>
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
