// src/components/anime/anime-carousel.tsx
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

const MAX_CARDS_TO_SHOW = 15;

export default function AnimeCarousel({ title, animeList }: AnimeCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [canScroll, setCanScroll] = useState(false);

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
      if (animeList && animeList.length > 0) {
        currentRef.scrollLeft = 0; 
      }
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
  }, [checkScrollabilityAndPosition, animeList, isClient]); 


  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * (window.innerWidth < 768 ? 0.85 : 0.7); 
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      // Re-check position after scroll animation might complete
      setTimeout(checkScrollabilityAndPosition, 350); 
    }
  };

  const displayedAnime = animeList.slice(0, MAX_CARDS_TO_SHOW);

  if (!displayedAnime || displayedAnime.length === 0) {
    return null; 
  }

  return (
    <section className="py-6 md:py-8 relative"> {/* Removed group/carousel as hover is not needed for arrows */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground section-title-bar">{title}</h2>
      </div>
      
      <div className="relative">
        {canScroll && !isAtStart && (
            <Button
                variant="ghost" // Using ghost or a custom variant for minimal styling
                size="icon"
                onClick={() => scroll('left')}
                className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-1 md:-translate-x-2", // Adjusted for edge placement
                    "rounded-none w-10 h-16 md:w-12 md:h-20", // Sharp edges, adjusted height
                    "bg-black/20 text-white", // Bold white icon, subtle background
                    "opacity-100", // Always visible if canScroll & not at start
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0", // Focus style
                    "flex items-center justify-center" 
                )}
                aria-label="Scroll left"
            >
                <ChevronLeft className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </Button>
        )}
        {canScroll && !isAtEnd && (
            <Button
                variant="ghost"
                size="icon"
                onClick={() => scroll('right')}
                className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-1 md:translate-x-2", // Adjusted for edge placement
                    "rounded-none w-10 h-16 md:w-12 md:h-20", // Sharp edges, adjusted height
                    "bg-black/20 text-white", // Bold white icon, subtle background
                    "opacity-100", // Always visible if canScroll & not at end
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
                    "flex items-center justify-center" 
                )}
                aria-label="Scroll right"
            >
                <ChevronRight className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </Button>
        )}

        <div 
            ref={scrollContainerRef} 
            className="flex overflow-x-auto pb-4 gap-2.5 sm:gap-3 md:gap-x-4 scrollbar-hide px-1"
            style={{ 
                scrollSnapType: 'x mandatory', // For touch devices
                scrollBehavior: 'smooth' // Native smooth scroll
            }}
        >
            {displayedAnime.map((anime, index) => (
            <div 
                key={anime.id + '-' + index} 
                className="flex-shrink-0"
                style={{ scrollSnapAlign: 'start' }} // For touch devices
            >
                <AnimeCard anime={anime} />
            </div>
            ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center md:text-left">
        Note: For more advanced scrolling animations (e.g., inertia, physics-based), integrating a library like Framer Motion or Keen Slider would be necessary. This carousel uses native browser smooth scrolling.
      </p>
    </section>
  );
}
