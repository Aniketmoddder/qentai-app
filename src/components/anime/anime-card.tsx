// src/components/anime/anime-card.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { PlayCircle } from 'lucide-react';
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
  const placeholderCover = `https://picsum.photos/seed/${anime.id}/300/450`;
  const firstEpisodeId = anime.episodes?.[0]?.id || '';

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={cn(
        "group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg",
        "w-[45vw] max-w-[180px] sm:w-auto sm:max-w-[200px] md:max-w-[220px]", 
        className
      )}
      aria-label={`View details for ${anime.title}`}
    >
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-md shadow-lg hover:shadow-primary/30 transition-shadow duration-300 bg-card">
        <Image
          src={anime.coverImage || placeholderCover}
          alt={anime.title}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 768px) 200px, 220px"
          className="object-cover group-hover:scale-105 transition-transform duration-300" // Ensure image covers and has hover effect
          priority={false} 
          data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait poster`}
        />
        {episodeBadgeText && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <Badge
              variant="secondary"
              className="bg-black/70 text-white text-[0.6rem] px-2 py-0.5 border-transparent font-bold backdrop-blur-sm"
            >
              {episodeBadgeText}
            </Badge>
          </div>
        )}
        
        {/* Overlay for title and play icon, visible on hover/focus */}
        <div 
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 z-10"
        >
             {/* Play Icon - This Link now correctly wraps the play icon area */}
            <div 
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
            >
                <Link
                    href={`/play/${anime.id}?episode=${firstEpisodeId}`}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent outer Link (to details page) from firing
                    }}
                    aria-label={`Play ${anime.title}`}
                    className="p-2 rounded-full hover:bg-black/30 focus:bg-black/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary" // Added focus styling
                >
                    <PlayCircle className="w-10 h-10 text-white/90 group-hover:text-primary transition-colors" />
                </Link>
            </div>
            <p
              className="text-sm font-semibold text-white group-hover:text-primary transition-colors duration-200 truncate"
              title={anime.title}
            >
              {anime.title}
            </p>
        </div>
      </div>
    </Link>
  );
}