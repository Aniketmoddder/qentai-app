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
        currentRef.scrollLeft = 0; 
      }
      checkScrollPosition(); 

      currentRef.addEventListener('scroll', checkScrollPosition, { passive: true });
      window.addEventListener('resize', checkScrollPosition);
      
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
      // Scroll by a percentage of the container's width for smoother multi-item scroll
      // For desktop, a slightly larger scroll might feel better.
      const scrollAmount = container.clientWidth * (window.innerWidth < 768 ? 0.75 : 0.6); 


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
        {showScrollButtons && (
            <>
            <Button
                variant="default"
                size="icon"
                onClick={() => scroll('left')}
                disabled={isAtStart}
                className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-1/2 md:-translate-x-1/3", 
                    "rounded-full w-10 h-10 md:w-12 md:h-12",
                    "bg-background/60 hover:bg-primary/90 text-foreground hover:text-primary-foreground border border-border shadow-lg hover:shadow-xl",
                    "opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 ease-in-out",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background", 
                    "flex items-center justify-center" // Ensure flex properties for centering icon
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
                    "absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-1/2 md:translate-x-1/3", 
                    "rounded-full w-10 h-10 md:w-12 md:h-12",
                    "bg-background/60 hover:bg-primary/90 text-foreground hover:text-primary-foreground border border-border shadow-lg hover:shadow-xl",
                    "opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 ease-in-out",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "flex items-center justify-center" // Ensure flex properties for centering icon
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
            style={{ 
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth' // Added for CSS-driven smooth scroll, complements JS
            }}
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

      {/* Removed mobile scroll buttons div that was previously here */}
    </section>
  );
}