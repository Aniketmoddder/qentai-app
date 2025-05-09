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
    <Card className="group w-full overflow-hidden bg-card border-border shadow-lg hover:shadow-primary/30 transition-shadow duration-300 flex flex-col h-full rounded-lg">
      <Link href={`/anime/${anime.id}`} className="block relative aspect-[3/4] overflow-hidden rounded-t-lg">
        <Image
          src={anime.coverImage}
          alt={anime.title}
          width={300} // Base width for aspect ratio hint
          height={400} // Base height for aspect ratio (300 * 4/3)
          data-ai-hint={`${anime.genre[0] || 'anime'} cover`}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300 ease-in-out"
          priority={anime.id <= '3'} // Prioritize loading for first few cards
          fill={false} // Explicitly false if width/height are for fixed size, but className w-full h-full overrides
                       // If using Next.js 13+ `fill` prop is preferred over layout="fill"
                       // For older versions, layout="fill" would be used.
                       // Given the classNames, `fill` should ideally be true or `layout="fill"` used.
                       // However, with width/height + w-full/h-full, it acts like fill.
                       // To be explicit and modern:
                       // fill // uncomment this and remove width/height if using Next 13+ fill prop for responsive images
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <PlayCircle className="w-16 h-16 text-primary opacity-80 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all duration-300" />
        </div>
        {anime.averageRating && (
          <Badge
            variant="default"
            className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5"
          >
            <Star className="w-3 h-3 mr-1 fill-current" /> {anime.averageRating.toFixed(1)}
          </Badge>
        )}
        {anime.type && (
           <Badge variant="secondary" className="absolute top-2 left-2 text-xs px-1.5 py-0.5">
            {anime.type}
          </Badge>
        )}
      </Link>
      <CardHeader className="p-3 sm:p-4 flex-grow">
        <Link href={`/anime/${anime.id}`} className="hover:text-primary transition-colors">
          <CardTitle className="text-sm sm:text-base font-semibold leading-tight truncate" title={anime.title}>
            {anime.title}
          </CardTitle>
        </Link>
        <div className="text-xs text-muted-foreground mt-1 space-x-1">
          <span>{anime.year}</span>
          <span>&bull;</span>
          <span className="truncate">{anime.genre.slice(0,2).join(', ')}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
         <p className="text-xs text-muted-foreground line-clamp-2">{anime.synopsis}</p>
      </CardContent>
      <CardFooter className="p-3 sm:p-4 pt-0 flex justify-between items-center">
        <Button asChild variant="default" size="sm" className="flex-1 mr-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs sm:text-sm">
          <Link href={`/anime/${anime.id}`}>
            <PlayCircle className="mr-1.5 h-4 w-4" /> Watch
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary w-7 h-7 sm:w-8 sm:h-8">
          <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="sr-only">Add to Watchlist</span>
        </Button>
         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive w-7 h-7 sm:w-8 sm:h-8">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="sr-only">Add to Favorites</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
