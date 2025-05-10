// src/app/genres/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@/components/layout/container';
import { getUniqueGenres } from '@/services/animeService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, Zap, Film, Ghost, Compass, Drama, Rocket, Palette, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Explore All Genres - Qentai',
  description: 'Discover anime by browsing through a comprehensive list of genres.',
};

const genreIcons: Record<string, React.ElementType> = {
  'Action': Zap,
  'Adventure': Compass,
  'Comedy': Ghost, // Using Ghost for a playful take on comedy
  'Drama': Drama,
  'Fantasy': Palette, // Using Palette for creative fantasy worlds
  'Sci-Fi': Rocket,
  'Romance': HeartIcon, // Will define HeartIcon below for clarity
  'Horror': Ghost,
  'Mystery': Compass, // Re-using Compass for mystery/exploration
  'Thriller': Zap, // Re-using Zap for intensity
  'Sports': Rocket, // Re-using Rocket for dynamic sports
  'Default': Tag,
};

// Simple Heart icon for Romance
const HeartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);


async function GenresDisplay() {
  let genres: string[] = [];
  let error: string | null = null;

  try {
    genres = await getUniqueGenres();
    if (genres.length === 0) {
      error = "No genres are currently available. Please check back later.";
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {genres.map((genre) => {
        const IconComponent = genreIcons[genre] || genreIcons['Default'];
        return (
          <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} passHref legacyBehavior={false}>
            <Card className="group bg-card hover:bg-primary/10 border-border/30 shadow-md hover:shadow-primary/20 transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer h-full flex flex-col">
              <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-center text-center flex-grow">
                <IconComponent className={cn("w-8 h-8 sm:w-10 sm:h-10 mb-2 text-primary group-hover:text-primary transition-colors", genre === 'Romance' ? 'fill-primary' : '')} />
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