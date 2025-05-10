
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Container from '@/components/layout/container';
import AnimeCarousel from '@/components/anime/anime-carousel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, AlertTriangle, Play, Plus, Tv, Calendar, ListVideo, Star as StarIcon, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { getAllAnimes, getFeaturedAnimes } from '@/services/animeService';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';
import type { Anime } from '@/types/anime';
import FeaturedAnimeCard from '@/components/anime/FeaturedAnimeCard';
import TopAnimeListItem from '@/components/anime/TopAnimeListItem';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FirestoreError } from 'firebase/firestore';

const shuffleArray = <T,>(array: T[]): T[] => {
  if (!array || array.length === 0) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getYouTubeVideoId = (url?: string): string | null => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      if (urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/embed/')[1].split('?')[0];
      }
    }
  } catch (e) {
    return null;
  }
  return null;
};

const FETCH_TIMEOUT_MS = 25000; 

const promiseWithTimeout = <T,>(promise: Promise<T>, ms: number, timeoutError = new Error('Promise timed out')) => {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(timeoutError);
    }, ms);
  });
  return Promise.race<T | never>([promise, timeout]);
};

export interface HomeClientProps {
  genreListComponent: React.ReactNode;
  recommendationsSectionComponent: React.ReactNode;
}

export default function HomeClient({ genreListComponent, recommendationsSectionComponent }: HomeClientProps) {
  const [allAnime, setAllAnime] = useState<Anime[]>([]);
  const [featuredAnimesList, setFeaturedAnimesList] = useState<Anime[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [playTrailer, setPlayTrailer] = useState(false);
  const [isTrailerMuted, setIsTrailerMuted] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    
    try {
      const fetchDataPromises = [
        getAllAnimes({ limit: 50, sortBy: 'updatedAt', sortOrder: 'desc' }), 
        getFeaturedAnimes(5) 
      ];
      
      const settledResults = await promiseWithTimeout(
        Promise.allSettled(fetchDataPromises),
        FETCH_TIMEOUT_MS, 
        new Error(`Failed to load homepage data within ${FETCH_TIMEOUT_MS / 1000} seconds. This could be due to network issues or missing Firestore indexes. Please check your Firebase console for index creation suggestions (e.g., on 'updatedAt' or 'isFeatured' fields).`)
      );

      let generalAnimes: Anime[] = [];
      let featured: Anime[] = [];
      const errors: string[] = [];

      const generalAnimesResult = settledResults[0];
      if (generalAnimesResult.status === 'fulfilled') {
        generalAnimes = generalAnimesResult.value.map(a => convertAnimeTimestampsForClient(a) as Anime) || [];
      } else {
        console.error("HomeClient: Error fetching general animes:", generalAnimesResult.reason);
        let errorMsg = generalAnimesResult.reason?.message || "Failed to load general animes.";
        if (generalAnimesResult.reason instanceof FirestoreError && generalAnimesResult.reason.code === 'failed-precondition') {
           errorMsg += ` General animes query failed. Ensure required Firestore indexes (e.g., on 'updatedAt' DESC) are created.`;
        }
        errors.push(errorMsg);
      }

      const featuredResult = settledResults[1];
      if (featuredResult.status === 'fulfilled') {
        let fetchedFeatured = featuredResult.value.map(a => convertAnimeTimestampsForClient(a) as Anime) || [];
        fetchedFeatured.sort((a, b) => a.title.localeCompare(b.title));
        featured = fetchedFeatured;
      } else {
        console.error("HomeClient: Error fetching featured animes:", featuredResult.reason);
        let errorMsg = featuredResult.reason?.message || "Failed to load featured animes.";
        if (featuredResult.reason instanceof FirestoreError && featuredResult.reason.code === 'failed-precondition') {
           errorMsg += ` Featured animes query failed. This usually means an index on 'isFeatured' (boolean) is missing or Firestore requires a more specific composite index. Check the Firebase console for index suggestions.`;
        }
        errors.push(errorMsg);
      }
      
      setAllAnime(generalAnimes); 
      setFeaturedAnimesList(featured);

      if (errors.length > 0) {
        setFetchError(errors.join(' | '));
      }

    } catch (error) { 
      let message = "Could not load anime data due to an unexpected issue. Please try again later.";
      if (error instanceof Error) {
        message = error.message;
         if (error.message.includes("index") || (error instanceof FirestoreError && error.code === 'failed-precondition')) {
            message += " This is often due to missing Firestore indexes. Please check your Firebase console for index creation suggestions.";
        }
      }
      setFetchError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const heroAnime = featuredAnimesList[0] || (allAnime.length > 0 ? shuffleArray([...allAnime])[0] : undefined);
  const youtubeVideoId = heroAnime?.trailerUrl ? getYouTubeVideoId(heroAnime.trailerUrl) : null;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (heroAnime && youtubeVideoId && !playTrailer) { 
      timer = setTimeout(() => {
        setPlayTrailer(true);
      }, 3000); 
    }
    return () => clearTimeout(timer);
  }, [heroAnime, youtubeVideoId, playTrailer]);

  const trendingAnime = allAnime.length > 0 ? shuffleArray([...allAnime]).slice(0, 10) : []; 
  const popularAnime = allAnime.length > 0 ? shuffleArray([...allAnime].filter(a => a.averageRating && a.averageRating >= 7.0)).slice(0,10) : [];
  const recentlyAddedAnime = allAnime.length > 0 
    ? [...allAnime].sort((a,b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.year, 0, 1).getTime());
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.year, 0, 1).getTime());
        return dateB - dateA;
      }).slice(0,10) 
    : []; 
  const movies = allAnime.length > 0 ? allAnime.filter(a => a.type === 'Movie').slice(0,10) : [];
  const tvSeries = allAnime.length > 0 ? allAnime.filter(a => a.type === 'TV').slice(0,10) : [];
  const nextSeasonAnime = allAnime.length > 0 ? shuffleArray([...allAnime].filter(a => a.status === 'Upcoming')).slice(0,10) : [];
  
  const topAnimeList = allAnime.length > 0 ? [...allAnime]
    .filter(a => a.averageRating !== undefined && a.averageRating !== null) 
    .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    .slice(0, 10) : [];

  if (isLoading && !heroAnime && !fetchError) {
    return (
      <>
        <section className="relative h-[70vh] md:h-[85vh] w-full flex items-end -mt-[calc(var(--header-height,4rem)+1px)] bg-muted/30">
          <div className="absolute inset-0">
             <Skeleton className="w-full h-full opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          </div>
           <Container className="relative z-10 pb-12 md:pb-20 text-foreground">
            <div className="max-w-2xl">
              <Skeleton className="h-6 w-24 mb-3 rounded-md" />
              <Skeleton className="h-12 md:h-16 w-3/4 mb-3 rounded-md" />
              <Skeleton className="h-4 w-1/2 mb-5 rounded-md" />
              <Skeleton className="h-5 w-full mb-1.5 rounded-md" />
              <Skeleton className="h-5 w-5/6 mb-6 rounded-md" />
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Skeleton className="h-12 w-36 rounded-full" />
                <Skeleton className="h-12 w-36 rounded-full" />
              </div>
            </div>
          </Container>
        </section>
        <Container className="py-8">
          <Skeleton className="h-8 w-48 mb-4 rounded-md" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[300px] w-full rounded-lg" />)}
          </div>
        </Container>
      </>
    );
  }

  const noContentAvailable = !isLoading && !fetchError && allAnime.length === 0 && featuredAnimesList.length === 0 && !heroAnime;

  return (
    <>
      {heroAnime && ( 
        <section className="relative h-[70vh] md:h-[85vh] w-full flex items-end -mt-[calc(var(--header-height,4rem)+1px)] overflow-hidden">
          <div className="absolute inset-0">
            {playTrailer && youtubeVideoId ? (
              <div className="absolute inset-0 w-full h-full pointer-events-none">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=${isTrailerMuted ? 1 : 0}&controls=0&showinfo=0&loop=1&playlist=${youtubeVideoId}&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1&vq=hd1080`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen 
                  className="w-full h-full scale-[1.8] sm:scale-[1.5] md:scale-[1.4] object-cover"
                ></iframe>
              </div>
            ) : (
              <Image
                src={heroAnime.bannerImage || `https://picsum.photos/seed/${heroAnime.id}-hero/1600/900`}
                alt={`${heroAnime.title} banner`}
                fill
                style={{ objectFit: 'cover' }}
                className="opacity-40"
                priority
                data-ai-hint="anime landscape epic"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          </div>

          <Container className="relative z-10 pb-12 md:pb-20 text-foreground">
            <div className="max-w-2xl">
              {heroAnime.isFeatured ? (
                <Badge className="bg-yellow-500/90 text-background text-xs font-semibold px-2.5 py-1 rounded-md mb-3">
                  <StarIcon className="w-3 h-3 mr-1.5 fill-current"/> Featured Pick
                </Badge>
              ) : (
                 <Badge className="bg-[hsl(var(--secondary-accent-pink))] text-white text-xs font-semibold px-2.5 py-1 rounded-md mb-3">
                    #1 Trending
                </Badge>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 leading-tight font-zen-dots">
                {heroAnime.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-5">
                {heroAnime.type && <span className="flex items-center"><Tv className="w-4 h-4 mr-1.5" /> {heroAnime.type}</span>}
                {heroAnime.episodes && heroAnime.episodes.length > 0 && 
                  <span className="flex items-center"><ListVideo className="w-4 h-4 mr-1.5" /> {heroAnime.episodes.length} Episodes</span>
                }
                 <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {heroAnime.year}</span>
              </div>
              <p className="text-base md:text-lg text-muted-foreground mb-6 line-clamp-3">
                {heroAnime.synopsis}
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                <Button asChild size="lg" className="btn-primary-gradient rounded-full px-8 py-3 text-base">
                  <Link href={`/play/${heroAnime.id}${heroAnime.episodes && heroAnime.episodes.length > 0 ? `?episode=${heroAnime.episodes[0].id}` : ''}`}>
                    <Play className="mr-2 h-5 w-5 fill-current" /> Watch Now
                  </Link>
                </Button>
                 <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-3 text-base border-foreground/30 text-foreground hover:bg-foreground/10 hover:border-foreground/50">
                  <Link href={`/anime/${heroAnime.id}`}>
                    <Plus className="mr-2 h-5 w-5" /> More Info
                  </Link>
                </Button>
                {playTrailer && youtubeVideoId && (
                  <div className="ml-auto sm:ml-3"> 
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                        e.stopPropagation();
                        setIsTrailerMuted(!isTrailerMuted);
                        }}
                        className="text-white/70 hover:text-white hover:bg-black/30 rounded-full"
                        aria-label={isTrailerMuted ? "Unmute trailer" : "Mute trailer"}
                    >
                        {isTrailerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Container>
        </section>
      )}
      
      <Container className="overflow-x-clip py-8">
        {fetchError && (
          <div className="my-8 p-6 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start text-destructive">
            <AlertTriangle className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold font-orbitron text-lg">Error Loading Content</h3>
              <p className="text-sm whitespace-pre-line">{fetchError}</p>
              <Button variant="link" size="sm" onClick={fetchData} className="mt-2 px-0 text-destructive hover:text-destructive/80">
                <Loader2 className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin': ''}`} /> Try reloading
              </Button>
            </div>
          </div>
        )}
        {noContentAvailable && (
           <div className="my-8 p-6 bg-card border border-border rounded-lg text-center">
            <h3 className="font-semibold text-xl font-orbitron">No Anime Found</h3>
            <p className="text-muted-foreground">It looks like there's no anime in the database yet. An admin can add some via the admin panel.</p>
          </div>
        )}

        {featuredAnimesList.length > 0 && (
          <section className="py-6 md:py-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground section-title-bar">Featured Anime</h2>
              <Button variant="link" asChild className="text-primary hover:text-primary/80">
                <Link href="/browse?filter=featured">View More <ChevronRight className="w-4 h-4 ml-1"/></Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {featuredAnimesList.slice(0, 2).map(anime => (
                <FeaturedAnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>
        )}

        {trendingAnime.length > 0 && <AnimeCarousel title="Trending Now" animeList={trendingAnime} />}
        {popularAnime.length > 0 && <AnimeCarousel title="Popular This Season" animeList={popularAnime} />}
        
        {genreListComponent}

        {recentlyAddedAnime.length > 0 && <AnimeCarousel title="Latest Additions" animeList={recentlyAddedAnime} />}
        {movies.length > 0 && <AnimeCarousel title="Popular Movies" animeList={movies} />}
        {tvSeries.length > 0 && <AnimeCarousel title="TV Series" animeList={tvSeries} />}
        
        {topAnimeList.length > 0 && (
          <section className="py-6 md:py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground section-title-bar">Top Anime</h2>
              <div className="flex items-center gap-2">
                <Button variant="link" asChild className="text-primary hover:text-primary/80">
                  <Link href="/browse?sort=top">View More <ChevronRight className="w-4 h-4 ml-1"/></Link>
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {topAnimeList.map((anime, index) => (
                <TopAnimeListItem key={anime.id} anime={anime} rank={index + 1} />
              ))}
            </div>
          </section>
        )}
        
        {nextSeasonAnime.length > 0 && <AnimeCarousel title="Coming Next Season" animeList={nextSeasonAnime} />}
        
         {recommendationsSectionComponent}
      </Container>
    </>
  );
}

