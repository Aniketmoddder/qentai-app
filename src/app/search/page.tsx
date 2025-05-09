'use client';

import { useSearchParams } from 'next/navigation';
import Container from '@/components/layout/container';
import { mockAnimeData } from '@/lib/mock-data';
import AnimeCard from '@/components/anime/anime-card';
import type { Anime } from '@/types/anime';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query) {
      setLoading(true);
      // Simulate API call or filtering
      const results = mockAnimeData.filter(anime =>
        anime.title.toLowerCase().includes(query.toLowerCase()) ||
        anime.genre.some(g => g.toLowerCase().includes(query.toLowerCase()))
      );
      setSearchResults(results);
      setLoading(false);
    } else {
      setSearchResults([]);
      setLoading(false);
    }
  }, [query]);

  if (loading) {
    return (
      <Container className="py-12 text-center">
        <p className="text-muted-foreground">Searching...</p>
      </Container>
    );
  }

  return (
    <Container className="py-8 min-h-[calc(100vh-var(--header-height,4rem)-var(--footer-height,0px)-1px)]"> {/* Adjust min-height based on header/footer */}
      <h1 className="text-3xl font-bold mb-6 text-foreground">
        {query ? `Search Results for "${query}"` : 'Search'}
      </h1>

      {!query && (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-lg">
            Please enter a search term in the search bar above.
          </p>
        </div>
      )}

      {query && searchResults.length === 0 && !loading && (
        <div className="text-center py-10 bg-card p-8 rounded-lg shadow-md">
          <AlertCircle className="mx-auto h-12 w-12 text-primary mb-4" />
          <p className="text-xl font-semibold text-foreground mb-2">No Results Found</p>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t find any anime matching your search for &quot;{query}&quot;.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Go Back to Home</Link>
          </Button>
        </div>
      )}

      {query && searchResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {searchResults.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </Container>
  );
}
