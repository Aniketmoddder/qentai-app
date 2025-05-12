// src/components/anime/CharacterCard.tsx
'use client';

import Image from 'next/image';
import type { Character as CharacterType } from '@/types/anime'; 
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function CharacterCard({ character }: CharacterTypeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const primaryVoiceActor = character.voiceActors?.find(va => va.language?.toUpperCase() === 'JAPANESE') || character.voiceActors?.[0];

  const characterImage = character.image || `https://picsum.photos/seed/${character.id || 'char'}-${Date.now()}/120/180`;
  const characterNameText = character.name || 'Character';

  const voiceActorImage = primaryVoiceActor?.image || `https://picsum.photos/seed/${primaryVoiceActor?.id || 'va'}-${Date.now()}/120/180`;
  const voiceActorNameText = primaryVoiceActor?.name || 'Voice Actor';
  
  const [currentImageSrc, setCurrentImageSrc] = useState(voiceActorImage);
  const [currentName, setCurrentName] = useState(voiceActorNameText);
  const [currentAlt, setCurrentAlt] = useState(voiceActorNameText);

  useEffect(() => {
    setCurrentImageSrc(isHovered ? characterImage : voiceActorImage);
    setCurrentName(isHovered ? characterNameText : voiceActorNameText);
    setCurrentAlt(isHovered ? characterNameText : voiceActorNameText);
  }, [isHovered, characterImage, characterNameText, voiceActorImage, voiceActorNameText]);
  

  return (
    <div
      className={cn(
        "relative w-[80px] h-[120px] sm:w-[90px] sm:h-[135px] md:w-[100px] md:h-[150px]", // Increased size
        "rounded-lg overflow-hidden group/charcard", 
        "bg-card border-2 border-transparent hover:border-primary/70 transition-all duration-300 ease-in-out transform hover:scale-105 focus-within:scale-105 focus-within:border-primary/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)} 
      onBlur={() => setIsHovered(false)}
      tabIndex={0} // Make it focusable for keyboard navigation
      aria-label={`View details for ${currentName}`}
    >
      <div className="relative w-full h-full transition-transform duration-500 ease-out">
        <div className="absolute inset-0 transition-opacity duration-300 ease-in-out">
          <Image
            src={currentImageSrc || `https://picsum.photos/seed/placeholder-char/120/180`}
            alt={currentAlt}
            fill
            sizes="(max-width: 640px) 80px, (max-width: 768px) 90px, 100px"
            className="object-cover object-center" 
            data-ai-hint="person portrait"
            priority={false} 
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-2 text-center z-10 pointer-events-none">
        <p 
          className="text-xs sm:text-sm font-semibold text-white truncate w-full leading-tight"
          title={currentName}
          aria-live="polite" 
        >
          {currentName}
        </p>
      </div>
    </div>
  );
}

interface CharacterTypeProps {
  character: CharacterType;
}

