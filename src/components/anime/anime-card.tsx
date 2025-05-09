// src/components/anime/anime-card.tsx
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Star, PlayCircle } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const router = useRouter();
  const firstEpisodeId = anime.episodes?.[0]?.id || '';

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent navigation if a Link or Button inside the card was clicked
    if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) {
      return;
    }
    router.push(`/anime/${anime.id}`);
  };

  return (
    <Card
      className="group relative w-[45vw] max-w-[180px] h-[270px] overflow-hidden bg-card border-border shadow-lg hover:shadow-primary/40 transition-all duration-300 flex flex-col rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // Prevent default space scroll and trigger click
          e.preventDefault();
          handleCardClick(e as any); // Cast to any to satisfy MouseEvent type, not ideal but works for this
        }
      }}
      tabIndex={0} // Make card focusable
      role="link" //ARIA role
      aria-label={`View details for ${anime.title}`}
    >
      {/* Image */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src={anime.coverImage}
          alt={anime.title}
          fill
          sizes="(max-width: 640px) 45vw, 180px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={false}
        />
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:from-black/95 group-hover:via-black/70 transition-all duration-300" />
      
      {/* Badges */}
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
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-10"
      >
          <Link 
              href={`/play/${anime.id}?episode=${firstEpisodeId}`}
              onClick={(e) => e.stopPropagation()} 
              aria-label={`Play ${anime.title}`}
              className="p-2 rounded-full hover:bg-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
          >
              <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 text-primary filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300" />
          </Link>
      </div>

      {/* Content at the bottom */}
      <div className="relative z-10 flex flex-col justify-end p-2.5 mt-auto h-full">
        <div className="mt-auto"> 
            <h3 
                className="text-base sm:text-lg font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200"
                title={anime.title}
            >
                {anime.title}
            </h3>
            <div className="text-xs text-muted-foreground/90 group-hover:text-muted-foreground mt-1 space-x-1">
                <span>{anime.year}</span>
                <span>&bull;</span>
                <span className="truncate">{anime.genre.slice(0,1).join(', ')}</span>
            </div>
        </div>
        
        {/* Watch Button */}
        <Button
          asChild
          variant="default"
          size="sm"
          className="w-full btn-primary-gradient text-xs sm:text-sm 
                     mt-2 
                     opacity-0 group-hover:opacity-100 
                     max-h-0 group-hover:max-h-9 
                     group-hover:py-1.5
                     invisible group-hover:visible 
                     overflow-hidden 
                     transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          onClick={(e) => {
              e.stopPropagation(); 
          }}
        >
          <Link href={`/play/${anime.id}?episode=${firstEpisodeId}`}>
            <PlayCircle className="mr-1.5 h-4 w-4" /> Watch
          </Link>
        </Button>
      </div>
    </Card>
  );
}
