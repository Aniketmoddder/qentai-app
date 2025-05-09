"use client";

import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

interface AnimeCarouselProps {
  title: string;
  animeList: Anime[];
  showCount?: number;
}

export default function AnimeCarousel({ title, animeList, showCount = 5 }: AnimeCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    if (scrollContainerRef.current && scrollContainerRef.current.firstElementChild) {
        const firstCard = scrollContainerRef.current.firstElementChild as HTMLElement;
        // Calculate width including margin/gap. Assuming gap-4 (1rem)
        const style = window.getComputedStyle(firstCard);
        const marginRight = parseFloat(style.marginRight) || 0;
        setCardWidth(firstCard.offsetWidth + marginRight);
    }
    checkScrollPosition();
  }, [animeList, cardWidth]);


  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setIsAtStart(scrollLeft === 0);
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 5); // Tolerance of 5px
    }
  };
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current && cardWidth > 0) {
      const scrollAmount = cardWidth * Math.floor(scrollContainerRef.current.clientWidth / cardWidth); // Scroll by visible items
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      // Check scroll position after a short delay to allow scroll animation to progress
      setTimeout(checkScrollPosition, 400);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition); // Re-check on resize
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
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
        className="flex overflow-x-auto pb-4 gap-4 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {animeList.map((anime) => (
          <div 
            key={anime.id} 
            className="flex-shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc(33.33%-0.66rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(20%-0.8rem)] xl:w-[calc(16.66%-0.83rem)]"
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
