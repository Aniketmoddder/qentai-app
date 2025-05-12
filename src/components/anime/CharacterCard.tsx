// src/components/anime/CharacterCard.tsx
'use client';

import Image from 'next/image';
import type { Character as CharacterType } from '@/types/anime'; 
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function CharacterCard({ character }: CharacterTypeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [currentAlt, setCurrentAlt] = useState('');

  const primaryVoiceActor = character.voiceActors?.find(va => va.language?.toUpperCase() === 'JAPANESE') || character.voiceActors?.[0];

  const characterImageSrc = character.image || `https://picsum.photos/seed/${character.id || 'char'}/80/120`;
  const characterNameText = character.name || 'Character';

  const voiceActorImageSrc = primaryVoiceActor?.image || `https://picsum.photos/seed/${primaryVoiceActor?.id || 'va'}/80/120`;
  const voiceActorNameText = primaryVoiceActor?.name || 'Voice Actor';
  
  useEffect(() => {
    if (isHovered) {
      setCurrentImageSrc(characterImageSrc);
      setCurrentName(characterNameText);
      setCurrentAlt(characterNameText);
    } else {
      setCurrentImageSrc(voiceActorImageSrc);
      setCurrentName(voiceActorNameText);
      setCurrentAlt(voiceActorNameText);
    }
  }, [isHovered, characterImageSrc, characterNameText, voiceActorImageSrc, voiceActorNameText]);

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'N/A';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}.${parts[parts.length -1][0]}.`.toUpperCase();
    }
    return `${parts[0][0]}.`.toUpperCase();
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
        "group/charcard relative w-[70px] h-[210px] sm:w-[75px] sm:h-[225px] md:w-[80px] md:h-[240px]", // Adjusted size for capsule
        "rounded-full overflow-hidden", // Capsule shape
        "bg-card border-2 border-transparent group-hover/charcard:border-primary/50 transition-all duration-300 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)} 
      onBlur={() => setIsHovered(false)}
      tabIndex={0} 
      aria-label={`Details for ${currentName}, role: ${character.role || 'Unknown'}`}
    >
      <div className="relative w-full h-full">
        {/* Image container with fixed aspect ratio for consistent image display */}
        <div className="absolute inset-0 transition-opacity duration-300 ease-in-out">
          <Image
            src={currentImageSrc}
            alt={currentAlt}
            fill
            sizes="(max-width: 640px) 70px, (max-width: 768px) 75px, 80px"
            className="object-cover object-center" // Ensures image covers the area
            data-ai-hint="person portrait"
            priority={true} 
            onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${character.id || 'fallback-char'}/80/120`; }}
          />
        </div>
        {/* Gradient overlay for text */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Text Overlay - Initials and Role */}
      <div className="absolute bottom-0 left-0 right-0 p-2 text-center z-10">
        <p 
          className="text-sm font-bold text-white truncate w-full"
          title={displayInitials}
          aria-live="polite" 
        >
          {displayInitials}
        </p>
        {roleLetter && (
          <p className="text-xs text-white/90 mt-0.5">
            {roleLetter}
          </p>
        )}
      </div>
    </div>
  );
}

interface CharacterTypeProps {
  character: CharacterType;
}