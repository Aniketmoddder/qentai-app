// src/components/anime/anime-card.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link'; // Outer link
import { useRouter } from 'next/navigation'; // For programmatic navigation
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // For the play button
import { PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimeCardProps {
  anime: Anime;
  className?: string;
}

export default function AnimeCard({ anime, className }: AnimeCardProps) {
  const router = useRouter(); // Initialize router
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

  const handlePlayClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent the outer Link's navigation
    router.push(`/play/${anime.id}?episode=${firstEpisodeId}`);
  };

  return (
    <Link // Outer Link for the whole card
      href={`/anime/${anime.id}`}
      className={cn(
        "group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg",
        className
      )}
      aria-label={`View details for ${anime.title}`}
    >
      <div className="flex flex-col h-full bg-card border border-border/20 rounded-lg overflow-hidden shadow-md hover:shadow-primary/20 transition-shadow duration-300">
        <div
          className={cn(
            "relative w-full aspect-[2/3]", // Fixed aspect ratio
            "sm:w-[150px] sm:h-[225px]", // Example explicit size for sm breakpoint
            "md:w-[160px] md:h-[240px]", // Example explicit size for md breakpoint
            "lg:w-[170px] lg:h-[255px]", // Example explicit size for lg breakpoint
             "xl:w-[180px] xl:h-[270px]", // Example explicit size for lg breakpoint
            "bg-muted overflow-hidden rounded-t-lg group-hover:opacity-80 transition-opacity" // Added hover effect
          )}
          data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait poster`}
        >
          <Image
            src={anime.coverImage || placeholderCover}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 40vw, (max-width: 768px) 160px, 190px"
            className="object-cover"
            priority={false}
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
          {/* Centered Play Button on Hover */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
          >
            {/* Changed from Link to Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayClick}
                aria-label={`Play ${anime.title}`}
                className="p-2 rounded-full hover:bg-black/30 focus:bg-black/40 focus:outline-none text-white/90 drop-shadow-lg w-14 h-14" // Made button larger
            >
                <PlayCircle className="w-12 h-12" /> 
            </Button>
          </div>
        </div>
        <div className="p-2 text-center mt-auto">
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
