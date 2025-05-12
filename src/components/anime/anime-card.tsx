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
        className
      )}
      aria-label={`View details for ${anime.title}`}
    >
      <div className={cn(
        "flex flex-col h-full bg-card border border-border/20 rounded-lg overflow-hidden shadow-md hover:shadow-primary/20 transition-shadow duration-300",
        "w-[45vw] max-w-[150px] sm:max-w-[160px] md:max-w-[170px] lg:max-w-[180px] xl:max-w-[190px]", // Adjusted sizes
        "aspect-[2/3]"
       )}
      >
        <div className="relative w-full flex-grow"> {/* Use flex-grow for image to take available space */}
          <Image
            src={anime.coverImage || placeholderCover}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 40vw, (max-width: 768px) 160px, 190px"
            className="object-cover"
            priority={false} // Consider priority for LCP elements only
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
                className="p-2 focus:outline-none" // Removed rounded-full and hover/focus backgrounds
            >
                <PlayCircle className="w-10 h-10 text-white/90 drop-shadow-lg" />
            </Link>
          </div>
        </div>
        <div className="p-2 text-center bg-card mt-auto"> {/* Ensure text is at the bottom */}
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
