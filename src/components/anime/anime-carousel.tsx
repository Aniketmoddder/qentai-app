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

export default function AnimeCarousel({ title, animeList }: AnimeCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
      if (animeList && animeList.length > 0) {
        // Reset scroll position to start when animeList changes or on initial load
        // This ensures carousel starts from the beginning if data reloads or changes significantly
        currentRef.scrollLeft = 0; 
      }
      checkScrollPosition(); // Initial check

      currentRef.addEventListener('scroll', checkScrollPosition, { passive: true });
      window.addEventListener('resize', checkScrollPosition);
      
      // Observe for content changes that might affect scrollWidth
      const observer = new ResizeObserver(checkScrollPosition);
      observer.observe(currentRef);

      return () => {
        currentRef.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
        observer.disconnect();
      };
    }
  }, [checkScrollPosition, animeList, isClient]); // Rerun if animeList changes


  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Calculate scroll amount based on a percentage of the container's width, e.g., 80%
      const scrollAmount = container.clientWidth * 0.8; 

      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      // Adding a slight delay for the scroll to complete before checking position
      // This helps in accurately updating the button states.
      setTimeout(checkScrollPosition, 350); 
    }
  };


  if (!animeList || animeList.length === 0) {
    return null; // Don't render anything if there's no anime
  }

  // Determine if scroll buttons should be shown.
  // Only show if the content width is greater than the container width.
  const showScrollButtons = isClient && scrollContainerRef.current ? scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth : false;


  return (
    <section className="py-6 md:py-8 relative group/carousel">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground section-title-bar">{title}</h2>
      </div>
      
      <div className="relative">
        {/* Desktop Scroll Buttons */}
        {showScrollButtons && (
            <>
            <Button
                variant="default"
                size="icon"
                onClick={() => scroll('left')}
                disabled={isAtStart}
                className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-1/2 md:-translate-x-1/3", // Moves button slightly off-screen to the left
                    "rounded-full w-10 h-10 md:w-12 md:h-12",
                    "bg-background/60 hover:bg-primary/90 text-foreground hover:text-primary-foreground border border-border shadow-lg hover:shadow-xl",
                    "opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 ease-in-out",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background", 
                    "hidden md:flex items-center justify-center" // Only show on md and up
                )}
                aria-label="Scroll left"
            >
                <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
            </Button>
            <Button
                variant="default"
                size="icon"
                onClick={() => scroll('right')}
                disabled={isAtEnd}
                 className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-1/2 md:translate-x-1/3", // Moves button slightly off-screen to the right
                    "rounded-full w-10 h-10 md:w-12 md:h-12",
                    "bg-background/60 hover:bg-primary/90 text-foreground hover:text-primary-foreground border border-border shadow-lg hover:shadow-xl",
                    "opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 ease-in-out",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "hidden md:flex items-center justify-center" // Only show on md and up
                )}
                aria-label="Scroll right"
            >
                <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
            </Button>
            </>
        )}

        <div 
            ref={scrollContainerRef} 
            className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 md:gap-x-5 scrollbar-hide"
            style={{ scrollSnapType: 'x mandatory' }} // Ensures snapping for better UX
        >
            {animeList.map((anime, index) => (
            // Each card is a snap target
            <div 
                key={anime.id + '-' + index} // Ensure unique key for re-renders
                className="flex-shrink-0"
                style={{ scrollSnapAlign: 'start' }}
            >
                <AnimeCard anime={anime} />
            </div>
            ))}
        </div>
      </div>

      {/* Mobile scroll buttons (always visible if scrollable, placed below carousel) */}
      {showScrollButtons && (
        <div className="md:hidden flex justify-center mt-4 space-x-3">
            <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('left')}
                disabled={isAtStart}
                className="rounded-full w-9 h-9 bg-card/70 border-border/50 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 shadow-md"
                aria-label="Scroll left"
            >
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('right')}
                disabled={isAtEnd}
                className="rounded-full w-9 h-9 bg-card/70 border-border/50 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 shadow-md"
                aria-label="Scroll right"
            >
                <ChevronRight className="h-5 w-5" />
            </Button>
            </div>
      )}
    </section>
  );
}
