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
      const tolerance = 5; // Small tolerance for floating point inaccuracies
      setIsAtStart(scrollLeft <= tolerance);
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - tolerance);
    }
  }, []);
  

  useEffect(() => {
    const currentRef = scrollContainerRef.current;
    if (currentRef && isClient) { // Ensure this runs only on the client
      if (animeList && animeList.length > 0) {
        currentRef.scrollLeft = 0; 
      }
      checkScrollPosition(); 

      currentRef.addEventListener('scroll', checkScrollPosition, { passive: true });
      window.addEventListener('resize', checkScrollPosition);
      
      // Use ResizeObserver for more reliable updates on content/size changes
      const observer = new ResizeObserver(checkScrollPosition);
      observer.observe(currentRef);

      return () => {
        currentRef.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
        observer.disconnect();
      };
    }
  }, [checkScrollPosition, animeList, isClient]);


  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.8; 

      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollPosition, 350); 
    }
  };


  if (!animeList || animeList.length === 0) {
    return null;
  }

  const showScrollButtons = isClient && scrollContainerRef.current ? scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth : false;


  return (
    <section className="py-6 md:py-8 relative group/carousel">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground section-title-bar">{title}</h2>
      </div>
      
      <div className="relative">
        {/* Desktop Scroll Buttons - positioned over the carousel */}
        {showScrollButtons && (
            <>
            <Button
                variant="default"
                size="icon"
                onClick={() => scroll('left')}
                disabled={isAtStart}
                className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-20",
                    "rounded-full w-10 h-10 md:w-12 md:h-12",
                    "bg-black/40 hover:bg-black/70 text-white",
                    "opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300",
                    "disabled:opacity-20 disabled:cursor-not-allowed",
                    "shadow-lg hover:shadow-xl",
                    "hidden md:flex items-center justify-center -ml-3 md:-ml-5" 
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
                    "absolute right-0 top-1/2 -translate-y-1/2 z-20",
                    "rounded-full w-10 h-10 md:w-12 md:h-12",
                    "bg-black/40 hover:bg-black/70 text-white",
                    "opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300",
                    "disabled:opacity-20 disabled:cursor-not-allowed",
                    "shadow-lg hover:shadow-xl",
                    "hidden md:flex items-center justify-center -mr-3 md:-mr-5"
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
            style={{ scrollSnapType: 'x mandatory' }}
        >
            {animeList.map((anime, index) => (
            <div 
                key={anime.id + '-' + index} 
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

