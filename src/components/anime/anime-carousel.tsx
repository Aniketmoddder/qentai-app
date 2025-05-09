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
          const marginRight = parseFloat(style.marginRight) || 0; // For gap
          const marginLeft = parseFloat(style.marginLeft) || 0; // For gap
          setCardWidth(firstCard.offsetWidth + marginRight + marginLeft);
      }
    }
    calculateCardWidth();
    checkScrollPosition();
    window.addEventListener('resize', calculateCardWidth);
    window.addEventListener('resize', checkScrollPosition);
    return () => {
      window.removeEventListener('resize', calculateCardWidth);
      window.removeEventListener('resize', checkScrollPosition);
    }
  }, [animeList]);


  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setIsAtStart(scrollLeft < 5); // Tolerance for fractional pixels
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 5); // Tolerance of 5px
    }
  };
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current && cardWidth > 0) {
      // Scroll by a number of full cards that fit the viewport
      const visibleCards = Math.max(1, Math.floor(scrollContainerRef.current.clientWidth / cardWidth));
      const scrollAmount = cardWidth * visibleCards;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollPosition, 400); // Re-check after scroll animation
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition, { passive: true });
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
      };
    }
  }, []);


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
        className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 md:gap-5 scrollbar-hide" // Adjusted gap
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {animeList.map((anime) => (
          <div 
            key={anime.id} 
            // Adjusted card widths for a more "Netflix" feel - fewer, larger cards visible
            className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <AnimeCard anime={anime} />
          </div>
        ))}
      </div>
       {/* Mobile scroll buttons */}
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
