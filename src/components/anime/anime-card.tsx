
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Card } from '@/components/ui/card'; // Using Card for structure and potential bg
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
  className?: string;
}

export default function AnimeCard({ anime, className }: AnimeCardProps) {
  // Example metadata, replace with actual data if available in Anime type
  const metadata = {
    hd: true,
    sub: true,
    episodes: anime.episodes?.length || 0,
    totalEpisodes: anime.status === 'Completed' ? anime.episodes?.length : undefined, // Or a fixed number if known for ongoing
  };

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={`group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg ${className}`}
      aria-label={`View details for ${anime.title}`}
    >
      <Card
        tabIndex={-1} // Card itself is not focusable, Link handles focus
        className="relative w-[45vw] max-w-[180px] h-[270px] sm:w-[30vw] sm:max-w-[200px] sm:h-[300px] md:w-[18vw] md:max-w-[220px] md:h-[330px] 
                   overflow-hidden bg-card border-transparent shadow-lg group-hover:shadow-primary/30 
                   transition-all duration-300 flex flex-col rounded-lg"
      >
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 18vw, 220px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false} 
            data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait`}
          />
          {/* Gradient overlay for text readability at the bottom */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
        </div>

        {/* Rating Badge Top Left */}
        {anime.averageRating !== undefined && (
          <Badge
            variant="default"
            className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground text-xs px-1.5 py-0.5 shadow-md"
            aria-label={`Rating: ${anime.averageRating.toFixed(1)} out of 10`}
          >
            <Star className="w-3 h-3 mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
          </Badge>
        )}

        {/* Content Overlay Bottom */}
        <div className="relative z-10 mt-auto p-2.5 sm:p-3 w-full">
          <h3
            className="text-sm sm:text-base font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200"
            title={anime.title}
          >
            {anime.title}
          </h3>
          <div className="mt-1 flex items-center space-x-1.5 text-[0.65rem] sm:text-xs text-muted-foreground/90 group-hover:text-muted-foreground">
            {metadata.hd && <span className="bg-black/40 text-foreground/80 px-1 py-0.5 rounded-sm text-[0.6rem]">HD</span>}
            {metadata.sub && <span className="bg-black/40 text-foreground/80 px-1 py-0.5 rounded-sm text-[0.6rem]">SUB</span>}
            {/* Example for episodes */}
            {anime.episodes && anime.episodes.length > 0 && (
              <span className="bg-black/40 text-foreground/80 px-1 py-0.5 rounded-sm text-[0.6rem]">
                EP {anime.episodes.length}{metadata.totalEpisodes ? `/${metadata.totalEpisodes}` : ''}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
