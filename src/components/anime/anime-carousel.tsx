// src/components/anime/anime-carousel.tsx
'use client';

import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
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
      spacing: 12, 
    },
    drag: true,
    rubberband: true,
  });

  const displayedAnime = animeList.slice(0, MAX_CARDS_TO_SHOW);

  if (!displayedAnime || displayedAnime.length === 0) {
    return null;
  }

  const isAtStart = loaded && instanceRef.current ? currentSlide === 0 : true;
  const isAtEnd = loaded && instanceRef.current ? currentSlide === instanceRef.current.track.details.slides.length - instanceRef.current.track.details.slidesPerView : false;
  const canScroll = loaded && instanceRef.current ? instanceRef.current.track.details.slides.length > (instanceRef.current.options.slides?.perView || 1) : false;


  return (
    <section className="py-6 md:py-8 relative group/carousel mt-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground section-title-bar">{title}</h2>
      </div>
      
      <div className="relative navigation-wrapper">
         {/* keen-slider div needs padding for arrows to sit in */}
        <div 
            ref={sliderRef} 
            className="keen-slider scrollbar-hide px-10 md:px-12" // Added padding for arrows
        >
            {displayedAnime.map((anime, index) => (
            <div 
                key={anime.id + '-' + index} 
                className="keen-slider__slide"
                 style={{ 
                    minWidth: 'calc(50vw - 1.25rem - 6px)', 
                    maxWidth: '150px', 
                    // @ts-ignore
                    '@screen sm': { 
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
        
        {loaded && instanceRef.current && canScroll && !isAtStart && (
            <Button
                variant="default" // Changed from ghost to have a background
                size="icon"
                onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.prev()}}
                className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 z-30", // Ensure left-0 is within parent's padding context
                    "rounded-full w-10 h-10 md:w-12 md:h-12 p-0",
                    "bg-black/30 text-white", // Dark semi-transparent background, white icon
                    "opacity-100", // Always visible
                    "disabled:opacity-0 disabled:cursor-not-allowed", // Hides if disabled (at start)
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0", // Minimal focus
                    "flex items-center justify-center border-none shadow-none" // No border, no explicit shadow
                )}
                aria-label="Scroll left"
            >
                <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
            </Button>
        )}
        {loaded && instanceRef.current && canScroll && !isAtEnd && (
            <Button
                variant="default"
                size="icon"
                onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.next()}}
                className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 z-30", // Ensure right-0 is within parent's padding context
                    "rounded-full w-10 h-10 md:w-12 md:h-12 p-0",
                    "bg-black/30 text-white",
                    "opacity-100",
                    "disabled:opacity-0 disabled:cursor-not-allowed",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
                    "flex items-center justify-center border-none shadow-none"
                )}
                aria-label="Scroll right"
            >
                <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
            </Button>
        )}
      </div>
    </section>
  );
}
