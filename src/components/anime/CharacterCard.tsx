
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

  // Determine which image and name to display based on hover state
  const displayImageSrc = isHovered 
    ? (character.image || '/placeholder-character.png') 
    : (primaryVoiceActor?.image || '/placeholder-va.png');
  
  const displayName = isHovered 
    ? (character.name || 'Character') 
    : (primaryVoiceActor?.name || 'Voice Actor');

  // Fallback for images if specific ones are missing
  const characterImageFallback = '/placeholder-character.png'; // A generic character silhouette
  const voiceActorImageFallback = '/placeholder-va.png';     // A generic VA/person silhouette
  
  const finalImageSrc = isHovered 
    ? (character.image || characterImageFallback)
    : (primaryVoiceActor?.image || voiceActorImageFallback);

  return (
    <Card
      className={cn(
        "group/charcard relative w-28 sm:w-32 md:w-36 h-44 sm:h-48 md:h-52 overflow-hidden rounded-xl bg-card border-border/30 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-primary/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      aria-label={`View details for ${displayName}`}
    >
      <div className="relative w-full h-full overflow-hidden rounded-xl">
        <Image
          src={finalImageSrc}
          alt={displayName}
          fill
          sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, 144px"
          className="object-cover object-center transition-all duration-500 ease-out group-hover/charcard:scale-110"
          data-ai-hint={isHovered ? "anime character portrait" : "person portrait"}
          onError={(e) => {
            // Fallback for broken images
            const target = e.target as HTMLImageElement;
            target.srcset = isHovered ? characterImageFallback : voiceActorImageFallback;
            target.src = isHovered ? characterImageFallback : voiceActorImageFallback;
          }}
        />
        {/* Gradient overlay for text visibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none" />
      </div>
      <CardContent className="absolute bottom-0 left-0 right-0 p-2 text-center z-10">
        <p 
          className="text-xs sm:text-sm font-semibold text-white truncate w-full transition-colors duration-300 group-hover/charcard:text-primary" 
          title={displayName}
        >
          {displayName}
        </p>
      </CardContent>
    </Card>
  );
}
