// src/components/anime/CharacterCard.tsx
'use client';

import Image from 'next/image';
import type { Character as CharacterType } from '@/types/anime'; 
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function CharacterCard({ character }: CharacterTypeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const primaryVoiceActor = character.voiceActors?.find(va => va.language?.toUpperCase() === 'JAPANESE') || character.voiceActors?.[0];

  const characterImage = character.image || `https://picsum.photos/seed/${character.id || 'char'}-${Date.now()}/100/150`;
  const characterNameText = character.name || 'Character';

  const voiceActorImage = primaryVoiceActor?.image || `https://picsum.photos/seed/${primaryVoiceActor?.id || 'va'}-${Date.now()}/100/150`;
  const voiceActorNameText = primaryVoiceActor?.name || 'Voice Actor';
  
  const [currentImageSrc, setCurrentImageSrc] = useState(voiceActorImage);
  const [currentName, setCurrentName] = useState(voiceActorNameText);
  const [currentAlt, setCurrentAlt] = useState(voiceActorNameText);

  useEffect(() => {
    // Client-side effect to prevent hydration mismatch if Math.random was used in placeholder
    // and to set initial state based on non-hovered.
    setCurrentImageSrc(isHovered ? characterImage : voiceActorImage);
    setCurrentName(isHovered ? characterNameText : voiceActorNameText);
    setCurrentAlt(isHovered ? characterNameText : voiceActorNameText);
  }, [isHovered, characterImage, characterNameText, voiceActorImage, voiceActorNameText]);
  
  const roleLetter = ''; // Role display removed as per previous request

  return (
    <div
      className={cn(
        "relative w-[75px] h-[112.5px] sm:w-[85px] sm:h-[127.5px] md:w-[95px] md:h-[142.5px]", 
        "rounded-lg overflow-hidden", 
        "bg-card border-2 border-transparent group-hover/charcard:border-primary/50 transition-all duration-300 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)} 
      onBlur={() => setIsHovered(false)}
      tabIndex={-1} 
      aria-hidden="true" 
    >
      <div className="relative w-full h-full transition-transform duration-500 ease-out group-hover/charcard:scale-105">
        <div className="absolute inset-0 transition-opacity duration-300 ease-in-out">
          <Image
            src={currentImageSrc || `https://picsum.photos/seed/placeholder-char/100/150`} // Fallback for null src
            alt={currentAlt}
            fill
            sizes="(max-width: 640px) 75px, (max-width: 768px) 85px, 95px"
            className="object-cover object-center" 
            data-ai-hint="person portrait"
            priority={true} 
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center z-10 pointer-events-none">
        <p 
          className="text-[0.6rem] sm:text-xs font-semibold text-white truncate w-full leading-tight"
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
