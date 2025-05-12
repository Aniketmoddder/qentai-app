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
      spacing: 12, // Corresponds to gap-3 sm:gap-4 (take average or smallest)
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
  
  const isAtStart = loaded && instanceRef.current ? instanceRef.current.track.details.isRel === 0 : true;
  const isAtEnd = loaded && instanceRef.current ? instanceRef.current.track.details.isRel === instanceRef.current.track.details.slides.length -1 : false;
  const canScroll = loaded && instanceRef.current ? instanceRef.current.track.details.slides.length > (instanceRef.current.options.slides?.perView || 1) : false;


  return (
    <div className="relative py-4 mt-1 sm:mt-2">
        {loaded && instanceRef.current && canScroll && !isAtStart && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.prev()}}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-0 md:-translate-x-1/2",
              "w-9 h-16 sm:w-10 sm:h-20 p-0 rounded-none",
              "bg-black/20 text-white",
              "opacity-100",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "flex items-center justify-center"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </Button>
      )}

      {loaded && instanceRef.current && canScroll && !isAtEnd && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.next()}}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-0 md:translate-x-1/2",
              "w-9 h-16 sm:w-10 sm:h-20 p-0 rounded-none",
              "bg-black/20 text-white",
              "opacity-100",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "flex items-center justify-center"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </Button>
      )}

      <div
        ref={sliderRef}
        className="keen-slider scrollbar-hide px-1" 
      >
        {displayedCharacters.map((character) => (
          <div
            key={character.id}
            className="keen-slider__slide"
            style={{
                minWidth: '112px', // w-28
                maxWidth: '136px', // md:w-[136px]
            }}
          >
            <CharacterCard character={character} />
          </div>
        ))}
      </div>
    </div>
  );
}
