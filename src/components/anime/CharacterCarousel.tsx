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

const MAX_CHARACTERS_TO_SHOW = 15;

export default function CharacterCarousel({ characters }: CharacterCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const checkScrollabilityAndPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const scrollable = scrollWidth > clientWidth;
      setCanScroll(scrollable);

      if (scrollable) {
        const tolerance = 5; 
        setIsAtStart(scrollLeft <= tolerance);
        setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - tolerance);
      } else {
        setIsAtStart(true);
        setIsAtEnd(true);
      }
    }
  }, []);


  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    if (currentRef && isClient) {
      checkScrollabilityAndPosition();
      
      currentRef.addEventListener('scroll', checkScrollabilityAndPosition, { passive: true });
      window.addEventListener('resize', checkScrollabilityAndPosition);
      
      const observer = new ResizeObserver(checkScrollabilityAndPosition);
      observer.observe(currentRef);

      return () => {
        currentRef.removeEventListener('scroll', checkScrollabilityAndPosition);
        window.removeEventListener('resize', checkScrollabilityAndPosition);
        observer.disconnect();
      };
    }
  }, [checkScrollabilityAndPosition, characters, isClient]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.7; 
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollabilityAndPosition, 350); 
    }
  };

  const displayedCharacters = characters ? characters.slice(0, MAX_CHARACTERS_TO_SHOW) : [];

  if (!isClient) { 
    return (
        <div className="py-6 text-center text-muted-foreground mt-3 sm:mt-4">
            <Users size={32} className="mx-auto mb-2 opacity-50 animate-pulse" />
            <p>Loading characters...</p>
        </div>
    );
  }

  if (displayedCharacters.length === 0) {
    return (
        <div className="py-6 text-center text-muted-foreground mt-3 sm:mt-4">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>No character information available for this title yet.</p>
        </div>
    );
  }


  return (
    <div className="relative py-4 mt-3 sm:mt-4"> {/* Removed group/carousel */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 scrollbar-hide px-1" 
        style={{ 
            scrollSnapType: 'x mandatory', 
            scrollBehavior: 'smooth'
        }}
      >
        {displayedCharacters.map((character) => (
          <div
            key={character.id}
            className="flex-shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <CharacterCard character={character} />
          </div>
        ))}
      </div>

      {canScroll && !isAtStart && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-0 md:-translate-x-1/2",
              "w-9 h-16 sm:w-10 sm:h-20 p-0 rounded-none", // Sharp edges, adjusted height
              "bg-black/20 text-white", // Bold white icon, subtle background
              "opacity-100", // Always visible
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
              "flex items-center justify-center"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </Button>
      )}

      {canScroll && !isAtEnd && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-0 md:translate-x-1/2",
              "w-9 h-16 sm:w-10 sm:h-20 p-0 rounded-none", // Sharp edges, adjusted height
              "bg-black/20 text-white", // Bold white icon, subtle background
              "opacity-100", // Always visible
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
              "flex items-center justify-center"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </Button>
      )}
       <p className="text-xs text-muted-foreground mt-2 text-center md:text-left">
        Note: This carousel uses native browser smooth scrolling. For advanced effects, consider libraries like Framer Motion.
      </p>
    </div>
  );
}
