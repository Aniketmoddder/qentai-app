
"use client";

import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';

interface AnimeCarouselProps {
  title: string;
  animeList: Anime[];
}

export default function AnimeCarousel({ title, animeList }: AnimeCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  // Card width is now managed by AnimeCard's responsive classes, no need to calculate here

  const checkScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const tolerance = 10; // Increased tolerance
      setIsAtStart(scrollLeft <= tolerance);
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - tolerance);
    }
  }, []);
  

  useEffect(() => {
    checkScrollPosition();
    const currentRef = scrollContainerRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', checkScrollPosition, { passive: true });
      window.addEventListener('resize', checkScrollPosition);
      
      const observer = new MutationObserver(checkScrollPosition);
      observer.observe(currentRef, { childList: true, subtree: true, attributes: true });

      return () => {
        currentRef.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
        observer.disconnect();
      };
    }
  }, [checkScrollPosition, animeList]); // Added animeList to dependencies to re-check on list change


  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Approximate scroll amount - 80% of visible width, or at least one card width if possible.
      // This assumes cards are roughly similar in width for a smooth scroll.
      const scrollAmount = container.clientWidth * 0.8; 

      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      // Timeout helps ensure scroll position is updated after smooth scroll finishes
      setTimeout(checkScrollPosition, 400); 
    }
  };


  if (!animeList || animeList.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-8 relative group">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
        <div className="hidden md:flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            disabled={isAtStart}
            className="rounded-full bg-card/70 hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            disabled={isAtEnd}
            className="rounded-full bg-card/70 hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
      <div 
        ref={scrollContainerRef} 
        className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 md:gap-5 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {animeList.map((anime) => (
          <div 
            key={anime.id} 
            className="flex-shrink-0" // Removed w-auto to let AnimeCard control its width via its classes
            style={{ scrollSnapAlign: 'start' }}
          >
            <AnimeCard anime={anime} />
          </div>
        ))}
      </div>
      {/* Mobile scroll buttons */}
      <div className="md:hidden flex justify-center mt-4 space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            disabled={isAtStart}
            className="rounded-full bg-card/70 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            disabled={isAtEnd}
            className="rounded-full bg-card/70 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
    </section>
  );
}

