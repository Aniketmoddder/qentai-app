// src/components/home/HomePageGenreSection.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Tag, Zap, Compass, Ghost, Palette, Rocket, Drama, Heart as HeartIconLucide, School, Users, Swords, Brain, VenetianMask, History, Music, CookingPot } from 'lucide-react'; // Added more icons
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { getUniqueGenres } from '@/services/animeService';

interface GenreItem {
  name: string;
  icon: React.ElementType;
}

const commonGenreIcons: Record<string, React.ElementType> = {
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
  'Default': Tag,
};


export default function HomePageGenreSection() {
  const [displayGenres, setDisplayGenres] = useState<GenreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAndSetGenres() {
      setIsLoading(true);
      try {
        const allGenres = await getUniqueGenres();
        // Prioritize common/popular genres if they exist in fetched list
        const prominentGenreNames = ['Action', 'Comedy', 'Fantasy', 'Sci-Fi', 'Romance', 'Adventure', 'Drama', 'Horror'];
        const selected: GenreItem[] = [];
        
        for (const name of prominentGenreNames) {
          if (allGenres.includes(name) && selected.length < 8) { // Increased to show up to 8
            selected.push({ name, icon: commonGenreIcons[name] || commonGenreIcons['Default'] });
          }
        }
        
        // If not enough prominent genres found, fill with others from allGenres
        let i = 0;
        while(selected.length < 8 && i < allGenres.length) { // Show up to 8
            const genreName = allGenres[i];
            if(!selected.find(g => g.name === genreName)) {
                 selected.push({ name: genreName, icon: commonGenreIcons[genreName] || commonGenreIcons['Default'] });
            }
            i++;
        }
        setDisplayGenres(selected.slice(0,8)); // Ensure max 8 genres displayed
      } catch (error) {
        console.error("Failed to load genres for home page section:", error);
        // Fallback to a default set if fetch fails
        setDisplayGenres([
          { name: 'Action', icon: Zap },
          { name: 'Comedy', icon: Ghost },
          { name: 'Fantasy', icon: Palette },
          { name: 'Sci-Fi', icon: Rocket },
          { name: 'Romance', icon: HeartIconLucide},
          { name: 'Adventure', icon: Compass },
        ].slice(0,6));
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
        <Button variant="link" asChild className="text-primary hover:text-primary/80 font-poppins">
          <Link href="/genres">View All Genres <ChevronRight className="w-4 h-4 ml-1"/></Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {displayGenres.map((genre) => {
          const isRomance = genre.name.toLowerCase() === 'romance' || genre.name.toLowerCase() === 'ecchi';
          return (
            <Link key={genre.name} href={`/browse?genre=${encodeURIComponent(genre.name)}`} passHref legacyBehavior={false}>
              <Card className="group bg-card hover:bg-primary/10 border-border/40 shadow-sm hover:shadow-primary/20 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 cursor-pointer h-[100px] md:h-[120px]">
                <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center text-center h-full">
                  <genre.icon className={cn("w-7 h-7 md:w-8 md:h-8 mb-1.5 text-primary group-hover:text-primary transition-colors", isRomance ? 'fill-primary' : '')} />
                  <p className="text-xs md:text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate w-full">
                    {genre.name}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
