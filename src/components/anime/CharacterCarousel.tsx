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
    <div className="relative py-4 mt-1 sm:mt-2 navigation-wrapper group px-8 sm:px-10 md:px-12"> {/* Added padding for arrows */}
      <div
        ref={sliderRef}
        className="keen-slider scrollbar-hide" // Removed px from here
      >
        {displayedCharacters.map((character) => (
          <div
            key={character.id}
            className="keen-slider__slide"
            style={{
                // Let CharacterCard's own width/max-width control the size
            }}
          >
            <CharacterCard character={character} />
          </div>
        ))}
      </div>

      {loaded && instanceRef.current && canScroll && (
          <>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.prev()}}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-20",
              "text-white",
              "opacity-100 disabled:opacity-0 disabled:cursor-not-allowed",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "border-none shadow-none bg-transparent hover:bg-transparent",
              "p-1 w-auto h-auto"
            )}
            aria-label="Scroll left"
            disabled={isAtStart}
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:h-7" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.next()}}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-20",
              "text-white",
              "opacity-100 disabled:opacity-0 disabled:cursor-not-allowed",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "border-none shadow-none bg-transparent hover:bg-transparent",
              "p-1 w-auto h-auto"
            )}
            aria-label="Scroll right"
            disabled={isAtEnd}
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:h-7" />
          </Button>
          </>
      )}
    </div>
  );
}

