
// src/components/anime/TopAnimeListItem.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { Tv, Film, ListVideo, CheckCircle, Clock, TrendingUp } from 'lucide-react'; // Using CheckCircle for status, Clock for ongoing

interface TopAnimeListItemProps {
  anime: Anime;
  rank: number;
}

export default function TopAnimeListItem({ anime, rank }: TopAnimeListItemProps) {
  const rankColors = [
    'bg-pink-500/80', // Rank 1
    'bg-orange-500/80', // Rank 2
    'bg-green-500/80', // Rank 3
    'bg-purple-500/70', // Rank 4
    'bg-blue-500/70', // Rank 5
  ];
  const rankColor = rankColors[rank - 1] || 'bg-muted/50'; // Default for ranks > 5

  const typeIcon = () => {
    switch (anime.type) {
      case 'TV': return <Tv className="w-3 h-3" />;
      case 'Movie': return <Film className="w-3 h-3" />;
      case 'OVA':
      case 'Special': return <ListVideo className="w-3 h-3" />;
      default: return <Tv className="w-3 h-3" />;
    }
  };
  
  const statusIcon = () => {
    switch(anime.status) {
        case 'Completed': return <CheckCircle className="w-3 h-3 text-green-400"/>;
        case 'Ongoing': return <Clock className="w-3 h-3 text-sky-400"/>;
        case 'Upcoming': return <TrendingUp className="w-3 h-3 text-amber-400"/>;
        default: return null;
    }
  }

  return (
    <Link href={`/anime/${anime.id}`} passHref legacyBehavior>
      <a className="group flex items-center p-3 bg-card hover:bg-card/70 rounded-lg shadow-sm transition-all duration-200 ease-in-out">
        <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-md ${rankColor} text-primary-foreground flex items-center justify-center text-lg md:text-xl font-bold mr-3 md:mr-4 shadow-md`}>
          {rank}
        </div>
        <div className="flex-shrink-0 w-16 h-24 md:w-20 md:h-[120px] relative rounded-md overflow-hidden border border-border/20">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="(max-width: 768px) 64px, 80px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={`${anime.genre?.[0] || 'anime'} portrait`}
          />
        </div>
        <div className="flex-grow ml-3 md:ml-4 min-w-0">
          <h3 className="text-sm md:text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate" title={anime.title}>
            {anime.title}
          </h3>
          {/* Alternate title or studio could go here if available */}
          {/* <p className="text-xs text-muted-foreground truncate">Alternate Title / Studio</p> */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">{typeIcon()} {anime.type || 'N/A'}</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">{statusIcon()} {anime.status}</span>
            {anime.episodes && anime.episodes.length > 0 && (
                <>
                    <span className="hidden sm:inline">•</span>
                    <span>{anime.episodes.length} Ep</span>
                </>
            )}
          </div>
           <div className="mt-1.5 flex flex-wrap gap-1">
            {anime.genre.slice(0, 2).map(g => (
              <Badge key={g} variant="outline" className="text-[0.65rem] px-1.5 py-0.5 border-border/50 text-muted-foreground group-hover:border-primary/30 group-hover:text-primary/80">
                {g}
              </Badge>
            ))}
          </div>
        </div>
        <div className="ml-auto text-right flex-shrink-0 hidden sm:block">
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary font-medium">
            {anime.averageRating ? `SCORE ${anime.averageRating.toFixed(1)}` : 'N/A'}
          </Badge>
           {/* Sub/Dub info could go here */}
          {/* <p className="text-xs text-muted-foreground mt-1">Sub | Dub</p> */}
        </div>
      </a>
    </Link>
  );
}
