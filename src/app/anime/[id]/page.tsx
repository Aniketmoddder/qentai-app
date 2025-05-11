import { getAnimeById } from '@/services/animeService';
import type { Anime, Episode } from '@/types/anime';
import Container from '@/components/layout/container';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, PlayCircle, CalendarDays, Tv, Film, ListVideo, List, ChevronRight, AlertTriangle, Users, ShieldCheck, Info } from 'lucide-react';
import Link from 'next/link';
import AnimeInteractionControls from '@/components/anime/anime-interaction-controls';
import CharacterCarousel from '@/components/anime/CharacterCarousel'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { cn } from '@/lib/utils';

interface AnimeDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function AnimeDetailsPage({ params }: AnimeDetailsPageProps) {
  let anime: Anime | undefined;
  let fetchError: string | null = null;

  try {
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
        <AlertTriangle className="mx-auto h-12 w-12 text-muted mb-4" />
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
    Unknown: <Info className="w-4 h-4 mr-1.5" />, 
  };
  
  const primaryImageSrc = anime.bannerImage || `https://picsum.photos/seed/${anime.id}-banner/1600/600`;
  const coverImageSrc = anime.coverImage || `https://picsum.photos/seed/${anime.id}-cover/400/600`;
  const firstEpisodeId = anime.episodes?.[0]?.id || '';


  return (
    <div className="min-h-screen text-foreground">
      {/* Banner Section */}
      <section 
        className="relative h-[45vh] md:h-[55vh] lg:h-[60vh] w-full -mt-[calc(var(--header-height,4rem)+1px)] bg-card"
      >
        <Image
          src={primaryImageSrc}
          alt={`${anime.title} banner`}
          fill
          className="object-cover opacity-40"
          priority
          data-ai-hint="anime landscape epic"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent md:hidden" />
      </section>

      {/* Content Section */}
      <Container className="relative z-10 -mt-24 md:-mt-32 lg:-mt-48 pb-16">
        <div className="md:grid md:grid-cols-12 md:gap-8">
          {/* Left Column: Cover Image & Actions */}
          <div className="md:col-span-4 lg:col-span-3">
            <div className="sticky top-[calc(var(--header-height,4rem)+1.5rem)]">
              <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl border-2 border-border/20 bg-card">
                <Image
                  src={coverImageSrc}
                  alt={anime.title}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover" 
                  data-ai-hint={`${anime.genre[0] || 'anime'} portrait`}
                />
              </div>
              <div className="mt-5 space-y-2.5">
                <Button asChild size="lg" className="w-full btn-primary-gradient font-semibold text-base py-3">
                  <Link href={`/play/${anime.id}${firstEpisodeId ? `?episode=${firstEpisodeId}` : ''}`}>
                    <PlayCircle className="mr-2 h-5 w-5" /> Watch Now
                  </Link>
                </Button>
                <AnimeInteractionControls anime={anime} />
              </div>
            </div>
          </div>

          {/* Right Column: Details & Tabs */}
          <div className="md:col-span-8 lg:col-span-9 mt-8 md:mt-0">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 font-zen-dots leading-tight">
              {anime.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-sm text-muted-foreground mb-5">
              {anime.type && <div className="flex items-center">{iconMap[anime.type]} <span className="font-medium">{anime.type}</span></div>}
              {anime.type && <span className="opacity-50">•</span>}
              <div className="flex items-center"><CalendarDays className="w-4 h-4 mr-1.5" /> <span className="font-medium">{anime.year}</span></div>
              {anime.averageRating !== undefined && (
                <>
                  <span className="opacity-50">•</span>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1.5 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-foreground">{anime.averageRating.toFixed(1)}</span>
                    <span className="text-xs ml-0.5">/10</span>
                  </div>
                </>
              )}
              <span className="opacity-50">•</span>
              <Badge 
                variant={anime.status === 'Completed' ? 'default' : 'secondary'} 
                className={cn(
                  "text-xs font-medium",
                  anime.status === 'Completed' && 'bg-green-500/20 text-green-600 border-green-500/30 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/40',
                  anime.status === 'Ongoing' && 'bg-sky-500/20 text-sky-600 border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/40',
                  anime.status === 'Upcoming' && 'bg-amber-500/20 text-amber-600 border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/40',
                )}
              >
                {anime.status === 'Completed' && <ShieldCheck className="w-3 h-3 mr-1" />}
                {anime.status}
              </Badge>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2 text-primary font-orbitron">Genres</h2>
              <div className="flex flex-wrap gap-2">
                {anime.genre.map((g) => (
                  <Badge key={g} variant="outline" className="text-xs sm:text-sm border-border/50 hover:bg-primary/10 hover:border-primary/40 transition-colors">
                    {g}
                  </Badge>
                ))}
                {anime.genre.length === 0 && <p className="text-sm text-muted-foreground">No genres listed.</p>}
              </div>
            </div>

            <Tabs defaultValue="synopsis" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-5 bg-card/80 border border-border/40 rounded-lg shadow-sm p-1">
                <TabsTrigger value="synopsis" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md text-sm font-medium py-2">Synopsis</TabsTrigger>
                <TabsTrigger value="episodes" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md text-sm font-medium py-2">Episodes</TabsTrigger>
                <TabsTrigger value="characters" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-md rounded-md text-sm font-medium py-2">Characters</TabsTrigger>
              </TabsList>
              
              <TabsContent value="synopsis" className="bg-card/50 p-4 sm:p-6 rounded-lg border border-border/20 shadow-inner">
                <h3 className="text-xl font-semibold mb-3 text-foreground font-orbitron">Synopsis</h3>
                <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line selection:bg-primary/20 selection:text-primary">
                  {anime.synopsis || "No synopsis available."}
                </p>
              </TabsContent>

              <TabsContent value="episodes" className="bg-card/50 p-4 sm:p-6 rounded-lg border border-border/20 shadow-inner">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-foreground flex items-center font-orbitron">
                      <List className="mr-2 h-5 w-5"/> Episodes ({anime.episodes?.length || 0})
                  </h3>
                  {anime.episodes && anime.episodes.length > 0 && (
                    <Button asChild variant="link" size="sm" className="text-primary hover:text-primary/80">
                      <Link href={`/play/${anime.id}${firstEpisodeId ? `?episode=${firstEpisodeId}` : ''}`}>
                        Go to Player <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>

                {(!anime.episodes || anime.episodes.length === 0) ? (
                     <p className="text-muted-foreground text-center py-6">No episodes listed for this title yet.</p>
                  ) : (
                    <ScrollArea className="max-h-96 pr-3 -mr-3">
                      <div className="space-y-2">
                        {anime.episodes.map((episode: Episode) => (
                          <Button
                            key={episode.id}
                            asChild
                            variant="ghost"
                            className="w-full justify-start text-left h-auto py-2.5 px-3.5 hover:bg-primary/10 rounded-md group/ep-item transition-colors"
                          >
                            <Link href={`/play/${anime.id}?episode=${episode.id}`}>
                              <div className="flex items-center justify-between w-full">
                                  <div className="flex-grow min-w-0">
                                      <span className="text-sm font-medium text-foreground block group-hover/ep-item:text-primary truncate" title={`Episode ${episode.episodeNumber}: ${episode.title}`}>
                                        Ep {episode.episodeNumber}: {episode.title}
                                      </span>
                                      {episode.duration && <span className="text-xs text-muted-foreground">{episode.duration}</span>}
                                  </div>
                                  <PlayCircle className="w-5 h-5 text-primary ml-2 flex-shrink-0 opacity-0 group-hover/ep-item:opacity-100 transition-opacity" />
                              </div>
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
              </TabsContent>

              <TabsContent value="characters" className="bg-card/50 p-1 sm:p-2 rounded-lg border border-border/20 shadow-inner">
                <h3 className="text-xl font-semibold mb-1 mt-3 ml-3 text-foreground flex items-center font-orbitron">
                    <Users className="mr-2 h-5 w-5"/> Characters & Voice Actors
                </h3>
                <CharacterCarousel characters={anime.characters} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Container>
    </div>
  );
}
