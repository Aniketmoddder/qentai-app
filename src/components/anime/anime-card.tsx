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
    <Card
      tabIndex={-1} 
      className="group relative w-[45vw] max-w-[180px] h-[270px] overflow-hidden bg-card border-border shadow-lg hover:shadow-primary/40 focus-visible:shadow-primary/40 transition-all duration-300 flex flex-col rounded-lg"
      data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
    >
      {/* Clickable area for details (covers image and text) */}
      <Link
        href={`/anime/${anime.id}`}
        className="absolute inset-0 z-10" // z-10 to be above visuals but below play button
        aria-label={`View details for ${anime.title}`}
      >
        <span className="sr-only">View details for {anime.title}</span>
      </Link>

      {/* Visuals: Image and overlay */}
      <div className="absolute inset-0 pointer-events-none"> {/* pointer-events-none so details link can be clicked */}
        <Image
          src={anime.coverImage}
          alt={anime.title}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 20vw, 180px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={false} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent group-hover:via-black/40 transition-all duration-300" />
      </div>

      {/* Content: Title and Year/Rating, at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-2 sm:p-2.5 text-white flex flex-col justify-end h-full pointer-events-none"> {/* z-20 to be above image/overlay, pointer-events-none for details link */}
        <div className="mt-auto"> 
          <h3
            className="text-sm sm:text-base font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200"
            title={anime.title}
          >
            {anime.title}
          </h3>
          <div className="mt-1 flex justify-between items-center text-xs text-muted-foreground/90 group-hover:text-muted-foreground">
            <span className="truncate">{anime.year}</span>
            {anime.averageRating !== undefined && ( 
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
      
      {/* Play button Link - positioned on top */}
      <div 
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-30" // z-30 for highest priority
      >
          <Link
              href={`/play/${anime.id}?episode=${firstEpisodeId}`}
              aria-label={`Play ${anime.title}`}
              className="p-2 rounded-full hover:bg-black/30 focus:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
              <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 text-primary filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-300" />
          </Link>
      </div>
    </Card>
  );
}
