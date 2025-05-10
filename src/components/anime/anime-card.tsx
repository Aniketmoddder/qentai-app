// src/components/anime/anime-card.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Anime } from '@/types/anime';
import { Card } from '@/components/ui/card';
import { PlayCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const router = useRouter();
  const firstEpisodeId = anime.episodes?.[0]?.id || '';

  const handleCardClick = () => {
    router.push(`/anime/${anime.id}`);
  };

  const handlePlayClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation(); // Prevent card click event from firing
    // Navigation is handled by the Link component's href
  };
  
  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/anime/${anime.id}`);
    }
  };

  return (
    <div
      className="group relative w-[45vw] max-w-[180px] h-[270px] rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`View details for ${anime.title}`}
    >
      <Card
        tabIndex={-1} 
        className="w-full h-full overflow-hidden bg-card border-border shadow-lg group-hover:shadow-primary/40 transition-all duration-300 flex flex-col rounded-lg pointer-events-none"
        data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
      >
        <div className="relative flex-grow w-full">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 20vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false} // Generally false for carousel items
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:from-black/80 group-hover:via-black/50 transition-all duration-300" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 text-white z-[5] w-full">
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
      </Card>
      
      {/* Play button overlay - positioned on top */}
      <div
          className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-300 z-20"
      >
          <Link
              href={`/play/${anime.id}${firstEpisodeId ? `?episode=${firstEpisodeId}` : ''}`}
              aria-label={`Play ${anime.title}`}
              className="p-2 rounded-full hover:bg-black/50 focus:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              onClick={handlePlayClick} 
          >
              <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 text-primary filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-300" />
          </Link>
      </div>
    </div>
  );
}