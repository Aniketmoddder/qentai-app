
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
  const getEpisodeBadgeText = () => {
    if (anime.type === 'Movie') {
      return 'Movie';
    }
    // Use episodesCount if available and greater than 0, otherwise fallback to episodes array length
    const count = anime.episodesCount && anime.episodesCount > 0 
                  ? anime.episodesCount 
                  : (anime.episodes && anime.episodes.length > 0 ? anime.episodes.length : 0);
    
    if (count > 0) {
      return `Ep ${count}`;
    }
    return null; // No badge if not a movie and no episode count
  };

  const episodeBadgeText = getEpisodeBadgeText();
  const placeholderCover = `https://picsum.photos/seed/${anime.id}/300/450`;

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
      <div className="flex flex-col h-full">
        {/* Image Container */}
        <div className="relative w-full aspect-[2/3] overflow-hidden rounded-md shadow-lg hover:shadow-primary/30 transition-shadow duration-300 bg-card">
          <Image
            src={anime.coverImage || placeholderCover}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 200px, 220px"
            className="object-cover"
            priority={false} 
            data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait poster`}
          />
          {episodeBadgeText && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <Badge
                variant="secondary"
                className="bg-black/60 text-white text-[0.6rem] px-2 py-0.5 border-transparent font-bold backdrop-blur-sm"
              >
                {episodeBadgeText}
              </Badge>
            </div>
          )}
        </div>

        {/* Text Content Area - Below the image */}
        <div className="mt-2 flex items-center">
          <span className="inline-block flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
          <p
            className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200 truncate"
            title={anime.title}
          >
            {anime.title}
          </p>
        </div>
      </div>
    </Link>
  );
}
