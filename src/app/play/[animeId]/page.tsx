
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type PlyrType from 'plyr';
// HLS.js is conditionally imported if needed.
// import Hls from 'hls.js'; // Not importing globally to avoid issues if not always used.

// Dynamically import Plyr to avoid SSR issues
// For Plyr, we are not using plyr-react wrapper due to previous issues, direct instantiation.


const getMimeType = (url: string): string | undefined => {
  if (!url) return undefined;
  const ext = url.split(".").pop()?.toLowerCase();
  if (ext === "m3u8") return "application/x-mpegURL"; // Correct MIME for HLS
  if (ext === "mp4") return "video/mp4";
  // Add other types if needed
  return undefined; // Let Plyr or browser try to infer if not common
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
  
  const videoRef = useRef<HTMLVideoElement | null>(null); // Ref for the actual <video> element
  const playerRef = useRef<PlyrType | null>(null); // Ref to store the Plyr instance

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
          let epToSet = details.episodes?.[0]; 
          if (epId) {
            const foundEp = details.episodes?.find((e) => e.id === epId);
            if (foundEp) epToSet = foundEp;
          }
          
          if (epToSet) {
            setCurrentEpisode(epToSet);
            if (!epId && details.episodes && details.episodes.length > 0) {
                 router.replace(`/play/${animeId}?episode=${epToSet.id}`, { scroll: false });
            }
          } else {
            setCurrentEpisode(null); // No episode found or no episodes exist
          }

        } else {
          setError("Anime not found.");
        }
      } catch(e: any) {
        console.error("Failed to load anime details:", e);
        setError(`Failed to load anime details: ${e.message || "Unknown error"}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [animeId, searchParams, router]);


  const handleEpisodeSelect = useCallback(
    (ep: Episode) => {
      if (ep.id === currentEpisode?.id && playerRef.current && !playerRef.current.isBuffering) return; 
      setError(null); // Clear previous errors
      setCurrentEpisode(ep); // This will trigger the player useEffect
      router.push(`/play/${animeId}?episode=${ep.id}`, { scroll: false });
    },
    [router, animeId, currentEpisode?.id]
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


  useEffect(() => {
    // Cleanup existing player instance if dependencies change or component unmounts
    const destroyPlayer = () => {
      if (playerRef.current) {
        console.log("Destroying Plyr instance for:", playerRef.current.source?.title || 'previous episode');
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };

    // Conditions to prevent player initialization
    if (isLoading || error || !currentEpisode?.url || !videoRef.current) {
      destroyPlayer(); // Destroy if prerequisites not met
      return;
    }

    const videoElement = videoRef.current; // videoRef.current is guaranteed non-null here by the check above
    
    // Dynamically import Plyr and HLS.js if needed
    Promise.all([
        import('plyr'),
        currentEpisode.url.includes('.m3u8') ? import('hls.js') : Promise.resolve(null)
    ]).then(([{ default: PlyrConstructor }, HlsModule]) => {
        const Hls = HlsModule?.default;

        // Ensure videoElement is still the one we expect, in case of rapid changes
        if (videoRef.current !== videoElement) {
            console.log("Video element changed before Plyr could initialize; aborting.");
            return;
        }
        
        // Destroy any previous instance before creating a new one for the current video element
        // This is crucial because the `key` on <video> ensures videoRef.current is new.
        destroyPlayer();

        console.log("Initializing Plyr for episode:", currentEpisode.title);
        
        const newPlayer = new PlyrConstructor(videoElement, {
            debug: process.env.NODE_ENV === 'development',
            // Add other options as needed
             autoplay: true,
        });
        playerRef.current = newPlayer; // Store new instance

        if (Hls && Hls.isSupported() && currentEpisode.url.includes('.m3u8')) {
            console.log("HLS supported, setting up HLS.js for:", currentEpisode.title);
            const hls = new Hls();
            hls.loadSource(currentEpisode.url);
            hls.attachMedia(videoElement);
            (window as any).hls = hls; // Optional: for debugging
             newPlayer.on('languagechange', () => { // Example HLS specific event
                if (hls.subtitleTrack !== -1) {
                    console.log('HLS subtitle track changed');
                }
            });
        } else {
             console.log("Using native playback or HLS not supported for:", currentEpisode.title);
             videoElement.src = currentEpisode.url; // For direct MP4 or other native support
        }
        
        // Plyr source can also be set like this after HLS setup if preferred.
        // This gives Plyr more metadata.
        // newPlayer.source = {
        //   type: 'video',
        //   title: currentEpisode.title,
        //   sources: [{
        //     src: currentEpisode.url,
        //     type: getMimeType(currentEpisode.url), // Plyr might use this to help select playback method
        //   }],
        //   poster: currentEpisode.thumbnail || anime?.coverImage || `https://picsum.photos/seed/${animeId}-${currentEpisode.id}-poster/1280/720`,
        // };

        newPlayer.on('ready', () => {
            console.log('Plyr ready for:', currentEpisode.title);
            // newPlayer.play(); // Autoplay is an option, or call play() here
        });
        newPlayer.on('ended', handleNextEpisode);
        newPlayer.on('error', (event: any) => {
            console.error("Plyr Player Error:", event);
            const plyrError = event.detail?.plyr;
            let message = "Video playback error.";
            if (plyrError?.source) {
                message += ` Source: ${plyrError.source}.`;
            }
            if (plyrError?.error?.message) {
                 message += ` Details: ${plyrError.error.message}`;
            }
            setError(message);
        });

    }).catch(e => {
        console.error("Failed to import Plyr or HLS.js:", e);
        setError("Could not load video player components.");
        destroyPlayer(); // Ensure cleanup on import failure
    });

    return destroyPlayer; // Cleanup function for the useEffect

  }, [currentEpisode, isLoading, error, animeId, anime, handleNextEpisode]); // Key dependencies
  

  if (isLoading && !anime) { // Initial page load for anime details
    return (
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,4rem)-1px)] py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading player and anime details...</p>
      </Container>
    );
  }

  // This error state handles critical failures like anime not found or initial load error
  if (error && (!anime || !currentEpisode)) { 
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
  
  if (!anime) { // Anime not found after loading attempt
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

  return (
    <div className="min-h-screen flex flex-col bg-background -mt-[calc(var(--header-height,4rem)+1px)] pt-[calc(var(--header-height,4rem)+1px)]">
      <Container className="py-4 md:py-6 flex-grow w-full max-w-full px-0 sm:px-4 md:px-6 lg:px-8">
        <div className="lg:flex lg:gap-6 xl:gap-8 h-full">
          <div className="lg:flex-grow mb-6 lg:mb-0 h-full flex flex-col">
            {/* Player Section */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl mb-4 w-full relative">
                <video 
                    ref={videoRef} 
                    key={currentEpisode?.id || 'no-episode'} // Force re-mount on episode change for fresh Plyr init
                    // poster={currentEpisode?.thumbnail || anime?.coverImage || `https://picsum.photos/seed/${animeId}-${currentEpisode?.id}-poster/1280/720`}
                    // data-ai-hint="video player content"
                />
                {/* Loading state for player specifically when episode is changing */}
                {isLoading && currentEpisode && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-sm text-primary-foreground mt-2">Loading Episode...</p>
                    </div>
                )}
                 {/* Error specific to video playback, shown over the player area */}
                {error && currentEpisode && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center z-10">
                    <AlertTriangle className="w-10 h-10 text-destructive mb-2" />
                    <p className="text-destructive-foreground text-sm">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                        setError(null); // Clear error to allow useEffect to retry
                        // Optionally force re-fetch/re-init if needed, but useEffect should handle it.
                    }}>Retry</Button>
                  </div>
                )}
                {/* Fallback UI when no episode URL is available yet, but anime data is loaded */}
                {!currentEpisode?.url && !isLoading && !error && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-card pointer-events-none">
                        <PlayCircleIcon className="w-24 h-24 opacity-30" />
                        <p className="mt-4 text-lg">
                            {(!anime.episodes || anime.episodes.length === 0) ? 'No episodes available for this anime.' :
                            !currentEpisode ? 'Select an episode to start watching.' :
                            'Video source is missing for this episode.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Details Section Below Player */}
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

          {/* Episode List Section */}
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

