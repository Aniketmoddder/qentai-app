// src/components/anime/anime-card.tsx
import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Card } from '@/components/ui/card';
import { PlayCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const firstEpisodeId = anime.episodes?.[0]?.id || '';

  return (
    <div 
      className="group relative w-[45vw] max-w-[180px] h-[270px] rounded-lg" // cursor-pointer removed as Links handle it
    >
      {/* Card visuals (Image and Text) - acts as background for links */}
      <Card
        tabIndex={-1} // Not focusable itself, Links will be
        className="w-full h-full overflow-hidden bg-card border-border shadow-lg group-hover:shadow-primary/40 transition-all duration-300 flex flex-col rounded-lg"
        data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
      >
        <div className="relative flex-grow w-full">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 20vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent group-hover:via-black/40 transition-all duration-300" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-2.5 text-white z-[5]"> {/* z-index to ensure text is above image gradient */}
          <h3
            className="text-sm sm:text-base font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200"
            title={anime.title}
          >
            {anime.title}
          </h3>
          <div className="mt-1 flex justify-between items-center text-xs text-muted-foreground/90 group-hover:text-muted-foreground">
            <span className="truncate">{anime.year}</span>
            {anime.averageRating !== undefined && (
              <Badge
                variant="default"
                className="bg-primary/80 text-primary-foreground text-[0.65rem] sm:text-xs px-1.5 py-0.5 shadow-sm"
              >
                <Star className="w-2.5 h-2.5 mr-0.5 sm:mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Clickable overlay Link for details page (covers the entire card, below play button) */}
      <Link
        href={`/anime/${anime.id}`} 
        className="absolute inset-0 z-10 cursor-pointer" 
        aria-label={`View details for ${anime.title}`}
      >
        <span className="sr-only">View details for {anime.title}</span>
      </Link>
      
      {/* Play button and its Link - on top of everything else, only interactive on hover */}
      <div 
          className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-300 z-20"
      >
          <Link
              href={`/play/${anime.id}${firstEpisodeId ? `?episode=${firstEpisodeId}` : ''}`}
              aria-label={`Play ${anime.title}`}
              className="p-2 rounded-full hover:bg-black/50 focus:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              onClick={(e) => {
                  e.stopPropagation(); // Crucial to prevent the details link from firing
              }}
          >
              <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 text-primary filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-300" />
          </Link>
      </div>
    </div>
  );
}
