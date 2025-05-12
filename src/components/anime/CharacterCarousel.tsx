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
      spacing: 12, 
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
  
  const isAtStart = loaded && instanceRef.current ? currentSlide === 0 : true;
  const isAtEnd = loaded && instanceRef.current ? currentSlide === instanceRef.current.track.details.slides.length - instanceRef.current.track.details.slidesPerView : false;
  const canScroll = loaded && instanceRef.current ? instanceRef.current.track.details.slides.length > (instanceRef.current.options.slides?.perView || 1) : false;


  return (
    <div className="relative py-4 mt-1 sm:mt-2 navigation-wrapper"> {/* Added navigation-wrapper for consistency */}
        {/* keen-slider div needs padding for arrows to sit in */}
      <div
        ref={sliderRef}
        className="keen-slider scrollbar-hide px-10"  // Added padding
      >
        {displayedCharacters.map((character) => (
          <div
            key={character.id}
            className="keen-slider__slide"
            style={{
                minWidth: '112px', 
                maxWidth: '136px', 
            }}
          >
            <CharacterCard character={character} />
          </div>
        ))}
      </div>

      {loaded && instanceRef.current && canScroll && !isAtStart && (
          <Button
            variant="default"
            size="icon"
            onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.prev()}}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-30",
              "rounded-full w-9 h-9 sm:w-10 sm:h-10 p-0", // Made circular and sized
              "bg-black/30 text-white", // Dark semi-transparent background, white icon
              "opacity-100", // Always visible
              "disabled:opacity-0 disabled:cursor-not-allowed",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
              "flex items-center justify-center border-none shadow-none"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:h-6" />
          </Button>
      )}

      {loaded && instanceRef.current && canScroll && !isAtEnd && (
          <Button
            variant="default"
            size="icon"
            onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.next()}}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-30",
              "rounded-full w-9 h-9 sm:w-10 sm:h-10 p-0",
              "bg-black/30 text-white",
              "opacity-100",
              "disabled:opacity-0 disabled:cursor-not-allowed",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
              "flex items-center justify-center border-none shadow-none"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:h-6" />
          </Button>
      )}
    </div>
  );
}
