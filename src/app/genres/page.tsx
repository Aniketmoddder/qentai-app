// src/app/genres/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@/components/layout/container';
import { getUniqueGenres } from '@/services/animeService';
import { Card, CardContent } from '@/components/ui/card';
import { Tag, Zap, Film, Ghost, Compass, Drama, Rocket, Palette, AlertCircle, Loader2, Heart as HeartIconLucide, School, Users, Swords, Brain, VenetianMask, History, Music, CookingPot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Explore All Genres - Qentai',
  description: 'Discover anime by browsing through a comprehensive list of genres.',
};

// Expanded genre to icon mapping
const genreIcons: Record<string, React.ElementType> = {
  'Action': Zap,
  'Adventure': Compass,
  'Comedy': Ghost,
  'Drama': Drama,
  'Fantasy': Palette,
  'Sci-Fi': Rocket,
  'Romance': HeartIconLucide,
  'Horror': VenetianMask,
  'Mystery': Compass,
  'Thriller': Zap,
  'Sports': Rocket,
  'Supernatural': Ghost,
  'Mecha': Rocket,
  'Historical': History,
  'Music': Music,
  'School': School,
  'Shounen': Users,
  'Shoujo': Users,
  'Seinen': Users,
  'Josei': Users,
  'Isekai': Compass,
  'Psychological': Brain,
  'Ecchi': HeartIconLucide,
  'Harem': Users,
  'Demons': VenetianMask,
  'Magic': Palette,
  'Martial Arts': Swords,
  'Military': Zap,
  'Parody': Ghost,
  'Police': Zap,
  'Samurai': Swords,
  'Space': Rocket,
  'Super Power': Zap,
  'Vampire': VenetianMask,
  'Game': Rocket,
  'Slice of Life': CookingPot,
  'Animation': Film, // Added specific icon for Animation if it appears as a genre
  'Crime': Zap, // Re-using for crime
  'Family': Users, // Re-using for family
  'Kids': Users, // Re-using for kids
  'Reality': Tv, // Assuming Tv icon from lucide-react
  'Soap': Drama, // Re-using for Soap
  'Talk': Users, // Re-using for Talk
  'War & Politics': Swords, // Re-using for War & Politics
  'Western': Compass, // Re-using for Western
  'Default': Tag,
};


async function GenresDisplay() {
  let genres: string[] = [];
  let error: string | null = null;

  try {
    genres = await getUniqueGenres(); // This fetches all unique genres from the database
    if (genres.length === 0) {
      error = "No genres are currently available. Please check back later or ensure anime data is populated.";
    }
  } catch (e) {
    console.error("Failed to load genres for /genres page:", e);
    error = "Could not load genres at this time. Please try refreshing the page.";
  }

  if (error) {
    return (
      <div className="my-12 flex flex-col items-center text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Error Loading Genres</h2>
        <p className="text-muted-foreground">{error}</p>
        <Link href="/" className="mt-6">
          <Button variant="outline">Go Back Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
      {genres.map((genre) => {
        const IconComponent = genreIcons[genre] || genreIcons['Default'];
        const isRomance = genre.toLowerCase() === 'romance' || genre.toLowerCase() === 'ecchi';
        return (
          <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} passHref legacyBehavior={false}>
            <Card className="group bg-card hover:bg-primary/10 border-border/30 shadow-sm hover:shadow-primary/20 transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer h-full flex flex-col">
              <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center flex-grow">
                <IconComponent className={cn("w-8 h-8 sm:w-9 sm:h-9 mb-2 text-primary group-hover:text-primary transition-colors", isRomance ? 'fill-primary' : '')} />
                <p className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate w-full">
                  {genre}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-var(--header-height)-1px)]">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="ml-3 text-muted-foreground">Loading genres...</p>
    </div>
  );
}


export default function GenresPage() {
  return (
    <Container className="py-8 md:py-12 min-h-[calc(100vh-var(--header-height,4rem)-var(--footer-height,0px)-1px)]">
      <div className="mb-8 md:mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary mb-2 font-zen-dots">Explore All Genres</h1>
        <p className="text-lg text-muted-foreground font-orbitron">
          Find your next favorite anime by diving into diverse genres.
        </p>
      </div>
      <Suspense fallback={<LoadingFallback />}>
        <GenresDisplay />
      </Suspense>
    </Container>
  );
}

// Adding Tv icon for completeness if not already imported, assuming it's from lucide-react
import { Tv } from 'lucide-react';
```