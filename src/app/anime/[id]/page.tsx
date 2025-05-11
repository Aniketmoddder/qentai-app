import { getAnimeById } from '@/services/animeService';
import type { Anime, Episode } from '@/types/anime';
import Container from '@/components/layout/container';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, PlayCircle, CalendarDays, Tv, Film, ListVideo, List, ChevronRight, AlertTriangle, Users } from 'lucide-react';
import Link from 'next/link';
import AnimeInteractionControls from '@/components/anime/anime-interaction-controls';
import CharacterCarousel from '@/components/anime/CharacterCarousel'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 

interface AnimeDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function AnimeDetailsPage({ params }: AnimeDetailsPageProps) {
  let anime: Anime | undefined;
  let fetchError: string | null = null;

  try {
    // getAnimeById now fetches merged TMDB + AniList data if aniListId is present
    anime = await getAnimeById(params.id); 
  } catch (error) {
    console.error(`Failed to fetch anime details for ID ${params.id}:`, error);
    if (error instanceof Error && error.message.includes("index")) {
         fetchError = `Could not load anime details. A required database index might be missing or the data source is unavailable. Details: ${error.message}`;
    } else {
        fetchError = "Could not load anime details. Please try again later.";
    }
  }

  if (fetchError) {
    return (
      <Container className="py-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Error Loading Anime</h1>
        <p className="text-muted-foreground">{fetchError}</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/">Go back to Home</Link>
        </Button>
      </Container>
    );
  }
  
  if (!anime) {
    return (
      <Container className="py-12 text-center">
        <h1 className="text-2xl font-bold text-destructive">Anime Not Found</h1>
        <p className="text-muted-foreground">Sorry, we couldn&apos;t find details for this anime (ID: {params.id}). It might have been removed or the ID is incorrect.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/">Go back to Home</Link>
        </Button>
      </Container>
    );
  }

  const iconMap: Record<NonNullable<Anime['type']>, JSX.Element> = {
    TV: <Tv className="w-4 h-4 mr-1.5" />,
    Movie: <Film className="w-4 h-4 mr-1.5" />,
    OVA: <ListVideo className="w-4 h-4 mr-1.5" />,
    Special: <ListVideo className="w-4 h-4 mr-1.5" />,
    Unknown: <ListVideo className="w-4 h-4 mr-1.5" />, 
  };
  
  // Prioritize AniList images if available, fallback to TMDB/placeholders
  const primaryImageSrc = anime.bannerImage || `https://picsum.photos/seed/${anime.id}-banner/1200/600`;
  const coverImageSrc = anime.coverImage || `https://picsum.photos/seed/${anime.id}-cover/400/600`;


  return (
    <div className="min-h-screen">
      <section className="relative h-[40vh] md:h-[50vh] w-full -mt-[calc(var(--header-height,4rem)+1px)]">
        <Image
          src={primaryImageSrc}
          alt={`${anime.title} banner`}
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-50"
          priority
          data-ai-hint="anime landscape action"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </section>

      <Container className="relative z-10 -mt-32 md:-mt-48 pb-12">
        <div className="md:flex md:space-x-8">
          <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
            <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={coverImageSrc}
                alt={anime.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover object-top" 
                data-ai-hint={`${anime.genre[0] || 'anime'} portrait`}
              />
            </div>
            <div className="mt-4 space-y-2">
              <Button asChild size="lg" className="w-full btn-primary-gradient">
                <Link href={`/play/${anime.id}${anime.episodes && anime.episodes.length > 0 ? `?episode=${anime.episodes[0].id}` : ''}`}>
                  <PlayCircle className="mr-2" /> Watch Now
                </Link>
              </Button>
              <AnimeInteractionControls anime={anime} />
            </div>
          </div>

          <div className="mt-8 md:mt-0 md:w-2/3 lg:w-3/4 text-foreground">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 font-zen-dots">{anime.title}</h1>
            
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
              <h2 className="text-xl font-semibold mb-2 text-primary font-orbitron">Genres</h2>
              <div className="flex flex-wrap gap-2">
                {anime.genre.map((g) => (
                  <Badge key={g} variant="outline" className="text-sm">{g}</Badge>
                ))}
              </div>
            </div>

            <Tabs defaultValue="synopsis" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 mb-4 bg-card border border-border/30 rounded-lg shadow-sm">
                <TabsTrigger value="synopsis" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md">Synopsis</TabsTrigger>
                <TabsTrigger value="episodes" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md">Episodes</TabsTrigger>
                <TabsTrigger value="characters" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md">Characters</TabsTrigger>
              </TabsList>
              
              <TabsContent value="synopsis">
                <div className="p-1 bg-card/30 rounded-lg">
                  <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                    {anime.synopsis}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="episodes">
                <div className="bg-card/60 p-4 sm:p-5 rounded-lg border border-border/20 shadow-inner">
                  <h3 className="text-xl font-semibold mb-3 text-foreground flex items-center font-orbitron">
                    <List className="mr-2"/> Episodes ({anime.episodes?.length || 0})
                  </h3>
                  {(!anime.episodes || anime.episodes.length === 0) ? (
                     <p className="text-muted-foreground text-center py-4">No episodes listed for this title yet.</p>
                  ) : (
                    <>
                    <div className="max-h-96 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
                      {anime.episodes.map((episode: Episode) => (
                        <Button
                          key={episode.id}
                          asChild
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-primary/10 rounded-md"
                        >
                          <Link href={`/play/${anime.id}?episode=${episode.id}`}>
                            <div className="flex items-center justify-between w-full">
                                <div className="flex-grow">
                                    <span className="text-sm font-medium text-foreground block">
                                    Ep {episode.episodeNumber}: {episode.title}
                                    </span>
                                    {episode.duration && <span className="text-xs text-muted-foreground">{episode.duration}</span>}
                                </div>
                                <PlayCircle className="w-5 h-5 text-primary ml-2 flex-shrink-0" />
                            </div>
                          </Link>
                        </Button>
                      ))}
                    </div>
                    <Button asChild variant="link" className="mt-3 px-0 text-sm">
                      <Link href={`/play/${anime.id}${anime.episodes && anime.episodes.length > 0 ? `?episode=${anime.episodes[0].id}` : ''}`}>
                        Go to Player <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="characters">
                 <div className="bg-card/60 p-1 sm:p-2 rounded-lg border border-border/20 shadow-inner">
                     <h3 className="text-xl font-semibold mb-1 mt-2 ml-2 text-foreground flex items-center font-orbitron">
                        <Users className="mr-2"/> Characters & Voice Actors
                    </h3>
                    <CharacterCarousel characters={anime.characters} />
                 </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Container>
    </div>
  );
}