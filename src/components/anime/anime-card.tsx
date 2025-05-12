// src/components/anime/anime-card.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnimeCardProps {
  anime: Anime;
  className?: string;
}

export default function AnimeCard({ anime, className }: AnimeCardProps) {
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
        "group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg overflow-hidden",
        "w-[110px] sm:w-[120px] md:w-[130px] lg:w-[140px] xl:w-[150px]", // Adjusted sizes
        className
      )}
      aria-label={`View details for ${anime.title}`}
    >
      <div
        className={cn(
          "flex flex-col h-full", // Ensure the inner div takes full height for flex alignment
          "bg-card border border-border/20 shadow-md group-hover:shadow-primary/30 transition-all duration-300 ease-in-out rounded-lg overflow-hidden",
          "group-hover:scale-105 group-hover:border-primary/50 transform" // Added scale and border hover animation
        )}
      >
        <div
          className={cn(
            "relative w-full aspect-[2/3]",
            "bg-muted overflow-hidden rounded-t-lg"
          )}
          data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait poster`}
        >
          <Image
            src={anime.coverImage || placeholderCover}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 110px, (max-width: 768px) 120px, (max-width: 1024px) 130px, (max-width: 1280px) 140px, 150px"
            className="object-cover transition-transform duration-300" // Removed group-hover:scale-105 as it's on the parent now
            priority={false}
          />
          {episodeBadgeText && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <Badge
                variant="secondary"
                className="bg-black/70 text-white text-[0.6rem] px-1.5 py-0.5 border-transparent font-semibold backdrop-blur-sm"
              >
                {episodeBadgeText}
              </Badge>
            </div>
          )}
          {/* Removed Play Icon Link and its wrapper */}
        </div>
        <div className="p-2 text-center mt-auto"> {/* mt-auto pushes title to bottom */}
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
