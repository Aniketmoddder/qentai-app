// src/components/anime/CharacterCard.tsx
'use client';

import Image from 'next/image';
import type { Character as CharacterType } from '@/types/anime'; 
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function CharacterCard({ character }: CharacterTypeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const primaryVoiceActor = character.voiceActors?.find(va => va.language === 'JAPANESE') || character.voiceActors?.[0];

  const characterImageSrc = character.image || `https://picsum.photos/seed/${character.id || 'char'}/200/300`;
  const characterNameText = character.name || 'Character';

  const voiceActorImageSrc = primaryVoiceActor?.image || `https://picsum.photos/seed/${primaryVoiceActor?.id || 'va'}/200/300`;
  const voiceActorNameText = primaryVoiceActor?.name || 'Voice Actor';
  
  const displayName = isHovered && character.name ? character.name : (primaryVoiceActor?.name || 'N/A');
  const displayRole = character.role ? character.role.charAt(0).toUpperCase() + character.role.slice(1).toLowerCase() : 'Supporting';

  return (
    <div
      className={cn(
        "group/charcard relative w-28 sm:w-32 md:w-[136px] h-40 sm:h-44 md:h-[190px] overflow-hidden rounded-lg bg-card border border-border/20 shadow-md transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )} // Removed transform hover:shadow-primary/30 to avoid card scaling
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)} 
      onBlur={() => setIsHovered(false)}
      tabIndex={0} 
      aria-label={`Details for ${displayName}, role: ${displayRole}`}
    >
      <div className="relative w-full h-full">
        <Image
          src={voiceActorImageSrc}
          alt={voiceActorNameText}
          fill
          sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, 136px"
          className={cn(
            "absolute inset-0 object-cover object-center transition-opacity duration-500 ease-in-out",
            isHovered ? "opacity-0" : "opacity-100"
          )}
          data-ai-hint="person portrait"
          priority={!isHovered} 
          onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${primaryVoiceActor?.id || 'va-fallback'}/200/300`; }}
        />
        <Image
          src={characterImageSrc}
          alt={characterNameText}
          fill
          sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, 136px"
          className={cn(
            "absolute inset-0 object-cover object-center transition-opacity duration-500 ease-in-out",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          data-ai-hint="anime character portrait"
          priority={isHovered}
          onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${character.id || 'char-fallback'}/200/300`; }}
        />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none" />
      </div>
      <CardContent className="absolute bottom-0 left-0 right-0 p-2.5 text-left z-10">
        <p 
          className="text-xs sm:text-sm font-bold text-white truncate w-full transition-colors duration-300 group-hover/charcard:text-primary group-focus/charcard:text-primary" 
          title={displayName}
          aria-live="polite" 
        >
          {displayName}
        </p>
        {displayRole && (
          <div className="flex items-center mt-0.5">
            <p className="text-[0.6rem] sm:text-[0.65rem] text-white/80 group-hover/charcard:text-primary/90 truncate w-full">
              {displayRole}
            </p>
          </div>
        )}
      </CardContent>
    </div>
  );
}

interface CharacterTypeProps {
  character: CharacterType;
}
