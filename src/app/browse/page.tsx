
// src/app/browse/page.tsx
import type { SuspenseProps } from 'react'; // Import SuspenseProps
import { Suspense } from 'react';
import Container from '@/components/layout/container';
import AnimeCard from '@/components/anime/anime-card';
import type { Anime } from '@/types/anime';
import { getAllAnimes } from '@/services/animeService';
import { AlertCircle, Loader2, ListFilter, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface BrowsePageProps {
  searchParams: {
    genre?: string;
    type?: Anime['type'];
    sort?: 'top' | string; // 'top' for averageRating, can extend
    filter?: 'featured' | string; // 'featured' for featured animes
    q?: string; // For search, handled by search page but can be integrated
  };
}

async function BrowseContent({ searchParams }: BrowsePageProps) {
  const { genre, type, sort, filter: queryFilter } = searchParams;
  let animeList: Anime[] = [];
  let pageTitle = 'Browse All Anime';
  let fetchError: string | null = null;

  try {
    const filters: Parameters<typeof getAllAnimes>[1] = {};
    if (type) {
      filters.type = type;
      pageTitle = type === 'Movie' ? 'Movies' : type === 'TV' ? 'TV Series' : `Browse ${type}`;
    }
    if (genre) {
      filters.genre = genre;
      pageTitle = `${genre} Anime`;
    }
    if (sort === 'top') {
      filters.sortBy = 'averageRating';
      filters.sortOrder = 'desc';
      pageTitle = 'Top Rated Anime';
    }
    if (queryFilter === 'featured') {
      filters.featured = true; // Assumes a boolean 'isFeatured' field in Firestore
      pageTitle = 'Featured Anime';
    }
    
    animeList = await getAllAnimes(50, filters); // Fetch up to 50 results

  } catch (error) {
    console.error("Failed to fetch animes for browse page:", error);
    fetchError = "Could not load anime data. Please try again later.";
    pageTitle = "Error Loading Anime";
  }

  return (
    <Container className="py-8 min-h-[calc(100vh-var(--header-height,4rem)-var(--footer-height,0px)-1px)]">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground section-title-bar">{pageTitle}</h1>
        {/* Placeholder for future filter controls */}
        {/* 
        <Button variant="outline">
          <ListFilter className="mr-2 h-4 w-4" /> Filters
        </Button>
        */}
      </div>

      {fetchError && (
        <div className="my-8 p-6 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center text-destructive">
          <AlertCircle className="h-6 w-6 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold">Error Loading Content</h3>
            <p className="text-sm">{fetchError}</p>
          </div>
        </div>
      )}

      {!fetchError && animeList.length === 0 && (
        <div className="text-center py-10 bg-card p-8 rounded-lg shadow-md">
          <FilterX className="mx-auto h-12 w-12 text-primary mb-4" />
          <p className="text-xl font-semibold text-foreground mb-2">No Anime Found</p>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t find any anime matching your criteria. Try a different filter or check back later!
          </p>
          <Button asChild variant="outline">
            <Link href="/">Go Back to Home</Link>
          </Button>
        </div>
      )}

      {!fetchError && animeList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-4 sm:gap-x-4 place-items-center sm:place-items-stretch">
          {animeList.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </Container>
  );
}

// Suspense Fallback Component
function LoadingFallback() {
  return (
    <Container className="flex items-center justify-center min-h-[calc(100vh-var(--header-height)-1px)]">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Loading anime...</p>
      </div>
    </Container>
  );
}


export default function BrowsePage(props: BrowsePageProps) {
  // The key forces Suspense to re-evaluate when searchParams change
  const key = JSON.stringify(props.searchParams);
  return (
    <Suspense key={key} fallback={<LoadingFallback />}>
      <BrowseContent {...props} />
    </Suspense>
  );
}

// If you need to force dynamic rendering (e.g. if searchParams isn't enough to bust cache)
// export const dynamic = 'force-dynamic';
