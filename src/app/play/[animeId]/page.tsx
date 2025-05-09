// src/app/play/[animeId]/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import type { Anime, Episode } from '@/types/anime';
import { mockAnimeData } from '@/lib/mock-data';
import Container from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageSquareWarning, Loader2, List, Star, PlayCircle } from 'lucide-react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type PlyrType from 'plyr';
import Hls from 'hls.js'; // Standard import

// Dynamically import Plyr to avoid SSR issues
import dynamic from 'next/dynamic';
const Plyr = dynamic(() => import('plyr-react').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="w-full aspect-video bg-card flex items-center justify-center text-muted-foreground rounded-lg"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>,
});
import 'plyr-react/plyr.css';


// Simulate fetching anime data by ID (client-side for this example)
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
  
  const plyrRef = useRef<typeof Plyr | null>(null); // Ref type should be for the Plyr component export from 'plyr-react'
  const hlsRef = useRef<Hls | null>(null);


  useEffect(() => {
    const fetchDetails = async () => {
      if (!animeId) {
        setError('Anime ID is missing.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
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
            // Only replace URL if it's not already set, or to set the default
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
  }, [animeId, searchParams, router]);


  // Effect to initialize player and handle source changes with HLS.js
  useEffect(() => {
    // Ensure Hls is available on the window for Plyr to automatically use, though we manage manually.
    if (typeof window !== 'undefined' && !(window as any).Hls) {
      (window as any).Hls = Hls;
    }

    if (!plyrRef.current || !currentEpisode?.url) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    // The 'plyrRef.current' from 'plyr-react' is the component instance.
    // 'plyrRef.current.plyr' is the actual Plyr API instance.
    const playerInstanceAPI = plyrRef.current.plyr as PlyrType;


    if (!playerInstanceAPI) {
        console.error("Plyr API instance not available.");
        return;
    }
    
    const sourceUrl = currentEpisode.url;
    const mimeType = getMimeType(sourceUrl);

    const setupHlsOrMp4 = () => {
      // This assumes playerInstanceAPI.media is the HTMLVideoElement
      const videoElement = playerInstanceAPI.media as HTMLVideoElement;
      if (!videoElement) {
        console.error("Plyr media element not found for HLS/MP4 setup.");
        return;
      }

      // Destroy existing HLS instance if it exists
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported() && mimeType === 'application/x-mpegURL') {
        console.log("Setting up HLS.js for:", sourceUrl);
        const hls = new Hls({
          debug: process.env.NODE_ENV === 'development',
          // Recommended settings for stability:
          // Cap level to player size to avoid playing high res on small player
          capLevelToPlayerSize: true, 
          // Max buffer length
          maxMaxBufferLength: 30, 
          // Max buffer hole to fill on seeking
          maxBufferHole: 0.5,
          // Start fragment loading from an audio track level that matches current video level
          audioPreference: {
            track: 'main', // or 'alternative' if you have specific needs
            language: 'any', // or a specific language code like 'en'
          },
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("HLS.js: Manifest parsed.");
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS.js Error:', data.type, data.details, data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError(`Network error loading video: ${data.details}. Please check your connection.`);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError(`Media error during playback: ${data.details}. The video might be corrupted or unsupported.`);
                // Attempt to recover media error
                if (data.details === 'bufferStalledError' || data.details === 'bufferSeekOverHole') {
                  // hls.recoverMediaError(); // recoverMediaError is deprecated, use startLoad or swapAudioCodec
                  hls.startLoad();
                }
                break;
              default:
                setError(`An unrecoverable error occurred with the video stream: ${data.details}.`);
                break;
            }
          }
        });
        
        hls.loadSource(sourceUrl);
        hls.attachMedia(videoElement);
        // No need to set playerInstanceAPI.source here if <Plyr source={videoSource} /> handles it reactively
        // and videoSource for HLS has src:''

      } else if (mimeType === 'video/mp4') {
        // For MP4, Plyr handles it directly via the source prop of the <Plyr> component.
        // The videoSource useMemo already sets the correct src and type for MP4.
        console.log("Setting up MP4 source:", sourceUrl);
      } else {
        console.warn("Unsupported video type or HLS not supported for this source:", mimeType);
        setError("Unsupported video format.");
      }
    };

    if (playerInstanceAPI && playerInstanceAPI.ready) {
      setupHlsOrMp4();
    } else if (playerInstanceAPI) {
      playerInstanceAPI.once('ready', setupHlsOrMp4);
    }
    
    return () => {
      if (playerInstanceAPI) {
        playerInstanceAPI.off('ready', setupHlsOrMp4);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentEpisode, animeId, setError]);


  const handleEpisodeSelect = useCallback((episode: Episode) => {
    setCurrentEpisode(episode);
    router.push(`/play/${animeId}?episode=${episode.id}`, { scroll: false });
  }, [router, animeId]);

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

    if (mimeType === 'application/x-mpegURL') {
      return {
        type: 'video' as const,
        title: currentEpisode.title,
        sources: [
          {
            src: '', // HLS.js will load the source into the media element
            type: mimeType, // 'application/x-mpegURL'
          },
        ],
        poster: currentEpisode.thumbnail || anime?.coverImage || `https://picsum.photos/seed/${animeId}-${currentEpisode.id}-poster/1280/720`,
      };
    }
    
    // For MP4 and other direct types
    return {
      type: 'video' as const,
      title: currentEpisode.title,
      sources: [
        {
          src: sourceUrl,
          type: mimeType, // e.g. 'video/mp4'
        },
      ],
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
    quality: { // Example quality options, Plyr might need specific HLS.js integration for this if not automatic
      default: 720, 
      options: [1080, 720, 480, 360, 240], 
    },
    tooltips: { controls: true, seek: true },
    autoplay: false, // Autoplay can be problematic, especially with HLS
    loop: { active: false },
    keyboard: { focused: true, global: false },
    // We are handling HLS manually, so no specific Plyr HLS config needed here.
  }), []);


  useEffect(() => {
    const playerAPI = plyrRef.current?.plyr; // Get the Plyr API instance

    if (playerAPI) {
      const onEnded = () => {
        console.log("Video ended, trying to play next episode.");
        handleNextEpisode();
      };
      
      playerAPI.on('ended', onEnded);
      
      return () => {
        if (playerAPI && playerAPI.ready) { // Check if player is still valid and ready
             try {
                playerAPI.off('ended', onEnded);
             } catch(e) {
                console.warn("Error removing Plyr 'ended' event listener:", e);
             }
        }
      };
    }
  }, [handleNextEpisode]);


  if (isLoading) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,4rem)-1px)] py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading player...</p>
      </Container>
    );
  }

  if (error && !currentEpisode) { // Show general error if no episode is loaded yet
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
                {Plyr && videoSource ? ( // Ensure Plyr is loaded and videoSource is available
                    <Plyr
                        key={currentEpisode?.id || 'plyr-player'} 
                        ref={plyrRef}
                        source={videoSource} 
                        options={playerOptions}
                        className="[&>.plyr]:rounded-lg" // Ensures Plyr's own container gets rounded corners
                    />
                ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-card">
                    <PlayCircle className="w-24 h-24 opacity-30" />
                    <p className="mt-4 text-lg">
                        {(anime.episodes && anime.episodes.length > 0 && !currentEpisode) ? 'Select an episode to start watching' : 
                         (!anime.episodes || anime.episodes.length === 0) ? 'No episodes available for this anime.' : 
                         error ? 'Error loading video.' : 'Preparing player...'}
                    </p>
                </div>
                )}
                {error && currentEpisode && ( // Show video-specific error overlay
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
                    <AlertTriangle className="w-10 h-10 text-destructive mb-2" />
                    <p className="text-destructive-foreground text-sm">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setError(null)}>Dismiss</Button>
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
                                    {currentEpisode?.id === ep.id && <PlayCircle className="w-4 h-4 ml-2 text-primary flex-shrink-0" />}
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

