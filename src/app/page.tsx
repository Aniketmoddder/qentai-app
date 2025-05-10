
import Container from '@/components/layout/container';
import AnimeCarousel from '@/components/anime/anime-carousel';
import RecommendationsSection from '@/components/anime/recommendations-section';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, AlertTriangle, Play, Plus, Tv, Calendar, ListVideo, Filter } from 'lucide-react';
import { getAllAnimes } from '@/services/animeService';
import type { Anime } from '@/types/anime';
import FeaturedAnimeCard from '@/components/anime/FeaturedAnimeCard';
import TopAnimeListItem from '@/components/anime/TopAnimeListItem';
import { Badge } from '@/components/ui/badge';


const shuffleArray = <T,>(array: T[]): T[] => {
  if (!array || array.length === 0) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default async function Home() {
  let allAnime: Anime[] = [];
  let fetchError: string | null = null;

  try {
    allAnime = await getAllAnimes(50); 
  } catch (error) {
    console.error("Failed to fetch animes for homepage:", error);
    fetchError = "Could not load anime data. Please try again later.";
  }
  
  const trendingAnime = shuffleArray([...allAnime]).slice(0, 10); 
  const popularAnime = shuffleArray([...allAnime]).slice(0, 10);
  const recentlyAddedAnime = [...allAnime].sort((a,b) => (b.year || 0) - (a.year || 0)).slice(0,10);
  const movies = allAnime.filter(a => a.type === 'Movie').slice(0,10);
  const nextSeasonAnime = shuffleArray([...allAnime].filter(a => a.status === 'Upcoming')).slice(0,10); // Example for "Next Season"

  // Hero section anime (example: first trending or a highly rated one)
  const heroAnime = trendingAnime[0] || allAnime[0];

  // Featured anime (example: next two from trending or popular)
  const featuredAnimes = popularAnime.slice(1, 3); 

  // Top Anime (sorted by rating, needs actual rating data or placeholder)
  const topAnimeList = [...allAnime]
    .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    .slice(0, 10);

  return (
    <>
      {/* Hero Section */}
      {heroAnime && !fetchError && (
        <section className="relative h-[70vh] md:h-[85vh] w-full flex items-end -mt-[calc(var(--header-height,4rem)+1px)]">
          <div className="absolute inset-0">
            <Image
              src={heroAnime.bannerImage || `https://picsum.photos/seed/${heroAnime.id}-hero/1600/900`}
              alt={`${heroAnime.title} banner`}
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-40"
              priority
              data-ai-hint="anime landscape epic"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          </div>
          <Container className="relative z-10 pb-12 md:pb-20 text-foreground">
            <div className="max-w-2xl">
              <Badge className="bg-[hsl(var(--secondary-accent-pink))] text-white text-xs font-semibold px-2.5 py-1 rounded-md mb-3">
                #1 Trending
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 leading-tight">
                {heroAnime.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-5">
                {heroAnime.type && <span className="flex items-center"><Tv className="w-4 h-4 mr-1.5" /> {heroAnime.type}</span>}
                {/* Placeholder for duration */}
                {heroAnime.episodes && heroAnime.episodes.length > 0 && 
                  <span className="flex items-center"><ListVideo className="w-4 h-4 mr-1.5" /> {heroAnime.episodes.length} Episodes</span>
                }
                 <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {heroAnime.year}</span>
              </div>
              <p className="text-base md:text-lg text-muted-foreground mb-6 line-clamp-3">
                {heroAnime.synopsis}
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Button asChild size="lg" className="btn-primary-gradient rounded-full px-8 py-3 text-base">
                  <Link href={`/play/${heroAnime.id}${heroAnime.episodes && heroAnime.episodes.length > 0 ? `?episode=${heroAnime.episodes[0].id}` : ''}`}>
                    <Play className="mr-2 h-5 w-5 fill-current" /> Watch Now
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="rounded-full px-8 py-3 text-base border-foreground/30 text-foreground hover:bg-foreground/10 hover:border-foreground/50">
                  <Plus className="mr-2 h-5 w-5" /> Add to List
                </Button>
              </div>
            </div>
          </Container>
        </section>
      )}
      
      <Container className="overflow-x-clip py-8">
        {fetchError && (
          <div className="my-8 p-6 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center text-destructive">
            <AlertTriangle className="h-6 w-6 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold">Error Loading Content</h3>
              <p className="text-sm">{fetchError}</p>
            </div>
          </div>
        )}
        {!fetchError && allAnime.length === 0 && (
           <div className="my-8 p-6 bg-card border border-border rounded-lg text-center">
            <h3 className="font-semibold text-xl">No Anime Found</h3>
            <p className="text-muted-foreground">It looks like there's no anime in the database yet. An admin can add some via the admin panel.</p>
          </div>
        )}

        {/* Featured Anime Section */}
        {featuredAnimes.length > 0 && (
          <section className="py-6 md:py-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground section-title-bar">Featured Anime</h2>
              <Button variant="link" asChild className="text-primary hover:text-primary/80">
                <Link href="/browse?filter=featured">View More <ChevronRight className="w-4 h-4 ml-1"/></Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {featuredAnimes.map(anime => (
                <FeaturedAnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </section>
        )}


        {trendingAnime.length > 0 && <AnimeCarousel title="Trending Now" animeList={trendingAnime} />}
        {popularAnime.length > 0 && <AnimeCarousel title="Popular This Season" animeList={popularAnime} />}
        {recentlyAddedAnime.length > 0 && <AnimeCarousel title="Latest TV Series" animeList={recentlyAddedAnime} />}
        {movies.length > 0 && <AnimeCarousel title="Popular Movies" animeList={movies} />}
        
        {/* Top Anime Section */}
        {topAnimeList.length > 0 && (
          <section className="py-6 md:py-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground section-title-bar">Top Anime</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="border-primary/50 text-primary/90 hover:bg-primary/10">
                  <Filter className="w-3.5 h-3.5 mr-1.5"/> Filter
                </Button>
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
        
        {nextSeasonAnime.length > 0 && <AnimeCarousel title="Next Season" animeList={nextSeasonAnime} />}
        
        {/* RecommendationsSection can be kept or removed based on if it fits the new design */}
        {/* <RecommendationsSection /> */}
      </Container>
    </>
  );
}

