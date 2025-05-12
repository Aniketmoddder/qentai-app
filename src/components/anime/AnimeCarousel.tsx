// src/components/anime/anime-carousel.tsx
'use client';

import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { cn } from '@/lib/utils';

interface AnimeCarouselProps {
  title: string;
  animeList: Anime[];
}

const MAX_CARDS_TO_SHOW = 15;

export default function AnimeCarousel({ title, animeList }: AnimeCarouselProps) {
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
      spacing: 12, // Corresponds to gap-3 (0.75rem = 12px)
    },
    drag: true,
    rubberband: true,
  });

  const displayedAnime = animeList.slice(0, MAX_CARDS_TO_SHOW);

  if (!displayedAnime || displayedAnime.length === 0) {
    return null;
  }

  const isAtStart = loaded && instanceRef.current ? instanceRef.current.track.details.isRel === 0 : true;
  const isAtEnd = loaded && instanceRef.current ? instanceRef.current.track.details.isRel === instanceRef.current.track.details.slides.length -1 : false;
  const canScroll = loaded && instanceRef.current ? instanceRef.current.track.details.slides.length > (instanceRef.current.options.slides?.perView || 1) : false;


  return (
    <section className="py-6 md:py-8 relative mt-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground section-title-bar">{title}</h2>
      </div>
      
      <div className="relative navigation-wrapper">
        {loaded && instanceRef.current && canScroll && !isAtStart && (
            <Button
                variant="ghost"
                size="icon"
                onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.prev()}}
                className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-20 -translate-x-1 md:-translate-x-2",
                    "rounded-none w-10 h-16 md:w-12 md:h-20 p-0",
                    "bg-black/20 text-white",
                    "opacity-100", 
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "flex items-center justify-center" 
                )}
                aria-label="Scroll left"
            >
                <ChevronLeft className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </Button>
        )}
        {loaded && instanceRef.current && canScroll && !isAtEnd && (
            <Button
                variant="ghost"
                size="icon"
                onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.next()}}
                className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 z-20 translate-x-1 md:translate-x-2",
                    "rounded-none w-10 h-16 md:w-12 md:h-20 p-0",
                    "bg-black/20 text-white",
                    "opacity-100",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "flex items-center justify-center" 
                )}
                aria-label="Scroll right"
            >
                <ChevronRight className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </Button>
        )}

        <div 
            ref={sliderRef} 
            className="keen-slider scrollbar-hide"
        >
            {displayedAnime.map((anime, index) => (
            <div 
                key={anime.id + '-' + index} 
                className="keen-slider__slide"
                 style={{ 
                    minWidth: 'calc(50vw - 1.25rem - 6px)', // accounting for gap (12px / 2 = 6px)
                    maxWidth: '150px', // From anime-card
                    '@screen sm': { // Using a pseudo-selector for Tailwind's sm breakpoint
                         minWidth: 'auto',
                         maxWidth: '160px',
                    },
                    '@screen md': {
                         maxWidth: '170px',
                    }
                 }}
            >
                <AnimeCard anime={anime} />
            </div>
            ))}
        </div>
      </div>
    </section>
  );
}
