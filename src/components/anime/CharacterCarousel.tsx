'use client';

import type { Character } from '@/types/anime';
import CharacterCard from './CharacterCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CharacterCarouselProps {
  characters?: Character[];
}

export default function CharacterCarousel({ characters }: CharacterCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const checkScrollability = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScroll(scrollWidth > clientWidth);
      checkScrollPosition();
    }
  }, []);


  const checkScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const tolerance = 5; // Small tolerance for scroll position checks
      setIsAtStart(scrollLeft <= tolerance);
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - tolerance);
    }
  }, []);

  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    if (currentRef && isClient) {
      checkScrollability();
      
      currentRef.addEventListener('scroll', checkScrollPosition, { passive: true });
      window.addEventListener('resize', checkScrollability);
      
      const observer = new ResizeObserver(checkScrollability);
      observer.observe(currentRef);

      return () => {
        currentRef.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollability);
        observer.disconnect();
      };
    }
  }, [checkScrollPosition, characters, isClient, checkScrollability]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.75; // Scroll by 75% of visible width
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      // Debounce or use a timer to re-check scroll position after scroll animation
      setTimeout(checkScrollPosition, 350); // Adjust timeout as needed
    }
  };

  if (!isClient) { 
    return (
        <div className="py-6 text-center text-muted-foreground">
            <Users size={32} className="mx-auto mb-2 opacity-50 animate-pulse" />
            <p>Loading characters...</p>
        </div>
    );
  }

  if (!characters || characters.length === 0) {
    return (
        <div className="py-6 text-center text-muted-foreground">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>No character information available for this title yet.</p>
        </div>
    );
  }


  return (
    <div className="relative group/carousel py-4">
      {/* Left Gradient Shadow & Button Area */}
      {canScroll && !isAtStart && (
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-20 md:w-24 z-10 bg-gradient-to-r from-card/80 via-card/50 to-transparent pointer-events-none flex items-center justify-start opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            disabled={isAtStart}
            className={cn(
              "rounded-full w-10 h-10 md:w-12 md:h-12 pointer-events-auto",
              "bg-background/50 hover:bg-primary/70 text-foreground hover:text-primary-foreground shadow-lg",
              "disabled:opacity-0 disabled:cursor-not-allowed",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ml-1 sm:ml-2"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Right Gradient Shadow & Button Area */}
      {canScroll && !isAtEnd && (
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-20 md:w-24 z-10 bg-gradient-to-l from-card/80 via-card/50 to-transparent pointer-events-none flex items-center justify-end opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            disabled={isAtEnd}
            className={cn(
              "rounded-full w-10 h-10 md:w-12 md:h-12 pointer-events-auto",
              "bg-background/50 hover:bg-primary/70 text-foreground hover:text-primary-foreground shadow-lg",
              "disabled:opacity-0 disabled:cursor-not-allowed",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background mr-1 sm:mr-2"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 scrollbar-hide px-1" // Added small horizontal padding
        style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }}
      >
        {characters.map((character) => (
          <div
            key={character.id}
            className="flex-shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <CharacterCard character={character} />
          </div>
        ))}
      </div>

      {/* Mobile scroll buttons (simplified if needed or rely on touch scroll) */}
      {canScroll && (
        <div className="md:hidden flex justify-center mt-3 space-x-3">
          <Button variant="outline" size="icon" onClick={() => scroll('left')} disabled={isAtStart} className="rounded-full w-9 h-9 shadow-md bg-card/80 border-border/50 hover:bg-primary/20 hover:text-primary disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></Button>
          <Button variant="outline" size="icon" onClick={() => scroll('right')} disabled={isAtEnd} className="rounded-full w-9 h-9 shadow-md bg-card/80 border-border/50 hover:bg-primary/20 hover:text-primary disabled:opacity-40"><ChevronRight className="h-5 w-5" /></Button>
        </div>
      )}
    </div>
  );
}
