import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, PlayCircle } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  return (
    <Card className="group w-full overflow-hidden bg-card border-border shadow-lg hover:shadow-primary/30 transition-shadow duration-300 flex flex-col h-full rounded-lg">
      <Link href={`/anime/${anime.id}`} className="block relative aspect-[2/3] overflow-hidden rounded-t-lg">
        <Image
          src={anime.coverImage}
          alt={anime.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 15vw"
          data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
          className="object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
          priority={anime.id <= '3'} // Prioritize loading for first few cards
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <PlayCircle className="w-12 h-12 sm:w-14 sm:h-14 text-primary opacity-80 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all duration-300" />
        </div>
        {anime.averageRating && (
          <Badge
            variant="default"
            className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 z-10"
          >
            <Star className="w-3 h-3 mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
          </Badge>
        )}
        {anime.type && (
           <Badge variant="secondary" className="absolute top-2 left-2 text-xs px-1.5 py-0.5 z-10">
            {anime.type}
          </Badge>
        )}
      </Link>
      <CardHeader className="p-2 sm:p-3 flex-grow">
        <Link href={`/anime/${anime.id}`} className="hover:text-primary transition-colors">
          <CardTitle className="text-xs sm:text-sm font-semibold leading-tight line-clamp-2" title={anime.title}>
            {anime.title}
          </CardTitle>
        </Link>
        <div className="text-xs text-muted-foreground mt-1 space-x-1">
          <span>{anime.year}</span>
          <span>&bull;</span>
          <span className="truncate">{anime.genre.slice(0,1).join(', ')}</span> {/* Show only first genre for brevity */}
        </div>
      </CardHeader>
      <CardFooter className="p-2 sm:p-3 pt-0 mt-auto"> {/* Removed CardContent and Button from here, simplified footer */}
        <Button asChild variant="default" size="sm" className="w-full btn-primary-gradient text-xs sm:text-sm">
          <Link href={`/play/${anime.id}`}>
            <PlayCircle className="mr-1.5 h-4 w-4" /> Watch
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
