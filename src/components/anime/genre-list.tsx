
// src/components/anime/genre-list.tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getUniqueGenres } from '@/services/animeService';
import { Tag } from 'lucide-react';

export default async function GenreList() {
  const genres = await getUniqueGenres();

  if (!genres || genres.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-8">
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-5 section-title-bar flex items-center">
         <Tag className="w-6 h-6 mr-2 text-primary" /> Explore by Genre
      </h2>
      <div className="flex flex-wrap gap-2 md:gap-3">
        {genres.map((genre) => (
          <Link key={genre} href={`/browse?genre=${encodeURIComponent(genre)}`} passHref legacyBehavior>
            <Badge
              as="a" // Make badge behave like an anchor
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
