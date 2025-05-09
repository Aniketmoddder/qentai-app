import Image from 'next/image';
import Link from 'next/link';
import type { Anime } from '@/types/anime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, PlayCircle, PlusCircle, Heart } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  return (
    <Card className="group w-full overflow-hidden bg-card border-border shadow-lg hover:shadow-primary/30 transition-shadow duration-300 flex flex-col h-full">
      <Link href={`/anime/${anime.id}`} className="block relative aspect-[2/3] overflow-hidden">
        <Image
          src={anime.coverImage}
          alt={anime.title}
          width={300}
          height={450}
          data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300 ease-in-out"
          priority={anime.id <= '3'} // Prioritize loading for first few cards
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <PlayCircle className="w-16 h-16 text-primary opacity-80 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all duration-300" />
        </div>
        {anime.averageRating && (
          <Badge
            variant="default"
            className="absolute top-2 right-2 bg-primary text-primary-foreground"
          >
            <Star className="w-3 h-3 mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
          </Badge>
        )}
        {anime.type && (
           <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
            {anime.type}
          </Badge>
        )}
      </Link>
      <CardHeader className="p-3 flex-grow">
        <Link href={`/anime/${anime.id}`} className="hover:text-primary transition-colors">
          <CardTitle className="text-base font-semibold leading-tight truncate" title={anime.title}>
            {anime.title}
          </CardTitle>
        </Link>
        <div className="text-xs text-muted-foreground mt-1 space-x-1">
          <span>{anime.year}</span>
          <span>&bull;</span>
          <span className="truncate">{anime.genre.slice(0,2).join(', ')}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
         <p className="text-xs text-muted-foreground line-clamp-2">{anime.synopsis}</p>
      </CardContent>
      <CardFooter className="p-3 pt-0 flex justify-between items-center">
        <Button asChild variant="default" size="sm" className="flex-1 mr-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground">
          <Link href={`/anime/${anime.id}`}>
            <PlayCircle className="mr-1.5" /> Watch
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <PlusCircle className="w-5 h-5" />
          <span className="sr-only">Add to Watchlist</span>
        </Button>
         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
          <Heart className="w-5 h-5" />
          <span className="sr-only">Add to Favorites</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
