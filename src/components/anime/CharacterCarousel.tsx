// src/components/anime/CharacterCarousel.tsx
'use client';

import type { Character } from '@/types/anime';
import CharacterCard from './CharacterCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { cn } from '@/lib/utils';

interface CharacterCarouselProps {
  characters?: Character[];
}

const MAX_CHARACTERS_TO_SHOW = 15;

export default function CharacterCarousel({ characters }: CharacterCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    initial: 0,
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
    slides: {
      perView: 'auto',
      spacing: 10, // Slightly less spacing for character cards
    },
     drag: true,
     rubberband: true,
  });

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

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
  
  const showLeftArrow = loaded && instanceRef.current && currentSlide !== 0;
  const showRightArrow = loaded && instanceRef.current && instanceRef.current.track.details && currentSlide < instanceRef.current.track.details.slides.length - (Math.floor(instanceRef.current.options.slides?.perView || 1) > 0 ? Math.floor(instanceRef.current.options.slides?.perView || 1) : 1) ;
  const canScroll = loaded && instanceRef.current && instanceRef.current.track.details && instanceRef.current.track.details.slides.length > (instanceRef.current.options.slides?.perView || 1);


  return (
    <div className="relative py-4 mt-1 sm:mt-2 navigation-wrapper group">
      <div
        ref={sliderRef}
        className="keen-slider scrollbar-hide px-1" 
      >
        {displayedCharacters.map((character) => (
          <div
            key={character.id}
            className="keen-slider__slide flex justify-center" // Added flex justify-center
            style={{
                // Width is controlled by CharacterCard
            }}
          >
            <CharacterCard character={character} />
          </div>
        ))}
      </div>

      {canScroll && (
          <>
          {showLeftArrow && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.prev()}}
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 z-20",
                  "text-white w-8 h-12 md:w-10 md:h-16 p-0", // Slightly smaller arrows for char carousel
                  "bg-gradient-to-r from-black/40 to-transparent",
                  "opacity-100 hover:opacity-100 focus:opacity-100",
                  "focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
                  "flex items-center justify-center"
                )}
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
          )}
          {showRightArrow && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.next()}}
                className={cn(
                  "absolute right-0 top-1/2 -translate-y-1/2 z-20",
                  "text-white w-8 h-12 md:w-10 md:h-16 p-0",
                  "bg-gradient-to-l from-black/40 to-transparent",
                  "opacity-100 hover:opacity-100 focus:opacity-100",
                  "focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
                  "flex items-center justify-center"
                )}
                aria-label="Scroll right"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
          )}
          </>
      )}
    </div>
  );
}
