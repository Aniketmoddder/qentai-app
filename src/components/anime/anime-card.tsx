// src/components/anime/anime-card.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimeCardProps {
  anime: Anime;
  className?: string;
}

export default function AnimeCard({ anime, className }: AnimeCardProps) {
  const router = useRouter();
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

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Allow play button to handle its own navigation
    if ((e.target as HTMLElement).closest('button[aria-label^="Play"]')) {
      return;
    }
    router.push(`/anime/${anime.id}`);
  };
  
  const handlePlayButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Important: Prevent event from bubbling to the card's onClick
    router.push(`/play/${anime.id}?episode=${firstEpisodeId}`);
  };


  return (
    <div
      className={cn(
        "group flex flex-col cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg overflow-hidden",
        "w-[110px] sm:w-[120px] md:w-[130px] lg:w-[140px] xl:w-[150px]", // Adjusted sizes
        "bg-card border border-border/20 shadow-md hover:shadow-primary/20 transition-shadow duration-300",
        className
      )}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(e as any);}}
      role="link" // Make it behave like a link for accessibility
      tabIndex={0} // Make it focusable
      aria-label={`View details for ${anime.title}`}
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
          className="object-cover transition-transform duration-300 group-hover:scale-105"
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
        {/* Centered Play Icon on Hover */}
        <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
        >
            <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayButtonClick} 
                aria-label={`Play ${anime.title}`}
                className="p-0 rounded-full hover:bg-transparent focus:bg-transparent focus:outline-none text-white/90 drop-shadow-lg w-12 h-12 bg-black/30 hover:bg-black/50" 
                // Added background for better visibility of the icon itself on hover
            >
                <PlayCircle className="w-10 h-10" /> 
            </Button>
        </div>
      </div>
      <div className="p-2 text-center mt-auto"> {/* mt-auto pushes title to bottom if card has extra space */}
        <p
          className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200 truncate"
          title={anime.title}
        >
          {anime.title}
        </p>
      </div>
    </div>
  );
}
