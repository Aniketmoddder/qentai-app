'use client';

import Image from 'next/image';
import type { Character as CharacterType } from '@/types/anime'; 
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CharacterCardProps {
  character: CharacterType;
}

export default function CharacterCard({ character }: CharacterCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const primaryVoiceActor = character.voiceActors?.find(va => va.language === 'JAPANESE') || character.voiceActors?.[0];

  // Image sources and names
  const characterImageSrc = character.image || '/placeholder-character.png';
  const characterNameText = character.name || 'Character';

  const voiceActorImageSrc = primaryVoiceActor?.image || '/placeholder-va.png';
  const voiceActorNameText = primaryVoiceActor?.name || 'Voice Actor';
  
  // Display name for the text overlay
  const displayName = isHovered ? characterNameText : voiceActorNameText;

  return (
    <Card
      className={cn(
        "group/charcard relative w-28 sm:w-32 md:w-36 h-44 sm:h-48 md:h-52 overflow-hidden rounded-xl bg-card border-border/30 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-primary/20 cursor-default focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0} // Makes the card focusable for keyboard and tap interactions
      aria-label={`Details for ${displayName}`} // Dynamic ARIA label
    >
      <div className="relative w-full h-full">
        {/* Voice Actor Image - visible by default */}
        <Image
          src={voiceActorImageSrc}
          alt={voiceActorNameText} // Specific alt text
          fill
          sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, 144px"
          className={cn(
            "absolute inset-0 object-cover object-center transition-opacity duration-300 ease-in-out",
            isHovered ? "opacity-0" : "opacity-100"
          )}
          data-ai-hint="person portrait"
          priority={!isHovered} // Prioritize loading if initially visible
          onError={(e) => { e.currentTarget.src = '/placeholder-va.png'; }}
        />
        {/* Character Image - visible on hover/focus */}
        <Image
          src={characterImageSrc}
          alt={characterNameText} // Specific alt text
          fill
          sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, 144px"
          className={cn(
            "absolute inset-0 object-cover object-center transition-opacity duration-300 ease-in-out",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          data-ai-hint="anime character portrait"
          priority={isHovered} // Prioritize loading if visible on interaction
          onError={(e) => { e.currentTarget.src = '/placeholder-character.png'; }}
        />
        {/* Gradient overlay for text visibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none" />
      </div>
      <CardContent className="absolute bottom-0 left-0 right-0 p-2 text-center z-10">
        <p 
          className="text-xs sm:text-sm font-semibold text-white truncate w-full transition-colors duration-300 group-hover/charcard:text-primary group-focus/charcard:text-primary" 
          title={displayName}
        >
          {displayName}
        </p>
      </CardContent>
    </Card>
  );
}