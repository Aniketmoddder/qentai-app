// src/components/home/HomePageGenreSection.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Tag, Zap, Compass, Ghost, Palette, Rocket, Drama } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { getUniqueGenres } from '@/services/animeService'; // Assuming getUniqueGenres can be called client-side or this becomes a server component chunk

interface GenreItem {
  name: string;
  icon: React.ElementType;
}

const commonGenreIcons: Record<string, React.ElementType> = {
  'Action': Zap,
  'Adventure': Compass,
  'Comedy': Ghost,
  'Fantasy': Palette,
  'Sci-Fi': Rocket,
  'Drama': Drama,
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
commonGenreIcons['Romance'] = HeartIcon;


export default function HomePageGenreSection() {
  const [displayGenres, setDisplayGenres] = useState<GenreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAndSetGenres() {
      setIsLoading(true);
      try {
        const allGenres = await getUniqueGenres();
        // Select a few prominent genres or a random subset
        const prominentGenreNames = ['Action', 'Comedy', 'Fantasy', 'Sci-Fi', 'Romance', 'Adventure'];
        const selected: GenreItem[] = [];
        
        for (const name of prominentGenreNames) {
          if (allGenres.includes(name) && selected.length < 6) {
            selected.push({ name, icon: commonGenreIcons[name] || commonGenreIcons['Default'] });
          }
        }
        // If not enough prominent genres found, fill with others from allGenres
        let i = 0;
        while(selected.length < 6 && i < allGenres.length) {
            const genreName = allGenres[i];
            if(!selected.find(g => g.name === genreName)) {
                 selected.push({ name: genreName, icon: commonGenreIcons[genreName] || commonGenreIcons['Default'] });
            }
            i++;
        }
        setDisplayGenres(selected.slice(0,6)); // Ensure max 6 genres
      } catch (error) {
        console.error("Failed to load genres for home page section:", error);
        // Fallback to a default set if fetch fails
        setDisplayGenres([
          { name: 'Action', icon: Zap },
          { name: 'Comedy', icon: Ghost },
          { name: 'Fantasy', icon: Palette },
          { name: 'Sci-Fi', icon: Rocket },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAndSetGenres();
  }, []);

  if (isLoading) {
    return (
      <section className="py-6 md:py-8">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground section-title-bar font-orbitron flex items-center">
            <Tag className="w-6 h-6 mr-2 text-primary" /> Explore by Genre
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="animate-pulse bg-muted/50 h-[100px] md:h-[120px]"></Card>
          ))}
        </div>
      </section>
    );
  }

  if (displayGenres.length === 0) {
    return null; // Don't render if no genres to display
  }

  return (
    <section className="py-6 md:py-8">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground section-title-bar font-orbitron flex items-center">
          <Tag className="w-6 h-6 mr-2 text-primary" /> Explore by Genre
        </h2>
        <Button variant="link" asChild className="text-primary hover:text-primary/80">
          <Link href="/genres">View All Genres <ChevronRight className="w-4 h-4 ml-1"/></Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {displayGenres.map((genre) => (
          <Link key={genre.name} href={`/browse?genre=${encodeURIComponent(genre.name)}`} passHref legacyBehavior={false}>
            <Card className="group bg-card hover:bg-primary/10 border-border/40 shadow-sm hover:shadow-primary/20 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 cursor-pointer h-[100px] md:h-[120px]">
              <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center text-center h-full">
                <genre.icon className={cn("w-7 h-7 md:w-8 md:h-8 mb-1.5 text-primary group-hover:text-primary transition-colors", genre.name === 'Romance' ? 'fill-primary' : '')} />
                <p className="text-xs md:text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate w-full">
                  {genre.name}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}