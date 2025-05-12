// src/components/anime/anime-card.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PlayCircle } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
  className?: string;
}

export default function AnimeCard({ anime, className }: AnimeCardProps) {
  const firstEpisodeId = anime.episodes?.[0]?.id || '';
  const placeholderCover = `https://picsum.photos/seed/${anime.id}/200/300`;

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

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={cn(
        "group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg",
        "w-[calc(50vw-1.25rem)] max-w-[150px] sm:w-auto sm:max-w-[160px] md:max-w-[170px]", 
        className
      )}
      aria-label={`View details for ${anime.title}`}
    >
      <div className="flex flex-col h-full bg-card border border-border/20 rounded-lg overflow-hidden shadow-md hover:shadow-primary/20 transition-shadow duration-300">
        <div className="relative w-full aspect-[2/3] ">
          <Image
            src={anime.coverImage || placeholderCover}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 40vw, (max-width: 768px) 160px, 170px"
            className="object-cover transition-transform duration-300" // Removed group-hover:scale-105
            priority={false} 
            data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait poster`}
          />
          {episodeBadgeText && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <Badge
                variant="secondary"
                className="bg-black/70 text-white text-[0.6rem] px-2 py-0.5 border-transparent font-semibold backdrop-blur-sm"
              >
                {episodeBadgeText}
              </Badge>
            </div>
          )}
           {/* Centered Play Icon on Hover - links to player page. */}
            <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
            >
                <Link
                    href={`/play/${anime.id}?episode=${firstEpisodeId}`}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent outer Link (to details page) from firing
                    }}
                    aria-label={`Play ${anime.title}`}
                    className="p-2 rounded-full hover:bg-black/30 focus:bg-black/40 focus:outline-none"
                >
                    <PlayCircle className="w-10 h-10 text-white/90 drop-shadow-lg" />
                </Link>
            </div>
        </div>
        <div className="p-2 text-center mt-auto"> {/* Ensures text is at the bottom */}
          <p
            className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200 truncate"
            title={anime.title}
          >
            {anime.title}
          </p>
        </div>
      </div>
    </Link>
  );
}
