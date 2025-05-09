
"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Only Card is used here effectively
import { Star, PlayCircle } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const firstEpisodeId = anime.episodes?.[0]?.id || '';

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg w-[45vw] max-w-[180px] sm:w-full sm:max-w-[200px] md:max-w-[220px]" // Responsive width
      aria-label={`View details for ${anime.title}`}
    >
      <Card
        tabIndex={-1} // The Link wrapper handles focus
        className="relative w-full h-auto aspect-[2/3] overflow-hidden bg-card border-border shadow-lg group-hover:shadow-primary/40 group-focus-visible:shadow-primary/40 transition-all duration-300 flex flex-col rounded-lg"
        data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
      >
        {/* Image container */}
        <div className="relative w-full h-full flex-grow">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 20vw, 180px" // Adjusted sizes
            className="object-cover transition-transform duration-300 group-hover:scale-105 rounded-t-lg"
            priority={false}
          />
          {/* Gradient overlay for text visibility at the bottom */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent rounded-b-lg pointer-events-none" />
        </div>

        {/* Content at the bottom, absolutely positioned within the Card */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-2.5 sm:p-3 text-white"> {/* Increased padding slightly */}
          <h3
            className="text-sm sm:text-base font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200"
            title={anime.title}
          >
            {anime.title}
          </h3>
          <div className="mt-1 flex justify-between items-center text-xs text-muted-foreground/90 group-hover:text-muted-foreground">
            <span className="truncate">{anime.year}</span>
            {anime.averageRating && (
              <Badge
                variant="default"
                className="bg-primary/80 text-primary-foreground text-[0.65rem] sm:text-xs px-1.5 py-0.5 shadow-sm"
              >
                <Star className="w-2.5 h-2.5 mr-0.5 sm:mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Centered Play Icon on Hover - links to player page. */}
        {/* This is an interactive element separate from the main card link */}
        <div 
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
        >
            <Link
                href={`/play/${anime.id}?episode=${firstEpisodeId}`}
                onClick={(e) => e.stopPropagation()} // Prevent Link in Link issue by stopping event propagation
                aria-label={`Play ${anime.title}`}
                className="p-2 rounded-full hover:bg-black/30 focus:bg-black/40 focus:outline-none" // Added focus styling for play button
            >
                <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 text-primary filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-300" />
            </Link>
        </div>
      </Card>
    </Link>
  );
}

