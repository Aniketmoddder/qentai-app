
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
  const getEpisodeBadgeText = () => {
    if (anime.type === 'Movie') {
      return 'Movie';
    }
    if (anime.episodes && anime.episodes.length > 0) {
      return `Ep ${anime.episodes.length}`;
    }
    return null;
  };

  const episodeBadgeText = getEpisodeBadgeText();

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={cn(
        "group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg",
        "w-[45vw] max-w-[180px] sm:w-auto sm:max-w-[200px] md:max-w-[220px]", // Responsive width
        className
      )}
      aria-label={`View details for ${anime.title}`}
    >
      <div
        className={cn(
          "bg-card rounded-lg shadow-lg hover:shadow-primary/30 transition-all duration-300 flex flex-col overflow-hidden h-full" 
        )}
      >
        {/* Image Container */}
        <div className="relative w-full aspect-[2/3] overflow-hidden">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 200px, 220px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false} 
            data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait poster`}
          />
          {episodeBadgeText && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <Badge
                variant="secondary" 
                className="bg-black/70 text-white text-[0.6rem] px-1.5 py-0.5 border-transparent font-semibold"
              >
                {episodeBadgeText}
              </Badge>
            </div>
          )}
          {/* Play Icon - visible on hover/focus, no longer a separate Link */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 bg-black/40 z-10">
            <PlayCircle className="w-12 h-12 text-white/90" />
          </div>
        </div>

        {/* Text Content Area - ensure it's at the bottom */}
        <div className="p-2.5 mt-auto"> {/* mt-auto pushes this to the bottom */}
          <h3
            className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200 truncate"
            title={anime.title}
          >
            {anime.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

