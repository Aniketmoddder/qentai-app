"use client";

import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';

interface AnimeCarouselProps {
  title: string;
  animeList: Anime[];
}

export default function AnimeCarousel({ title, animeList }: AnimeCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);

  const checkScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const tolerance = 5; // Allow small tolerance for floating point inaccuracies
      setIsAtStart(scrollLeft <= tolerance);
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - tolerance);
    }
  }, []);
  
  const calculateCardWidth = useCallback(() => {
    if (scrollContainerRef.current?.firstElementChild) {
      const firstCardWrapper = scrollContainerRef.current.firstElementChild as HTMLElement;
      // The firstElementChild is the wrapper div. We need the AnimeCard's width which is its first child.
      if (firstCardWrapper.firstElementChild) {
        const firstCard = firstCardWrapper.firstElementChild as HTMLElement;
        const style = window.getComputedStyle(firstCardWrapper); // Get gap from parent, or use fixed value if known
        const gap = parseFloat(style.gap || "0") || (parseFloat(window.getComputedStyle(scrollContainerRef.current).gap || "0"));

        // offsetWidth includes borders, padding, and content.
        // The gap is applied by the parent flex container, so each item's width for scrolling purposes is its own width.
        // If scrollBy is by item, then cardWidth would be item + gap.
        // For scrollBy with amount, just the item's width (plus its own margins if any) is fine.
        // The current `gap` classes on the scrollContainer handle spacing between items.
        // So, `firstCard.offsetWidth` should be the width of the AnimeCard itself.
        setCardWidth(firstCard.offsetWidth);
      }
    }
  }, []);


  useEffect(() => {
    calculateCardWidth();
    checkScrollPosition();

    const currentRef = scrollContainerRef.current;
    window.addEventListener('resize', calculateCardWidth);
    window.addEventListener('resize', checkScrollPosition);
    
    const observer = new MutationObserver(() => {
        calculateCardWidth();
        checkScrollPosition();
    });
    if (currentRef) {
        observer.observe(currentRef, { childList: true, subtree: true, attributes: true });
    }

    return () => {
      window.removeEventListener('resize', calculateCardWidth);
      window.removeEventListener('resize', checkScrollPosition);
      if (currentRef) {
        observer.disconnect();
      }
    };
  }, [animeList, calculateCardWidth, checkScrollPosition]);


  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current && cardWidth > 0) {
      // Calculate how many full cards are visible to decide scroll amount
      const visibleWidth = scrollContainerRef.current.clientWidth;
      // A more dynamic scroll amount, e.g., 80% of visible width or a fixed number of cards
      // Let's try to scroll by approx 2-3 cards if possible, or a significant portion of the view.
      let scrollAmount = visibleWidth * 0.8; // Scroll by 80% of visible width
      
      // Or, scroll by a multiple of cardWidth if cardWidth is reliable
      // const numCardsToScroll = Math.max(1, Math.floor(visibleWidth / (cardWidth + 16))); // 16px approx gap
      // scrollAmount = (cardWidth + 16) * numCardsToScroll;


      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollPosition, 400); 
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition, { passive: true });
      checkScrollPosition(); // Initial check
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
      };
    }
  }, [checkScrollPosition]);


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
            className="rounded-full bg-card/70 hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            disabled={isAtEnd}
            className="rounded-full bg-card/70 hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
      <div 
        ref={scrollContainerRef} 
        className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 md:gap-5 scrollbar-hide" // Consistent gap
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {animeList.map((anime) => (
          <div 
            key={anime.id} 
            className="flex-shrink-0 w-auto" // w-auto allows AnimeCard to define its own width
            style={{ scrollSnapAlign: 'start' }}
          >
            <AnimeCard anime={anime} />
          </div>
        ))}
      </div>
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
