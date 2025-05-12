// src/components/anime/anime-carousel.tsx
'use client';

import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react'; // Removed useEffect as keen-slider handles loaded state
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
      spacing: 12, // Corresponds to gap-3 (0.75rem = 12px) or md:gap-4 (1rem = 16px)
    },
    drag: true,
    rubberband: true,
  });

  const displayedAnime = animeList.slice(0, MAX_CARDS_TO_SHOW);

  if (!displayedAnime || displayedAnime.length === 0) {
    return null;
  }
  
  // Determine if arrows should be shown based on keen-slider's state
  const showLeftArrow = loaded && instanceRef.current && currentSlide !== 0;
  const showRightArrow = loaded && instanceRef.current && instanceRef.current.track.details && currentSlide < instanceRef.current.track.details.slides.length - (Math.floor(instanceRef.current.options.slides?.perView || 1) > 0 ? Math.floor(instanceRef.current.options.slides?.perView || 1) : 1) ;
  const canScroll = loaded && instanceRef.current && instanceRef.current.track.details && instanceRef.current.track.details.slides.length > (instanceRef.current.options.slides?.perView || 1);


  return (
    <section className="py-6 md:py-8 relative group/carousel mt-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground section-title-bar">{title}</h2>
      </div>
      
      <div className="navigation-wrapper relative group">
        {/* Keen Slider Container */}
        <div 
            ref={sliderRef} 
            className="keen-slider scrollbar-hide px-1" // Added some padding for cards not to touch edges
        >
            {displayedAnime.map((anime, index) => (
            <div 
                key={anime.id + '-' + index} 
                className="keen-slider__slide flex justify-center" // Added flex justify-center
                 style={{ 
                    // Width is controlled by AnimeCard, keen-slider's 'auto' perView handles it
                 }}
            >
                <AnimeCard anime={anime} />
            </div>
            ))}
        </div>
        
        {/* Navigation Arrows - Always visible but conditionally rendered based on scroll position */}
        {canScroll && (
            <>
            {showLeftArrow && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.prev()}}
                    className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 z-20", 
                        "text-white w-10 h-16 md:w-12 md:h-20 p-0",
                        "bg-gradient-to-r from-black/50 to-transparent", // Gradient background for visibility
                        "opacity-100 hover:opacity-100 focus:opacity-100", // No hover animation on arrow itself
                        "focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none", // Sharp edges
                        "flex items-center justify-center"
                    )}
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-7 w-7 md:h-8 md:w-8" />
                </Button>
            )}
            {showRightArrow && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e: any) => { e.stopPropagation(); instanceRef.current?.next()}}
                    className={cn(
                        "absolute right-0 top-1/2 -translate-y-1/2 z-20",
                        "text-white w-10 h-16 md:w-12 md:h-20 p-0",
                        "bg-gradient-to-l from-black/50 to-transparent", // Gradient background for visibility
                        "opacity-100 hover:opacity-100 focus:opacity-100",
                        "focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
                        "flex items-center justify-center"
                    )}
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-7 w-7 md:h-8 md:w-8" />
                </Button>
            )}
            </>
        )}
      </div>
    </section>
  );
}
