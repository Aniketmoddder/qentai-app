// src/app/play/[animeId]/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react'; // Added React import here
import type { Anime, Episode } from '@/types/anime';
import { mockAnimeData } from '@/lib/mock-data';
import Container from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageSquareWarning, Loader2, List, Star, PlayCircle, ChevronRight, Tv, Film, ListVideo } from 'lucide-react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


// Dynamically import Plyr to avoid SSR issues if it's client-only
import type PlyrType from 'plyr';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';


// Simulate fetching anime data by ID (client-side for this example)
async function getAnimeDetails(id: string): Promise<Anime | undefined> {
  // In a real app, this would be an API call
  return mockAnimeData.find((anime) => anime.id === id);
}

export default function PlayerPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const animeId = params.animeId as string;

  const [anime, setAnime] = useState<Anime | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const plyrRef = useRef<PlyrType | null>(null);


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
             // If no episode in query, default to the first episode and update URL
            initialEpisode = details.episodes[0];
            router.replace(`/play/${animeId}?episode=${initialEpisode.id}`, { scroll: false });
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

  const handleEpisodeSelect = (episode: Episode) => {
    setCurrentEpisode(episode);
    router.push(`/play/${animeId}?episode=${episode.id}`, { scroll: false });
  };

  const handleNextEpisode = () => {
    if (!anime || !currentEpisode || !anime.episodes) return;
    const currentIndex = anime.episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (currentIndex !== -1 && currentIndex < anime.episodes.length - 1) {
      const nextEpisode = anime.episodes[currentIndex + 1];
      handleEpisodeSelect(nextEpisode);
    }
  };
  
  const handlePreviousEpisode = () => {
    if (!anime || !currentEpisode || !anime.episodes) return;
    const currentIndex = anime.episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (currentIndex > 0) {
      const prevEpisode = anime.episodes[currentIndex - 1];
      handleEpisodeSelect(prevEpisode);
    }
  };


  useEffect(() => {
    // Update Plyr source when currentEpisode changes
    if (plyrRef.current && plyrRef.current.source && currentEpisode?.url) {
        plyrRef.current.source = {
            type: 'video',
            title: currentEpisode.title,
            sources: [{ 
              src: currentEpisode.url, 
              provider: 'html5', // This could be dynamic based on URL type (e.g., youtube, vimeo)
              // Example for quality (Plyr needs specific setup for this)
              // size: 720 // if you want to default to a specific size (needs Plyr PRO or custom setup)
            }],
            // poster: currentEpisode.thumbnail || anime?.coverImage, // Optional poster
            // tracks: currentEpisode.subtitles?.map(sub => ({ // Example for subtitles
            //   kind: 'captions',
            //   label: sub.label,
            //   srcLang: sub.srclang,
            //   src: sub.src,
            //   default: sub.default
            // }))
        };
    }
  }, [currentEpisode, anime?.coverImage]);


  const videoSource = useMemo(() => {
    if (!currentEpisode?.url) return null;
    return {
      type: 'video' as const,
      title: currentEpisode.title,
      sources: [
        {
          src: currentEpisode.url,
          provider: 'html5' as const, // Or determine provider based on URL
        },
      ],
      poster: currentEpisode.thumbnail || anime?.coverImage,
    };
  }, [currentEpisode, anime?.coverImage]);
  
  const playerOptions: PlyrType.Options = {
    // More advanced controls
    controls: [
        'play-large', 'rewind', 'play', 'fast-forward', 'progress', 
        'current-time', 'duration', 'mute', 'volume', 'captions', 
        'settings', 'pip', 'airplay', 'fullscreen'
    ],
    settings: ['captions', 'quality', 'speed', 'loop'],
    // Example qualities - This requires video sources to be structured accordingly or use a plugin.
    // Plyr HTML5 player itself doesn't handle quality switching natively for a single MP4 source.
    // You would typically provide multiple <source> tags or use HLS/DASH.
    quality: {
      default: 720, // Default quality
      options: [1080, 720, 480], // Available qualities
      // Forced: true, // If true, the kwaliteit selector will be shown
      // onChange: (quality: number) => console.log('Quality changed to', quality),
    },
    tooltips: { controls: true, seek: true },
    autoplay: false,
    loop: { active: false },
    // storage: { enabled: true, key: `plyr-player-${animeId}` }, // Persist settings
    // i18n: {
    //   // Custom text
    //   restart: 'Restart',
    //   rewind: 'Rewind {seektime}s',
    //   play: 'Play',
    //   // ... other custom texts
    // },
    // You can also define event listeners directly in options
    // events: ["ended", "progress", "error"],
    // listeners: {
    //   ended: () => handleNextEpisode(), // Autoplay next episode
    // }
  };

  // Handle Plyr instance creation and destruction
  useEffect(() => {
    if (plyrRef.current) {
      const player = plyrRef.current;
      player.on('ended', handleNextEpisode);
      // player.on('error', (event) => console.error("Plyr Error: ", event.detail.plyr.source));
      
      return () => {
        if (player) {
          player.off('ended', handleNextEpisode);
          // player.destroy(); // Plyr-react handles destroy on unmount
        }
      };
    }
  }, [plyrRef, handleNextEpisode]);


  if (isLoading) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,4rem)-1px)] py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading player...</p>
      </Container>
    );
  }

  if (error) {
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
      <Container className="py-4 md:py-6 flex-grow w-full max-w-full px-0 sm:px-4 md:px-6 lg:px-8"> {/* Full width for player on small screens */}
        <div className="lg:flex lg:gap-6 xl:gap-8 h-full">
          {/* Main Player Area */}
          <div className="lg:flex-grow mb-6 lg:mb-0 h-full flex flex-col"> {/* Takes up remaining space */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl mb-4 w-full relative">
                {/* Plyr Player Component */}
                {videoSource ? (
                    <Plyr
                        // @ts-ignore
                        ref={(plyr) => plyrRef.current = plyr?.plyr}
                        source={videoSource}
                        options={playerOptions}
                        className="[&>.plyr]:rounded-lg" // Style plyr itself
                    />
                ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-card">
                    <PlayCircle className="w-24 h-24 opacity-30" />
                    <p className="mt-4 text-lg">Select an episode to start watching</p>
                </div>
                )}
            </div>

            {/* Anime & Episode Info Below Player */}
            <div className="px-2 sm:px-0">
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-0">
                        <Link href={`/anime/${anime.id}`} className="hover:text-primary transition-colors">
                            {anime.title}
                        </Link>
                    </h1>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={handlePreviousEpisode} disabled={currentEpisodeIndex <= 0}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleNextEpisode} disabled={!anime.episodes || currentEpisodeIndex >= anime.episodes.length - 1}>
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
                    <Badge variant={anime.status === 'Completed' ? 'default' : 'secondary'} className="text-xs">
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

          {/* Episode List Sidebar */}
          <div className="lg:w-[320px] xl:w-[380px] flex-shrink-0">
            <div className="bg-card p-3 sm:p-4 rounded-lg shadow-lg h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg sm:text-xl font-semibold text-primary flex items-center">
                    <List className="mr-2 w-5 h-5" /> Episodes ({anime.episodes?.length || 0})
                </h3>
                {/* Future: Server/Source switcher */}
              </div>
              
              <ScrollArea className="flex-grow h-[calc(100vh-280px)] lg:h-[calc(100vh-var(--header-height,4rem)-180px)] pr-2 -mr-2"> {/* Dynamic height */}
                <div className="space-y-1.5">
                    {anime.episodes?.map((ep, index) => (
                    <TooltipProvider key={ep.id}>
                        <Tooltip delayDuration={200}>
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
                        <TooltipContent side="left" align="center">
                            <p>Ep {ep.episodeNumber}: {ep.title}</p>
                            {ep.duration && <p className="text-xs text-muted-foreground">{ep.duration}</p>}
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    ))}
                    {(!anime.episodes || anime.episodes.length === 0) && (
                        <p className="text-sm text-muted-foreground py-4 text-center">No episodes available for this series.</p>
                    )}
                </div>
              </ScrollArea>

                {/* Placeholder Sections */}
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
