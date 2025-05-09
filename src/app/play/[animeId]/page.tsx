// src/app/play/[animeId]/page.tsx
"use client";

import type { Anime, Episode } from '@/types/anime';
import { mockAnimeData } from '@/lib/mock-data';
import Container from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageSquareWarning, Loader2, List, Star, PlayCircle } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';

// Dynamically import Plyr to avoid SSR issues if it's client-only
import type PlyrType from 'plyr';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';


interface PlayerPageProps {
  params: {
    animeId: string;
  };
}

// Simulate fetching anime data by ID (client-side for this example)
async function getAnimeDetails(id: string): Promise<Anime | undefined> {
  // In a real app, this would be an API call
  return mockAnimeData.find((anime) => anime.id === id);
}

export default function PlayerPage({ params }: PlayerPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const plyrRef = React.useRef<PlyrType | null>(null);


  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const details = await getAnimeDetails(params.animeId);
        if (details) {
          setAnime(details);
          const episodeIdFromQuery = searchParams.get('episode');
          let initialEpisode = details.episodes?.[0];
          if (episodeIdFromQuery) {
            const foundEpisode = details.episodes?.find(ep => ep.id === episodeIdFromQuery);
            if (foundEpisode) initialEpisode = foundEpisode;
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
  }, [params.animeId, searchParams]);

  const handleEpisodeSelect = (episode: Episode) => {
    setCurrentEpisode(episode);
    router.push(`/play/${params.animeId}?episode=${episode.id}`, { scroll: false });
     // Update player source if Plyr instance is available
    if (plyrRef.current && plyrRef.current.source) {
        plyrRef.current.source = {
            type: 'video',
            sources: [{ src: episode.url, provider: 'html5' }], // Assuming html5, adjust if needed
            // title: `${anime?.title} - Ep ${episode.episodeNumber}: ${episode.title}`, // Optional: Set title in player
        };
    }
  };

  const videoSource = useMemo(() => {
    if (!currentEpisode?.url) return null;
    return {
      type: 'video' as const,
      sources: [
        {
          src: currentEpisode.url,
          provider: 'html5' as const, // Or determine provider based on URL
        },
      ],
      // title: currentEpisode.title, // Optional: Set title in player
    };
  }, [currentEpisode]);
  
  const playerOptions: PlyrType.Options = {
    // Add Plyr options here, e.g., controls, autoplay, etc.
    // Example: controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
    // For more dynamic sources, you might set this up in an effect when currentEpisode changes
    // title: currentEpisode ? `${anime?.title} - Ep ${currentEpisode.episodeNumber}: ${currentEpisode.title}` : anime?.title,
    // quality: { default: 720, options: [1080, 720, 576, 480] }, // Example qualities
  };


  if (isLoading) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))] py-12">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading player...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))] py-12 text-center">
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
    return ( // Should be caught by error state, but as a fallback
      <Container className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))] py-12 text-center">
         <h1 className="text-2xl font-bold">Anime Not Found</h1>
         <Button asChild variant="link" className="mt-4">
          <Link href="/">Go back to Home</Link>
        </Button>
      </Container>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col"> {/* Ensure full height for sticky footer if needed */}
      <Container className="py-6 flex-grow">
        <div className="lg:flex lg:gap-8">
          {/* Main Player Area */}
          <div className="lg:w-2/3 xl:w-3/4 mb-6 lg:mb-0">
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl mb-4">
              {videoSource ? (
                 <Plyr 
                    // @ts-ignore
                    ref={(plyr) => plyrRef.current = plyr?.plyr} // Access the Plyr instance
                    source={videoSource} 
                    options={playerOptions} 
                 />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <PlayCircle className="w-24 h-24 opacity-50" />
                  <p className="absolute bottom-4">Select an episode to play</p>
                </div>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{anime.title}</h1>
            {currentEpisode && (
              <h2 className="text-lg sm:text-xl text-primary mb-3">
                Episode {currentEpisode.episodeNumber}: {currentEpisode.title}
              </h2>
            )}
            <p className="text-sm text-muted-foreground mb-6 line-clamp-3">{anime.synopsis}</p>
          </div>

          {/* Episode List & Info Sidebar */}
          <div className="lg:w-1/3 xl:w-1/4">
            <div className="bg-card p-4 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-primary mb-3 flex items-center">
                <List className="mr-2 w-5 h-5" /> Episodes
              </h3>
              <div className="max-h-[60vh] lg:max-h-[calc(100vh-20rem)] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {anime.episodes?.map((ep) => (
                  <Button
                    key={ep.id}
                    variant={currentEpisode?.id === ep.id ? 'default' : 'ghost'}
                    className={`w-full justify-start text-left h-auto py-2.5 px-3 ${
                      currentEpisode?.id === ep.id ? 'bg-primary/90 text-primary-foreground' : 'hover:bg-primary/10'
                    }`}
                    onClick={() => handleEpisodeSelect(ep)}
                  >
                    <div className="flex items-center w-full">
                        {currentEpisode?.id === ep.id && <PlayCircle className="w-4 h-4 mr-2 flex-shrink-0" />}
                        <span className={`text-xs sm:text-sm font-medium ${currentEpisode?.id === ep.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                        Ep {ep.episodeNumber}: {ep.title}
                        </span>
                        {/* Optional: duration or checkmark for watched */}
                    </div>
                  </Button>
                ))}
                 {(!anime.episodes || anime.episodes.length === 0) && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No episodes available for this series.</p>
                )}
              </div>
            </div>

            {/* Placeholder Rating Section */}
            <div className="bg-card p-4 rounded-lg shadow-lg mt-4">
              <h3 className="text-xl font-semibold text-primary mb-3 flex items-center">
                <Star className="mr-2 w-5 h-5" /> Rate this Anime
              </h3>
              <p className="text-sm text-muted-foreground">Rating feature coming soon!</p>
              {/* Add star inputs or similar here */}
            </div>

            {/* Placeholder Report Section */}
            <div className="bg-card p-4 rounded-lg shadow-lg mt-4">
              <h3 className="text-xl font-semibold text-destructive mb-3 flex items-center">
                <MessageSquareWarning className="mr-2 w-5 h-5" /> Report Issue
              </h3>
              <p className="text-sm text-muted-foreground">Report functionality coming soon.</p>
              {/* Add report button/form here */}
            </div>
            
          </div>
        </div>
      </Container>
    </div>
  );
}
