
import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Star, PlayCircle } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  return (
    <Link href={`/anime/${anime.id}`} passHref legacyBehavior>
      <Card
        tabIndex={0} 
        className="group w-[45vw] max-w-[180px] h-[270px] overflow-hidden bg-card border-border shadow-lg hover:shadow-primary/40 focus-visible:shadow-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-300 flex flex-col relative rounded-lg cursor-pointer"
        data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
      >
        {/* Background Image */}
        <Image
          src={anime.coverImage}
          alt={anime.title}
          fill
          sizes="(max-width: 640px) 45vw, 180px" // Adjusted sizes based on max-width
          className="object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
          priority={false}
        />
        
        {/* Overlay for better text contrast and hover effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:from-black/95 group-hover:via-black/70 transition-all duration-300" />
        
        {/* Badges positioned at the top */}
        {anime.averageRating && (
          <Badge
            variant="default"
            className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 z-20 shadow-md"
          >
            <Star className="w-3 h-3 mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
          </Badge>
        )}
        {anime.type && (
           <Badge variant="secondary" className="absolute top-2 left-2 text-xs px-1.5 py-0.5 z-20 shadow-md">
            {anime.type}
          </Badge>
        )}

        {/* Centered Play Icon on Hover - links to player page */}
        <div 
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 z-10"
            onClick={(e) => {
                e.stopPropagation(); 
                // router.push(`/play/${anime.id}`) // Alternative navigation if needed, but Link below should handle it
            }}
        >
            <Link 
                href={`/play/${anime.id}`} 
                onClick={(e) => e.stopPropagation()} 
                aria-label={`Play ${anime.title}`}
                className="p-2 rounded-full hover:bg-black/30 transition-colors"
                tabIndex={-1} 
            >
                <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 text-primary filter drop-shadow-lg group-hover:scale-110 group-focus-visible:scale-110 transition-transform duration-300" />
            </Link>
        </div>

        {/* Content at the bottom */}
        <div className="relative z-10 flex flex-col justify-end p-2.5 mt-auto"> {/* Changed p-3 to p-2.5, removed flex-grow */}
          <h3 
              className="text-lg font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200" // Changed text-base sm:text-lg to text-lg
              title={anime.title}
          >
            {anime.title}
          </h3>
          <div className="text-xs text-muted-foreground/90 group-hover:text-muted-foreground mt-1 space-x-1">
            <span>{anime.year}</span>
            <span>&bull;</span>
            <span className="truncate">{anime.genre.slice(0,1).join(', ')}</span>
          </div>
          
          <Button
            asChild
            variant="default"
            size="sm"
            className="w-full btn-primary-gradient text-xs sm:text-sm mt-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-y-3 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-all duration-300 ease-in-out"
            onClick={(e) => {
                e.stopPropagation();
            }}
            tabIndex={-1} 
          >
            <Link href={`/play/${anime.id}`}>
              <PlayCircle className="mr-1.5 h-4 w-4" /> Watch
            </Link>
          </Button>
        </div>
      </Card>
    </Link>
  );
}
