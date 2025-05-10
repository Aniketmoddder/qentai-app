'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import type { Anime } from '@/types/anime';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimeCardProps {
  anime: Anime;
  className?: string;
}

export default function AnimeCard({ anime, className }: AnimeCardProps) {
  const router = useRouter(); // Initialize router
  const firstEpisodeId = anime.episodes?.[0]?.id || '';

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={cn(
        "group block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg",
        className
      )}
      aria-label={`View details for ${anime.title}`}
    >
      <Card
        tabIndex={-1}
        className="relative w-[45vw] max-w-[180px] h-[270px] sm:w-[30vw] sm:max-w-[200px] sm:h-[300px] md:w-[18vw] md:max-w-[220px] md:h-[330px]
                   overflow-hidden bg-card border-transparent shadow-lg group-hover:shadow-primary/30
                   transition-all duration-300 flex flex-col rounded-lg"
      >
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 18vw, 220px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false}
            data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait`}
          />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:from-black/80"></div>
        </div>

        {anime.averageRating !== undefined && (
          <Badge
            variant="default"
            className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground text-xs px-1.5 py-0.5 shadow-md"
            aria-label={`Rating: ${anime.averageRating.toFixed(1)} out of 10`}
          >
            <Star className="w-3 h-3 mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
          </Badge>
        )}

        {/* Centered Play Icon on Hover - now a button for programmatic navigation */}
        <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
        >
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent outer Link (to details page) from firing
                    e.preventDefault(); // Prevent default action of the outer link
                    router.push(`/play/${anime.id}${firstEpisodeId ? `?episode=${firstEpisodeId}` : ''}`);
                }}
                aria-label={`Play ${anime.title}`}
                className="p-2 rounded-full hover:bg-black/40 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-primary"
            >
                <PlayCircle className="w-10 h-10 text-white/90 group-hover:text-primary transition-colors" />
            </button>
        </div>


        <div className="relative z-10 mt-auto p-2.5 sm:p-3 w-full">
          <h3
            className="text-sm sm:text-base font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200"
            title={anime.title}
          >
            {anime.title}
          </h3>
          <div className="mt-1 flex items-center space-x-1.5 text-[0.65rem] sm:text-xs text-muted-foreground/90 group-hover:text-muted-foreground">
            {anime.type && <span className="bg-black/40 text-foreground/80 px-1 py-0.5 rounded-sm text-[0.6rem]">{anime.type}</span>}
            {anime.episodes && anime.episodes.length > 0 && (
              <span className="bg-black/40 text-foreground/80 px-1 py-0.5 rounded-sm text-[0.6rem]">
                EP {anime.episodes.length}{anime.status === 'Ongoing' ? '+' : ''}
              </span>
            )}
             <span className="bg-black/40 text-foreground/80 px-1 py-0.5 rounded-sm text-[0.6rem]">{anime.year}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
