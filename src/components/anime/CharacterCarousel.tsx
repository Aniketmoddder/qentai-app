// src/components/anime/CharacterCarousel.tsx
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
      const scrollable = scrollWidth > clientWidth;
      setCanScroll(scrollable);
      if (scrollable) {
        checkScrollPosition();
      } else {
        setIsAtStart(true);
        setIsAtEnd(true);
      }
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
      // Adjusted scroll amount for character carousel
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
        <div className="py-6 text-center text-muted-foreground mt-3 sm:mt-4">
            <Users size={32} className="mx-auto mb-2 opacity-50 animate-pulse" />
            <p>Loading characters...</p>
        </div>
    );
  }

  if (!characters || characters.length === 0) {
    return (
        <div className="py-6 text-center text-muted-foreground mt-3 sm:mt-4">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>No character information available for this title yet.</p>
        </div>
    );
  }


  return (
    <div className="relative group/carousel py-4 mt-3 sm:mt-4">
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 scrollbar-hide px-1" 
        style={{ 
            scrollSnapType: 'x mandatory', 
            scrollBehavior: 'smooth' // Ensure CSS smooth scrolling for touch
        }}
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

      {canScroll && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            disabled={isAtStart}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-0 md:-translate-x-1/2", // Adjusted for edge placement
              "w-9 h-9 sm:w-10 sm:h-10 p-0 rounded-full", 
              "bg-background/50 hover:bg-primary/80 text-foreground hover:text-primary-foreground shadow-md",
              "opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300",
              isAtStart && "opacity-0 pointer-events-none",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "flex items-center justify-center"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            disabled={isAtEnd}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-0 md:translate-x-1/2", // Adjusted for edge placement
              "w-9 h-9 sm:w-10 sm:h-10 p-0 rounded-full",
              "bg-background/50 hover:bg-primary/80 text-foreground hover:text-primary-foreground shadow-md",
              "opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300",
              isAtEnd && "opacity-0 pointer-events-none",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "flex items-center justify-center"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </>
      )}
    </div>
  );
}

interface CharacterTypeProps {
  character: CharacterType;
}