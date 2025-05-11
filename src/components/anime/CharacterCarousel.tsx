
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
      const tolerance = 5;
      setIsAtStart(scrollLeft <= tolerance);
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - tolerance);
    }
  }, []);

  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    if (currentRef && isClient) {
      checkScrollability();
      
      currentRef.addEventListener('scroll', checkScrollPosition, { passive: true });
      window.addEventListener('resize', checkScrollability); // Check scrollability on resize
      
      const observer = new ResizeObserver(checkScrollability); // Observe for content changes
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
      const scrollAmount = container.clientWidth * 0.7; 
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollPosition, 350); 
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
      {canScroll && (
        <>
          <Button
            variant="default"
            size="icon"
            onClick={() => scroll('left')}
            disabled={isAtStart}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-1/2",
              "rounded-full w-10 h-10 md:w-12 md:h-12",
              "bg-background/70 hover:bg-primary/90 text-foreground hover:text-primary-foreground border border-border shadow-lg",
              "opacity-0 group-hover/carousel:opacity-100 transition-all duration-300",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "hidden md:flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={() => scroll('right')}
            disabled={isAtEnd}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-1/2",
              "rounded-full w-10 h-10 md:w-12 md:h-12",
              "bg-background/70 hover:bg-primary/90 text-foreground hover:text-primary-foreground border border-border shadow-lg",
              "opacity-0 group-hover/carousel:opacity-100 transition-all duration-300",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "hidden md:flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
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

      {/* Mobile scroll buttons */}
      {canScroll && (
        <div className="md:hidden flex justify-center mt-4 space-x-3">
          <Button variant="outline" size="icon" onClick={() => scroll('left')} disabled={isAtStart} className="rounded-full w-9 h-9 shadow-md bg-card/80 border-border/50 hover:bg-primary/20 hover:text-primary disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></Button>
          <Button variant="outline" size="icon" onClick={() => scroll('right')} disabled={isAtEnd} className="rounded-full w-9 h-9 shadow-md bg-card/80 border-border/50 hover:bg-primary/20 hover:text-primary disabled:opacity-40"><ChevronRight className="h-5 w-5" /></Button>
        </div>
      )}
    </div>
  );
}

