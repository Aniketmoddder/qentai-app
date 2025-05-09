"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Card } from '@/components/ui/card';
import { PlayCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const firstEpisodeId = anime.episodes?.[0]?.id || '';

  return (
    <Link // Outer Link for details page
      href={`/anime/${anime.id}`}
      className="group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg w-full"
      aria-label={`View details for ${anime.title}`}
    >
      <Card
        tabIndex={-1} // Card itself is not focusable, the Link is
        className="relative w-[45vw] max-w-[180px] h-[270px] overflow-hidden bg-card border-border shadow-lg group-hover:shadow-primary/40 group-focus-visible:shadow-primary/40 transition-all duration-300 flex flex-col rounded-lg"
        data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
      >
        {/* Image and overlay */}
        <div className="absolute inset-0">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 20vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false} // Consider if any card images should be priority based on placement
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent group-hover:via-black/40 transition-all duration-300 pointer-events-none" />
        </div>

        {/* Content: Title and Year/Rating, at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-2 sm:p-2.5 text-white flex flex-col justify-end h-full">
          <div className="mt-auto"> {/* Pushes title and details to the bottom of its flex container */}
            <h3
              className="text-sm sm:text-base font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200"
              title={anime.title}
            >
              {anime.title}
            </h3>
            <div className="mt-1 flex justify-between items-center text-xs text-muted-foreground/90 group-hover:text-muted-foreground">
              <span className="truncate">{anime.year}</span>
              {anime.averageRating !== undefined && ( // Check for undefined explicitly
                <Badge
                  variant="default"
                  className="bg-primary/80 text-primary-foreground text-[0.65rem] sm:text-xs px-1.5 py-0.5 shadow-sm"
                >
                  <Star className="w-2.5 h-2.5 mr-0.5 sm:mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Play button as a separate Link, shown on hover/focus */}
        <div 
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
        >
            <Link
                href={`/play/${anime.id}?episode=${firstEpisodeId}`}
                onClick={(e) => {
                    e.stopPropagation(); // Prevent outer Link (to details page) from firing
                    // No router.push needed here, Link handles navigation
                }}
                aria-label={`Play ${anime.title}`}
                className="p-2 rounded-full hover:bg-black/30 focus:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 text-primary filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-300" />
            </Link>
        </div>
      </Card>
    </Link>
  );
}
