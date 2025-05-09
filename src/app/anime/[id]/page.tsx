import { mockAnimeData } from '@/lib/mock-data';
import type { Anime, Episode } from '@/types/anime';
import Container from '@/components/layout/container';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, PlayCircle, PlusCircle, Heart, CalendarDays, Tv, Film, ListVideo, List, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface AnimeDetailsPageProps {
  params: {
    id: string;
  };
}

async function getAnimeDetails(id: string): Promise<Anime | undefined> {
  return mockAnimeData.find((anime) => anime.id === id);
}

export default async function AnimeDetailsPage({ params }: AnimeDetailsPageProps) {
  const anime = await getAnimeDetails(params.id);

  if (!anime) {
    return (
      <Container className="py-12 text-center">
        <h1 className="text-2xl font-bold text-destructive">Anime Not Found</h1>
        <p className="text-muted-foreground">Sorry, we couldn&apos;t find details for this anime.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/">Go back to Home</Link>
        </Button>
      </Container>
    );
  }

  const iconMap = {
    TV: <Tv className="w-4 h-4 mr-1.5" />,
    Movie: <Film className="w-4 h-4 mr-1.5" />,
    OVA: <ListVideo className="w-4 h-4 mr-1.5" />,
    Special: <ListVideo className="w-4 h-4 mr-1.5" />,
  };

  return (
    <div className="min-h-screen">
      <section className="relative h-[40vh] md:h-[50vh] w-full -mt-[calc(var(--header-height,4rem)+1px)]">
        <Image
          src={anime.bannerImage || `https://picsum.photos/seed/${anime.id}-banner/1200/600`}
          alt={`${anime.title} banner`}
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-50"
          priority
          data-ai-hint="anime landscape action"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </section>

      <Container className="relative z-10 -mt-24 md:-mt-32 pb-12">
        <div className="md:flex md:space-x-8">
          <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
            <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={anime.coverImage}
                alt={anime.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
                style={{ objectFit: 'cover' }}
                data-ai-hint={`${anime.genre[0] || 'anime'} portrait`}
              />
            </div>
            <div className="mt-4 space-y-2">
              <Button asChild size="lg" className="w-full btn-primary-gradient">
                <Link href={`/play/${anime.id}`}>
                  <PlayCircle className="mr-2" /> Watch Now
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full">
                <PlusCircle className="mr-2" /> Add to Watchlist
              </Button>
              <Button variant="outline" size="lg" className="w-full">
                <Heart className="mr-2" /> Add to Favorites
              </Button>
            </div>
          </div>

          <div className="mt-8 md:mt-0 md:w-2/3 lg:w-3/4 text-foreground">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">{anime.title}</h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
              <div className="flex items-center">
                {anime.type && iconMap[anime.type]}
                <span>{anime.type || 'N/A'}</span>
              </div>
              <div className="flex items-center">
                <CalendarDays className="w-4 h-4 mr-1.5" />
                <span>{anime.year}</span>
              </div>
              {anime.averageRating && (
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-1.5 text-yellow-400 fill-yellow-400" />
                  <span>{anime.averageRating.toFixed(1)}</span>
                </div>
              )}
              <Badge variant={anime.status === 'Completed' ? 'default' : 'secondary'} className={anime.status === 'Completed' ? 'bg-primary/80' : ''}>
                {anime.status}
              </Badge>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-primary">Genres</h2>
              <div className="flex flex-wrap gap-2">
                {anime.genre.map((g) => (
                  <Badge key={g} variant="outline" className="text-sm">{g}</Badge>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-primary">Synopsis</h2>
              <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                {anime.synopsis}
              </p>
            </div>
            
            {anime.episodes && anime.episodes.length > 0 && (
              <div className="mt-8 p-4 sm:p-6 bg-card rounded-lg">
                <h2 className="text-2xl font-semibold mb-4 text-primary flex items-center">
                  <List className="mr-2"/> Episodes
                </h2>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                  {anime.episodes.map((episode: Episode) => (
                    <Button
                      key={episode.id}
                      asChild
                      variant="ghost"
                      className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-primary/10"
                    >
                      <Link href={`/play/${anime.id}?episode=${episode.id}`}>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex-grow">
                                <span className="text-sm font-medium text-foreground block">
                                Episode {episode.episodeNumber}: {episode.title}
                                </span>
                                {episode.duration && <span className="text-xs text-muted-foreground">{episode.duration}</span>}
                            </div>
                            <PlayCircle className="w-5 h-5 text-primary ml-2 flex-shrink-0" />
                        </div>
                      </Link>
                    </Button>
                  ))}
                </div>
                 <Button asChild variant="link" className="mt-4 px-0">
                  <Link href={`/play/${anime.id}`}>
                    Go to Player Page <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
