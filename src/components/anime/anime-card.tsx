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
  // Determine episode text for the badge
  const getEpisodeBadgeText = () => {
    if (anime.type === 'Movie') {
      return 'Movie';
    }
    if (anime.episodes && anime.episodes.length > 0) {
      // For TV/OVA, show latest episode number or total if completed
      // Using total length for simplicity as per screenshot's "Ep X" consistency
      return `Ep ${anime.episodes.length}`;
    }
    return null; // No badge if no episode info for series
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
      <div
        className={cn(
          "w-[45vw] max-w-[180px] sm:w-auto sm:max-w-[200px] md:max-w-[220px]", // Responsive width
          "bg-card rounded-lg shadow-lg hover:shadow-primary/30 transition-all duration-300 flex flex-col overflow-hidden"
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
            priority={false} // Set to true for LCP elements if applicable
            data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait poster`}
          />
          {episodeBadgeText && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <Badge
                variant="secondary" // Using secondary for a different look, can be customized
                className="bg-black/70 text-white text-[0.6rem] px-1.5 py-0.5 border-transparent font-semibold"
              >
                {episodeBadgeText}
              </Badge>
            </div>
          )}
        </div>

        {/* Text Content Area */}
        <div className="p-2.5">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 shrink-0"></span>
            <h3
              className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200 truncate"
              title={anime.title}
            >
              {anime.title}
            </h3>
          </div>
          {/* Optional: Small line for year or type below title if needed */}
          {/* <p className="text-xs text-muted-foreground mt-0.5 truncate">{anime.year} • {anime.type}</p> */}
        </div>
      </div>
    </Link>
  );
}
