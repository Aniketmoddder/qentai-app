"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Star, PlayCircle } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const firstEpisodeId = anime.episodes?.[0]?.id || '';

  return (
    <Card
      className="group relative w-[45vw] max-w-[180px] h-[270px] overflow-hidden bg-card border-border shadow-lg hover:shadow-primary/40 focus-within:shadow-primary/40 transition-all duration-300 flex flex-col rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
    >
      {/* Link for details page - covers most of the card, behind play button */}
      <Link
        href={`/anime/${anime.id}`}
        aria-label={`View details for ${anime.title}`}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">View details for {anime.title}</span>
      </Link>

      {/* Image container */}
      <div className="relative w-full h-full flex-grow"> {/* Use flex-grow to fill space */}
        <Image
          src={anime.coverImage}
          alt={anime.title}
          fill
          sizes="(max-width: 640px) 45vw, 180px"
          className="object-cover transition-transform duration-300 group-hover:scale-105 rounded-t-lg" /* Rounded top to match card if image is full bleed */
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:from-black/95 group-hover:via-black/75 transition-all duration-300 rounded-t-lg" />
      </div>

      {/* Content at the bottom, absolutely positioned within the Card */}
      {/* This div is a sibling to the detail link, and below the play link in z-index */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-8">
        <div className="flex justify-between items-start mb-1">
          {anime.averageRating && (
            <Badge
              variant="default"
              className="bg-primary/90 text-primary-foreground text-xs px-1.5 py-0.5 shadow-md"
            >
              <Star className="w-3 h-3 mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
            </Badge>
          )}
          {anime.type && (
             <Badge variant="secondary" className="text-xs px-1.5 py-0.5 shadow-md bg-card/70 text-card-foreground">
              {anime.type}
            </Badge>
          )}
        </div>
        <h3
            className="text-sm font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200"
            title={anime.title}
        >
            {anime.title}
        </h3>
        <div className="text-xs text-muted-foreground/90 group-hover:text-muted-foreground mt-0.5 space-x-1">
            <span>{anime.year}</span>
            <span>&bull;</span>
            <span className="truncate">{anime.genre.slice(0,1).join(', ')}</span>
        </div>
      </div>
      
      {/* Centered Play Icon on Hover - links to player page. This Link is a sibling to the details Link. */}
      <Link
          href={`/play/${anime.id}?episode=${firstEpisodeId}`}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the details link
            // router.push(...) can be used here if Link causes issues with event handling
          }}
          aria-label={`Play ${anime.title}`}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-30" // Higher z-index
      >
          <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 text-primary filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-300" />
      </Link>
    </Card>
  );
}
