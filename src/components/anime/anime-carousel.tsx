'use client';

import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AnimeCarouselProps {
  title: string;
  animeList: Anime[];
}

export default function AnimeCarousel({ title, animeList }: AnimeCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const checkScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const tolerance = 5; // Small tolerance for floating point inaccuracies
      setIsAtStart(scrollLeft <= tolerance);
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - tolerance);
    }
  }, []);
  

  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    if (currentRef) {
      if (animeList && animeList.length > 0) {
        currentRef.scrollLeft = 0; // Reset scroll to start when list changes or on initial load
      }
      checkScrollPosition(); // Check initial position after potential scroll reset

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
  }, [checkScrollPosition, animeList]);


  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Scroll by a percentage of the container's width, e.g., 70-80%
      const scrollAmount = container.clientWidth * 0.8; 

      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      // Re-check position after a short delay to allow scroll animation to progress
      setTimeout(checkScrollPosition, 350); 
    }
  };


  if (!animeList || animeList.length === 0) {
    return null;
  }

  // Determine if scroll buttons should be visible at all
  const showScrollButtons = scrollContainerRef.current ? scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth : true;


  return (
    <section className="py-6 md:py-8 relative group/carousel">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground section-title-bar">{title}</h2>
        {/* Desktop scroll buttons - initially hidden, appear on group hover */}
         {showScrollButtons && (
            <div className="hidden md:flex items-center space-x-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300">
            <Button
                variant="default"
                size="icon"
                onClick={() => scroll('left')}
                disabled={isAtStart}
                className="rounded-full w-9 h-9 bg-black/30 hover:bg-black/50 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Scroll left"
            >
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
                variant="default"
                size="icon"
                onClick={() => scroll('right')}
                disabled={isAtEnd}
                className="rounded-full w-9 h-9 bg-black/30 hover:bg-black/50 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Scroll right"
            >
                <ChevronRight className="h-5 w-5" />
            </Button>
            </div>
        )}
      </div>
      <div 
        ref={scrollContainerRef} 
        className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 md:gap-x-5 scrollbar-hide" // md:gap-x-5 for slightly more space on medium screens
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {animeList.map((anime, index) => (
          <div 
            key={anime.id + '-' + index} // Ensure unique key if animeList can have duplicates temp
            className="flex-shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <AnimeCard anime={anime} />
          </div>
        ))}
      </div>
      {/* Mobile scroll buttons (always visible if scrollable) */}
      {showScrollButtons && (
        <div className="md:hidden flex justify-center mt-4 space-x-3">
            <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('left')}
                disabled={isAtStart}
                className="rounded-full w-9 h-9 bg-card/70 border-border/50 hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                aria-label="Scroll left"
            >
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('right')}
                disabled={isAtEnd}
                className="rounded-full w-9 h-9 bg-card/70 border-border/50 hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                aria-label="Scroll right"
            >
                <ChevronRight className="h-5 w-5" />
            </Button>
            </div>
      )}
    </section>
  );
}
