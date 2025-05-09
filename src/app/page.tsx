import Container from '@/components/layout/container';
import AnimeCarousel from '@/components/anime/anime-carousel';
import RecommendationsSection from '@/components/anime/recommendations-section';
import { mockAnimeData } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

// Helper function to shuffle array for variety in carousels
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function Home() {
  const trendingAnime = shuffleArray(mockAnimeData).slice(0, 10);
  const popularAnime = shuffleArray(mockAnimeData).slice(0, 10);
  const recentlyAddedAnime = [...mockAnimeData].sort((a,b) => b.year - a.year).slice(0,10); // Sort by year for "recent"
  const featuredAnime = mockAnimeData.find(anime => anime.id === '8') || mockAnimeData[0]; // Frieren or first

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[75vh] w-full flex items-end text-white -mt-[calc(4rem+1px)] md:-mt-[calc(4rem+1px+1rem)]"> {/* Adjust for header height */}
        <div className="absolute inset-0">
          <Image
            src={featuredAnime.bannerImage || 'https://picsum.photos/seed/hero-banner/1600/900'}
            alt={`${featuredAnime.title} banner`}
            fill
            style={{ objectFit: 'cover' }}
            className="opacity-60"
            priority
            data-ai-hint="anime landscape"
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
            <div className="flex space-x-4">
              <Button asChild size="lg" className="btn-primary-gradient">
                <Link href={`/anime/${featuredAnime.id}`}>
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
      
      <Container>
        <AnimeCarousel title="Trending Now" animeList={trendingAnime} />
        <AnimeCarousel title="Popular Choices" animeList={popularAnime} />
        <AnimeCarousel title="Recently Added" animeList={recentlyAddedAnime} />
        <RecommendationsSection />
      </Container>
    </>
  );
}
