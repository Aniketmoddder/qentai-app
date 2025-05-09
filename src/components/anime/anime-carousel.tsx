"use client";

import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

interface AnimeCarouselProps {
  title: string;
  animeList: Anime[];
}

export default function AnimeCarousel({ title, animeList }: AnimeCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    const calculateCardWidth = () => {
      if (scrollContainerRef.current && scrollContainerRef.current.firstElementChild) {
          const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement;
          const style = window.getComputedStyle(firstCard);
          const marginRight = parseFloat(style.marginRight) || 0; 
          const marginLeft = parseFloat(style.marginLeft) || 0; 
          setCardWidth(firstCard.offsetWidth + marginRight + marginLeft);
      }
    }
    
    const currentRef = scrollContainerRef.current; // Capture ref value

    calculateCardWidth(); // Initial calculation
    checkScrollPosition(); // Initial check

    window.addEventListener('resize', calculateCardWidth);
    window.addEventListener('resize', checkScrollPosition);
    
    // MutationObserver to recalculate on dynamic changes (e.g. if cards are added/removed)
    const observer = new MutationObserver(() => {
        calculateCardWidth();
        checkScrollPosition();
    });
    if (currentRef) {
        observer.observe(currentRef, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', calculateCardWidth);
      window.removeEventListener('resize', checkScrollPosition);
      if (currentRef) {
        observer.disconnect();
      }
    }
  }, [animeList]); // Re-run if animeList changes, which might affect card presence


  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      // Add a small tolerance (e.g., 1px or 5px) for floating point inaccuracies
      setIsAtStart(scrollLeft <= 5); 
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 5);
    }
  };
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current && cardWidth > 0) {
      const visibleCards = Math.max(1, Math.floor(scrollContainerRef.current.clientWidth / cardWidth));
      const scrollAmount = cardWidth * visibleCards;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      // Using a timeout to wait for the scroll animation to complete before re-checking
      setTimeout(checkScrollPosition, 400); 
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Passive true for better scroll performance
      container.addEventListener('scroll', checkScrollPosition, { passive: true });
      // Initial check in case content loads such that it's already at an edge
      checkScrollPosition();
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
      };
    }
  }, [animeList]); // Re-check if animeList changes, as it affects scrollWidth


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
      </div>
      <div 
        ref={scrollContainerRef} 
        className="flex overflow-x-auto pb-4 gap-2.5 sm:gap-3 md:gap-3.5 scrollbar-hide" // Adjusted gap
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {animeList.map((anime) => (
          <div 
            key={anime.id} 
            // Reduced card widths for a more compact, Netflix-like appearance
            className="flex-shrink-0 w-[130px] sm:w-[140px] md:w-[150px] lg:w-[160px] xl:w-[170px]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <AnimeCard anime={anime} />
          </div>
        ))}
      </div>
       {/* Mobile scroll buttons always visible for better UX */}
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
