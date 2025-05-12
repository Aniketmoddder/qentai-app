// src/components/anime/anime-carousel.tsx
'use client';

import type { Anime } from '@/types/anime';
import AnimeCard from './anime-card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { cn } from '@/lib/utils';

interface AnimeCarouselProps {
  title: string;
  animeList: Anime[];
}

const MAX_CARDS_TO_SHOW = 15;

export default function AnimeCarousel({ title, animeList }: AnimeCarouselProps) {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  const displayedAnime = animeList.slice(0, MAX_CARDS_TO_SHOW);

  if (!displayedAnime || displayedAnime.length === 0) {
    return null;
  }

  const updateNavState = (swiper: SwiperInstance) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  };

  const uniqueSwiperNavClassSuffix = title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');


  return (
    <section className="py-6 md:py-8 relative group/carousel mt-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground section-title-bar">{title}</h2>
      </div>
      
      <div className="relative group">
        <Swiper
          modules={[Navigation]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            updateNavState(swiper);
          }}
          onSlideChange={(swiper) => updateNavState(swiper)}
          spaceBetween={12} 
          slidesPerView="auto"
          className="!pb-1" 
          navigation={{
            nextEl: `.swiper-button-next-${uniqueSwiperNavClassSuffix}`,
            prevEl: `.swiper-button-prev-${uniqueSwiperNavClassSuffix}`,
            disabledClass: 'swiper-button-disabled-custom', 
          }}
        >
          {displayedAnime.map((anime) => (
            <SwiperSlide key={anime.id} className="!w-auto"> 
              <AnimeCard anime={anime} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Arrows */}
        {!isBeginning && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-20",
              "text-white w-10 h-16 md:w-12 md:h-20 p-0", 
              "bg-transparent", 
              "opacity-100", 
              "focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
              "flex items-center justify-center",
              `swiper-button-prev-${uniqueSwiperNavClassSuffix}` 
            )}
            onClick={() => swiperRef.current?.slidePrev()}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-7 w-7 md:h-8 md:w-8" />
          </Button>
        )}
        {!isEnd && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-20",
              "text-white w-10 h-16 md:w-12 md:h-20 p-0", 
              "bg-transparent", 
              "opacity-100", 
              "focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
              "flex items-center justify-center",
              `swiper-button-next-${uniqueSwiperNavClassSuffix}`
            )}
            onClick={() => swiperRef.current?.slideNext()}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-7 w-7 md:h-8 md:w-8" />
          </Button>
        )}
      </div>
    </section>
  );
}