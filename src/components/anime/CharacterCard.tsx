'use client';

import Image from 'next/image';
import type { Character as CharacterType } from '@/types/anime'; // Using CharacterType to avoid naming conflict
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, User } from 'lucide-react'; // Icons for VA and Character
import { cn } from '@/lib/utils';

interface CharacterCardProps {
  character: CharacterType;
}

export default function CharacterCard({ character }: CharacterCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Prioritize Japanese voice actor, then first available, then character info
  const primaryVoiceActor = character.voiceActors?.find(va => va.language === 'JAPANESE') || character.voiceActors?.[0];

  const displayImage = isHovered ? (character.image || '/placeholder-character.png') : (primaryVoiceActor?.image || '/placeholder-va.png');
  const displayName = isHovered ? (character.name || 'Character') : (primaryVoiceActor?.name || 'Voice Actor');
  const displayRoleIcon = isHovered ? <User size={14} className="text-primary group-hover/charcard:text-primary transition-colors" /> : <Mic size={14} className="text-muted-foreground group-hover/charcard:text-primary transition-colors" />;
  
  // More descriptive role text
  const characterRoleText = character.role ? `${character.role.charAt(0).toUpperCase() + character.role.slice(1).toLowerCase()} Character` : 'Character';
  const voiceActorRoleText = primaryVoiceActor?.language ? `${primaryVoiceActor.language} Voice Actor` : 'Voice Actor';
  const currentRoleText = isHovered ? characterRoleText : voiceActorRoleText;

  return (
    <Card
      className="group/charcard relative w-32 sm:w-36 h-56 sm:h-60 overflow-hidden rounded-xl bg-card border-border/30 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-primary/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      aria-label={`View details for ${displayName}`}
    >
      <div className="relative w-full h-3/4 overflow-hidden rounded-t-xl">
        <Image
          src={displayImage}
          alt={displayName}
          fill
          sizes="(max-width: 640px) 128px, 144px"
          className="object-cover object-center transition-transform duration-500 ease-out group-hover/charcard:scale-110"
          data-ai-hint={isHovered ? "anime character portrait" : "person portrait"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent opacity-0 group-hover/charcard:opacity-100 transition-opacity duration-300" />
      </div>
      <CardContent className="p-2 h-1/4 flex flex-col justify-center items-center text-center bg-card rounded-b-xl">
        <p className="text-xs sm:text-sm font-semibold text-foreground truncate w-full transition-colors duration-300 group-hover/charcard:text-primary" title={displayName}>
          {displayName}
        </p>
        <div className={cn(
            "text-[0.65rem] sm:text-xs text-muted-foreground flex items-center gap-1 transition-colors duration-300",
            isHovered ? "group-hover/charcard:text-primary" : "group-hover/charcard:text-primary"
          )}
        >
          {displayRoleIcon}
          <span className="transition-opacity duration-300">
            {currentRoleText}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}