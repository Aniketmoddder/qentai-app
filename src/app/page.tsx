
import Container from '@/components/layout/container';
import AnimeCarousel from '@/components/anime/anime-carousel';
import RecommendationsSection from '@/components/anime/recommendations-section';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { getAllAnimes } from '@/services/animeService';
import type { Anime } from '@/types/anime';

// Helper function to shuffle array for variety in carousels
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
    allAnime = await getAllAnimes(30); // Fetch more for shuffling variety
  } catch (error) {
    console.error("Failed to fetch animes for homepage:", error);
    fetchError = "Could not load anime data. Please try again later.";
  }
  
  const trendingAnime = shuffleArray([...allAnime]).slice(0, 10); 
  const popularAnime = shuffleArray([...allAnime]).slice(0, 10);
  const recentlyAddedAnime = [...allAnime].sort((a,b) => (b.year || 0) - (a.year || 0)).slice(0,10); // Assuming year indicates recency
  
  let featuredAnime = allAnime.find(anime => anime.averageRating && anime.averageRating >= 4.5 && anime.bannerImage); 
  if (!featuredAnime && allAnime.length > 0) {
    featuredAnime = allAnime.sort((a,b) => (b.averageRating || 0) - (a.averageRating || 0))[0]; 
  }


  return (
    <>
      {/* Hero Section */}
      {featuredAnime && !fetchError && (
        <section className="relative h-[60vh] md:h-[75vh] w-full flex items-end -mt-[calc(var(--header-height,4rem)+1px)]"> {/* Adjust for header height */}
          <div className="absolute inset-0">
            <Image
              src={featuredAnime.bannerImage || `https://picsum.photos/seed/${featuredAnime.id}-hero/1600/900`}
              alt={`${featuredAnime.title} banner`}
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-60"
              priority
              data-ai-hint="anime landscape action"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"></div>
          </div>
          <Container className="relative z-10 pb-12 md:pb-20">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight text-foreground">
                {featuredAnime.title}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-6 line-clamp-3">
                {featuredAnime.synopsis}
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <Button asChild size="lg" className="btn-primary-gradient">
                  <Link href={`/play/${featuredAnime.id}${featuredAnime.episodes && featuredAnime.episodes.length > 0 ? `?episode=${featuredAnime.episodes[0].id}` : ''}`}>
                    Watch Now <ChevronRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-foreground/50 text-foreground hover:bg-foreground/10">
                  <Link href={`/anime/${featuredAnime.id}`}>More Info</Link>
                </Button>
              </div>
            </div>
          </Container>
        </section>
      )}
      
      <Container className="overflow-x-clip">
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

        {trendingAnime.length > 0 && <AnimeCarousel title="Trending Now" animeList={trendingAnime} />}
        {popularAnime.length > 0 && <AnimeCarousel title="Popular Choices" animeList={popularAnime} />}
        {recentlyAddedAnime.length > 0 && <AnimeCarousel title="Recently Added" animeList={recentlyAddedAnime} />}
        <RecommendationsSection />
      </Container>
    </>
  );
}
