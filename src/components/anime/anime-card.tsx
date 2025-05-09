"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Anime } from '@/types/anime';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const router = useRouter();
  const firstEpisodeId = anime.episodes?.[0]?.id || '';

  // Handler for the play button
  const handlePlayClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // IMPORTANT: Prevents the outer Link (to details page) from firing
    e.preventDefault(); // Also prevent default, just in case
    router.push(`/play/${anime.id}?episode=${firstEpisodeId}`);
  };

  return (
    // Outer Link: Navigates to the anime details page
    <Link
      href={`/anime/${anime.id}`}
      className="group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg w-full"
      aria-label={`View details for ${anime.title}`}
    >
      <Card
        tabIndex={-1} // Card itself is not focusable, the Link is
        className="relative w-full aspect-[2/3] overflow-hidden bg-card border-border shadow-lg group-hover:shadow-primary/40 group-focus-visible:shadow-primary/40 transition-all duration-300 flex flex-col rounded-lg"
        data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
      >
        {/* Image and overlay */}
        <div className="absolute inset-0">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 20vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:via-black/50 transition-all duration-300 pointer-events-none" />
        </div>

        {/* Content: Title and Year/Rating, at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-2.5 sm:p-3 text-white flex flex-col justify-end h-full">
          <div className="mt-auto">
            <h3
              className="text-sm sm:text-base font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200"
              title={anime.title}
            >
              {anime.title}
            </h3>
            <div className="mt-1 flex justify-between items-center text-xs text-muted-foreground/90 group-hover:text-muted-foreground">
              <span className="truncate">{anime.year}</span>
              {anime.averageRating && (
                <Badge
                  variant="default"
                  className="bg-primary/80 text-primary-foreground text-[0.65rem] sm:text-xs px-1.5 py-0.5 shadow-sm"
                >
                  <Star className="w-2.5 h-2.5 mr-0.5 sm:mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Centered Play Button/Icon on Hover */}
        {/* This div wrapper helps in positioning the button */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
          // Add a pointer-events-none here IF the button itself should be the only clickable area in this overlay.
          // However, the button itself has pointer-events: auto by default.
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayClick} // This button click navigates to player page
            aria-label={`Play ${anime.title}`}
            // Ensure button is only as large as the icon and doesn't fill its container invisibly
            className="p-0 w-auto h-auto rounded-full hover:bg-transparent focus:bg-transparent text-primary" 
          >
            <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-300" />
          </Button>
        </div>
      </Card>
    </Link>
  );
}