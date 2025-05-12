// src/components/anime/anime-card.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnimeCardProps {
  anime: Anime;
  className?: string;
}

export default function AnimeCard({ anime, className }: AnimeCardProps) {
  const getEpisodeBadgeText = () => {
    if (anime.type === 'Movie') {
      return 'Movie';
    }
    const count = anime.episodesCount && anime.episodesCount > 0 
                  ? anime.episodesCount 
                  : (anime.episodes && anime.episodes.length > 0 ? anime.episodes.length : 0);
    
    if (count > 0) {
      return `Ep ${count}`;
    }
    return null;
  };

  const episodeBadgeText = getEpisodeBadgeText();
  const placeholderCover = `https://picsum.photos/seed/${anime.id}/200/300`; // Smaller placeholder for smaller cards

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={cn(
        "group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg",
        // Adjusted width and max-width for smaller cards, similar to screenshot
        "w-[calc(50vw-1.25rem)] max-w-[150px] sm:w-auto sm:max-w-[160px] md:max-w-[170px]", 
        className
      )}
      aria-label={`View details for ${anime.title}`}
    >
      <div className="flex flex-col h-full">
        <div className="relative w-full aspect-[2/3] overflow-hidden rounded-lg shadow-md hover:shadow-primary/20 transition-shadow duration-300 bg-card border border-border/20">
          <Image
            src={anime.coverImage || placeholderCover}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 40vw, (max-width: 768px) 160px, 170px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            priority={false} 
            data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait poster`}
          />
          {episodeBadgeText && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <Badge
                variant="secondary" // This variant usually has a darker background
                className="bg-black/70 text-white text-[0.6rem] px-2 py-0.5 border-transparent font-semibold backdrop-blur-sm"
              >
                {episodeBadgeText}
              </Badge>
            </div>
          )}
        </div>
        <div className="mt-2 px-0.5">
          <p
            className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200 truncate flex items-center"
            title={anime.title}
          >
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 flex-shrink-0"></span>
            {anime.title}
          </p>
        </div>
      </div>
    </Link>
  );
}
