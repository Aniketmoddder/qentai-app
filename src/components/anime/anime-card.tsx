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
      <Link href={`/anime/${anime.id}`} className="block relative aspect-[2/3] overflow-hidden rounded-t-lg"> {/* Changed aspect ratio to 2/3 for more common poster look */}
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
          <PlayCircle className="w-16 h-16 text-primary opacity-80 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all duration-300" />
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
      <CardHeader className="p-3 sm:p-4 flex-grow">
        <Link href={`/anime/${anime.id}`} className="hover:text-primary transition-colors">
          <CardTitle className="text-sm sm:text-base font-semibold leading-tight line-clamp-2" title={anime.title}> {/* Allow two lines for title */}
            {anime.title}
          </CardTitle>
        </Link>
        <div className="text-xs text-muted-foreground mt-1 space-x-1.5"> {/* Increased spacing slightly */}
          <span>{anime.year}</span>
          <span>&bull;</span>
          <span className="truncate">{anime.genre.slice(0,2).join(', ')}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
         <p className="text-xs text-muted-foreground line-clamp-3">{anime.synopsis}</p> {/* Increased line clamp for synopsis */}
      </CardContent>
      <CardFooter className="p-3 sm:p-4 pt-0 flex justify-between items-center mt-auto"> {/* Added mt-auto to push footer to bottom */}
        <Button asChild variant="default" size="sm" className="flex-1 mr-1 btn-primary-gradient text-xs sm:text-sm">
          <Link href={`/play/${anime.id}`}> {/* Updated link to player page */}
            <PlayCircle className="mr-1.5 h-4 w-4" /> Watch
          </Link>
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary w-7 h-7 sm:w-8 sm:h-8">
                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sr-only">Add to Watchlist</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add to Watchlist</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
         <TooltipProvider>
           <Tooltip>
             <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive w-7 h-7 sm:w-8 sm:h-8">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="sr-only">Add to Favorites</span>
                </Button>
             </TooltipTrigger>
             <TooltipContent>
               <p>Add to Favorites</p>
             </TooltipContent>
           </Tooltip>
         </TooltipProvider>
      </CardFooter>
    </Card>
  );
}

// Need to import TooltipProvider and TooltipContent if not already (likely from @/components/ui/tooltip)
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
