// src/components/anime/genre-list.tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getUniqueGenres } from '@/services/animeService';
import { Tag } from 'lucide-react';

// This component is a Server Component.
// It fetches data (getUniqueGenres) and renders content based on that.
export default async function GenreList() {
  let genres: string[] = [];
  let error: string | null = null;

  try {
    genres = await getUniqueGenres();
  } catch (e) {
    console.error("Failed to load genres for GenreList:", e);
    error = "Could not load genres at the moment.";
  }

  if (error) {
    return (
      <section className="py-6 md:py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-5 section-title-bar font-orbitron flex items-center">
           <Tag className="w-6 h-6 mr-2 text-primary" /> Explore by Genre
        </h2>
        <p className="text-destructive">{error}</p>
      </section>
    );
  }

  if (!genres || genres.length === 0) {
    // Optionally, render a placeholder or nothing if no genres are available
    // For now, let's return null if no genres to avoid rendering an empty section
    return null;
  }

  return (
    <section className="py-6 md:py-8">
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-5 section-title-bar font-orbitron flex items-center">
         <Tag className="w-6 h-6 mr-2 text-primary" /> Explore by Genre
      </h2>
      <div className="flex flex-wrap gap-2 md:gap-3">
        {genres.map((genre) => (
          <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} passHref legacyBehavior={false}>
            <Badge
              variant="outline"
              className="px-3 py-1.5 text-sm md:text-base font-medium cursor-pointer border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/70 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
            >
              {genre}
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
