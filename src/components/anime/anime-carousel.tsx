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
      
      <div className="navigation-wrapper relative px-8 sm:px-10 md:px-12 group"> {/* Added padding for arrows */}
        <div 
            ref={sliderRef} 
            className="keen-slider scrollbar-hide" // Removed px from here
        >
            {displayedAnime.map((anime, index) => (
            <div 
                key={anime.id + '-' + index} 
                className="keen-slider__slide"
                 style={{ 
                    // Let the AnimeCard's own max-width control the size.
                    // perView: 'auto' will adjust.
                 }}
            >
                <AnimeCard anime={anime} />
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
                    "absolute left-0 top-1/2 -translate-y-1/2 z-20", // Sits within navigation-wrapper padding
                    "text-white", // Icon color
                    "opacity-100 disabled:opacity-0 disabled:cursor-not-allowed",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "border-none shadow-none bg-transparent hover:bg-transparent", // No background, border, shadow or hover bg
                    "p-1 w-auto h-auto" // Adjust padding/size to fit icon snugly
                )}
                aria-label="Scroll left"
                disabled={isAtStart}
            >
                <ChevronLeft className="h-7 w-7 md:h-8 md:w-8" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.next()}}
                className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 z-20", // Sits within navigation-wrapper padding
                    "text-white", // Icon color
                    "opacity-100 disabled:opacity-0 disabled:cursor-not-allowed",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "border-none shadow-none bg-transparent hover:bg-transparent",
                    "p-1 w-auto h-auto"
                )}
                aria-label="Scroll right"
                disabled={isAtEnd}
            >
                <ChevronRight className="h-7 w-7 md:h-8 md:w-8" />
            </Button>
            </>
        )}
      </div>
    </section>
  );
}

