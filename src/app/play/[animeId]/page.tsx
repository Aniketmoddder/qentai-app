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
const Plyr = dynamic(() => import('plyr-react').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-card flex items-center justify-center text-muted-foreground rounded-lg">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
    </div>
  ),
});
import 'plyr-react/plyr.css';


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
  // Add more MIME types if needed, e.g., for WebM, Ogg
  // if (url.endsWith('.webm')) return 'video/webm';
  // if (url.endsWith('.ogv')) return 'video/ogg';
  return undefined; // Let Plyr attempt to infer or handle if not explicitly known
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
  
  const plyrApiRef = useRef<PlyrType | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);


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

    return {
      type: 'video' as const,
      title: currentEpisode.title,
      sources: [{
        src: sourceUrl,
        // type: mimeType, // Plyr can often infer type, but providing it can be more robust
        ...(mimeType && { type: mimeType }) // Conditionally add type if known
      }],
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
    autoplay: false,
    loop: { active: false },
    keyboard: { focused: true, global: false },
    // No specific HLS options here if we manage HLS.js externally via hlsInstanceRef
    // If relying on Plyr's internal HLS.js, options would go under html5.hls
  }), []);

   // Callback for when Plyr component is ready and its internal Plyr.JS instance is available
   const handlePlayerReady = useCallback((playerInstance: PlyrType) => {
    // console.log('Plyr instance ready:', playerInstance);
    plyrApiRef.current = playerInstance;
    if (playerInstance?.media instanceof HTMLVideoElement) {
      videoElementRef.current = playerInstance.media;
      // console.log('Video element obtained:', videoElementRef.current);
    } else {
      // console.warn("Plyr media element is not an HTMLVideoElement or not found on ready.");
    }
  }, []);

  // Effect for HLS.js setup and source changes
  useEffect(() => {
    const player = plyrApiRef.current; // This is the Plyr.JS instance
    const videoEl = videoElementRef.current; // This is the <video> element

    if (!player || !videoEl || !currentEpisode?.url) {
      // console.log('Player, video element, or episode URL not ready for HLS/MP4 setup. Skipping.');
      return;
    }
    
    // console.log(`Attempting to set up player for: ${currentEpisode.title} (URL: ${currentEpisode.url})`);
    const sourceUrl = currentEpisode.url;
    const mimeType = getMimeType(sourceUrl);

    // 1. Clean up previous HLS instance
    if (hlsInstanceRef.current) {
      // console.log('Destroying previous HLS instance.');
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    // 2. Setup new source
    if (Hls.isSupported() && mimeType === 'application/x-mpegURL') {
      // console.log('Setting up HLS.js for M3U8 stream.');
      setError(null); // Clear previous errors
      const hls = new Hls({
        debug: process.env.NODE_ENV === 'development',
        // Consider adding more HLS config if needed, e.g., capLevelToPlayerSize: true
      });
      hlsInstanceRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // console.log('HLS.js: Manifest parsed.');
        // player.play(); // Consider if autoplay is desired after manifest parsing
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS.js Error:', event, data);
        if (data.fatal) {
          let errorMsg = `Video stream error: ${data.details}`;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              errorMsg = `Video network error: ${data.details}. Check network or CORS.`;
              // Attempt to recover network errors
              // hls.startLoad(); 
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              errorMsg = `Video media error: ${data.details}. Stream might be corrupt.`;
              // Attempt to recover media errors
              // hls.recoverMediaError();
              break;
            default:
              // For other fatal errors, destroying HLS might be safest
              // if (hlsInstanceRef.current) {
              //   hlsInstanceRef.current.destroy();
              //   hlsInstanceRef.current = null;
              // }
              break;
          }
          setError(errorMsg);
        } else {
            // Non-fatal errors, log them
            // console.warn('HLS.js non-fatal error:', data.details);
        }
      });

      hls.loadSource(sourceUrl);
      hls.attachMedia(videoEl);
      // Plyr component receives the sourceUrl via its `source` prop (from `videoSource` memo).
      // HLS.js takes control of streaming for the `videoEl`.
    } else if (mimeType === 'video/mp4' || !mimeType) { // MP4 or if Plyr can infer
      // console.log('Setting up for MP4 or direct Plyr handling. Plyr source prop should handle this.');
      setError(null); // Clear previous errors
      // For MP4s, Plyr handles playback directly if `source` prop is set.
      // No specific HLS.js action needed here.
      // Ensure the <Plyr source={...}> prop is correctly updated by `videoSource` memo.
    } else {
      // console.warn(`Unsupported video type: ${mimeType} for URL: ${sourceUrl}`);
      setError(`Unsupported video type: ${mimeType}`);
    }

    return () => {
      // console.log('Cleanup: Destroying HLS instance in useEffect for currentEpisode.url or player/videoEl change.');
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [currentEpisode?.url, plyrApiRef, videoElementRef, setError]); // Re-run if episode URL or player/video refs change

  // Effect for Plyr event listeners (e.g., 'ended', 'error' from Plyr itself)
  useEffect(() => {
    const player = plyrApiRef.current;
    if (!player) return;

    // console.log('Attaching Plyr event listeners to Plyr.JS instance.');
    
    const onPlayerError = (event: any) => {
      const plyrError = event.detail.plyr; // Plyr's error object
      // console.error('Plyr Player Error Event:', plyrError);
      // Avoid double-reporting HLS errors if HLS.js already set an error
      if (!error && (!hlsInstanceRef.current || !hlsInstanceRef.current.streamController /* crude check if HLS is active */)) {
        setError(`Player error: ${plyrError.message || 'Unknown player error'}`);
      }
    };

    const onPlayerEnded = () => {
      // console.log('Plyr: Video ended, calling handleNextEpisode.');
      handleNextEpisode();
    };
    
    if (typeof player.on === 'function') {
      player.on('error', onPlayerError);
      player.on('ended', onPlayerEnded);
    } else {
      // console.warn("Plyr instance does not have 'on' method when trying to attach listeners.");
    }

    return () => {
      // console.log('Cleanup: Removing Plyr event listeners from Plyr.JS instance.');
      if (player && typeof player.off === 'function') {
        try {
          player.off('error', onPlayerError);
          player.off('ended', onPlayerEnded);
        } catch(e) {
          // console.warn("Error removing Plyr event listeners during cleanup:", e);
        }
      }
    };
  }, [plyrApiRef, handleNextEpisode, setError, error]); // `error` added to dependency to avoid re-attaching if error already set by HLS

  if (isLoading) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,4rem)-1px)] py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading player...</p>
      </Container>
    );
  }

  if (error && !anime && !currentEpisode) { // Initial load error before anime/episode selected
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
                        key={currentEpisode?.id || 'plyr-player'} // Force re-mount on episode change if needed
                        source={videoSource} 
                        options={playerOptions}
                        onReady={handlePlayerReady} // Critical for getting player instance and video element
                        className="[&>.plyr]:rounded-lg"
                    />
                ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-card">
                    <PlayCircleIcon className="w-24 h-24 opacity-30" />
                    <p className="mt-4 text-lg">
                        {(anime.episodes && anime.episodes.length > 0 && !currentEpisode) ? 'Select an episode to start watching' : 
                         (!anime.episodes || anime.episodes.length === 0) ? 'No episodes available for this anime.' : 
                         (error && !currentEpisode) ? error : // Show initial error if player not ready
                         'Preparing player...'}
                    </p>
                </div>
                )}
                {error && currentEpisode && ( // Show error overlay if an episode is selected but error occurs
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center z-10">
                    <AlertTriangle className="w-10 h-10 text-destructive mb-2" />
                    <p className="text-destructive-foreground text-sm">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => {setError(null); if(currentEpisode) { 
                        // Trigger re-setup by slightly changing currentEpisode state or re-calling select.
                        // For simplicity, re-selecting the episode.
                        handleEpisodeSelect(currentEpisode);
                    }}}>Retry</Button>
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
