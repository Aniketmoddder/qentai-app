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
  
  // Initialize state with default (non-hovered) values
  const [currentImageSrc, setCurrentImageSrc] = useState(voiceActorImage);
  const [currentName, setCurrentName] = useState(voiceActorNameText);
  const [currentAlt, setCurrentAlt] = useState(voiceActorNameText);

  useEffect(() => {
    if (isHovered) {
      setCurrentImageSrc(characterImage);
      setCurrentName(characterNameText);
      setCurrentAlt(characterNameText);
    } else {
      setCurrentImageSrc(voiceActorImage);
      setCurrentName(voiceActorNameText);
      setCurrentAlt(voiceActorNameText);
    }
  }, [isHovered, characterImage, characterNameText, voiceActorImage, voiceActorNameText]);

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'N/A';
    const parts = name.split(' ');
    if (parts.length > 1 && parts[0] && parts[parts.length -1]) {
      return `${parts[0][0]}.${parts[parts.length -1][0]}.`.toUpperCase();
    }
    if (parts[0]) {
        return `${parts[0][0]}.`.toUpperCase();
    }
    return 'N/A';
  };

  const displayInitials = isHovered ? getInitials(character.name) : getInitials(primaryVoiceActor?.name);
  
  let roleLetter = '';
  if (character.role) {
    if (character.role.toUpperCase() === 'MAIN') roleLetter = 'M';
    else if (character.role.toUpperCase() === 'SUPPORTING') roleLetter = 'S';
  }


  return (
    <div
      className={cn(
        "group/charcard relative w-[70px] h-[105px] sm:w-[75px] sm:h-[112.5px] md:w-[80px] md:h-[120px]", 
        "rounded-lg overflow-hidden", 
        "bg-card border-2 border-transparent group-hover/charcard:border-primary/50 transition-all duration-300 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)} 
      onBlur={() => setIsHovered(false)}
      tabIndex={-1} // Made non-focusable as it's decorative, whole carousel item is focusable
      aria-hidden="true" // Decorative
    >
      <div className="relative w-full h-full transition-transform duration-500 ease-out group-hover/charcard:scale-105">
        {/* Image container with fixed aspect ratio for consistent image display */}
        <div className="absolute inset-0 transition-opacity duration-300 ease-in-out">
          <Image
            src={currentImageSrc} // This will now always be a valid URL or null
            alt={currentAlt}
            fill
            sizes="(max-width: 640px) 70px, (max-width: 768px) 75px, 80px"
            className="object-cover object-center" 
            data-ai-hint="person portrait"
            priority={true} // Prioritize first few images
            // Removed onError as next/image handles fallbacks better or via placeholder prop
          />
        </div>
        {/* Gradient overlay for text */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
      </div>

      {/* Text Overlay - Character/VA Name and Role */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center z-10 pointer-events-none">
        <p 
          className="text-[0.6rem] sm:text-xs font-semibold text-white truncate w-full leading-tight"
          title={currentName}
          aria-live="polite" 
        >
          {currentName}
        </p>
        {roleLetter && !isHovered && ( // Show role only for Voice Actor view
          <p className="text-[0.55rem] text-white/80 mt-0.5">
            Role: {roleLetter}
          </p>
        )}
      </div>
    </div>
  );
}

interface CharacterTypeProps {
  character: CharacterType;
}
