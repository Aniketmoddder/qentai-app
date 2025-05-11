
import type { Timestamp } from 'firebase/firestore';

export interface VoiceActor {
  id?: number; // AniList voice actor ID
  name: string | null;
  image: string | null; // URL
  language?: string; // e.g., JAPANESE, ENGLISH
}

export interface CharacterNode { // From AniList structure
  id: number;
  name: {
    full: string | null;
    native?: string | null;
    userPreferred?: string | null;
  } | null;
  image: {
    large: string | null;
    medium?: string | null;
  } | null;
}

export interface AniListStudioEdge {
  node: {
    id: number;
    name: string;
    isAnimationStudio: boolean;
  };
}
export interface AniListStudioConnection {
  edges: AniListStudioEdge[];
}


export interface CharacterEdge { // From AniList structure
  node: CharacterNode;
  role?: 'MAIN' | 'SUPPORTING' | 'BACKGROUND'; // Role of the character in the media
  voiceActors?: { // Directly use AniList's voice actor structure
    id: number;
    name: {
      full: string | null;
      native?: string | null;
      userPreferred?: string | null;
    } | null;
    image: {
      large: string | null;
      medium?: string | null;
    } | null;
    languageV2?: string; // e.g. Japanese, English
  }[];
}


export interface Character {
  id: number; // AniList character ID
  name: string | null;
  role?: 'MAIN' | 'SUPPORTING' | 'BACKGROUND' | string; // Allow string for flexibility
  image: string | null; // URL to anime character image
  voiceActors?: VoiceActor[]; // Parsed Voice Actors
}

export interface Anime {
  id: string; // Firestore document ID (now a slug derived from title)
  tmdbId?: string;
  aniListId?: number;
  title: string;
  coverImage: string;
  bannerImage?: string;
  year: number;
  genre: string[];
  status: 'Ongoing' | 'Completed' | 'Upcoming' | 'Unknown' | 'Airing' | 'Not Yet Aired' | 'Cancelled' | 'Hiatus';
  synopsis: string;
  averageRating?: number;
  averageScore?: number;
  episodes?: Episode[];
  type?: 'TV' | 'Movie' | 'OVA' | 'Special' | 'Unknown' | 'ONA' | 'Music';
  sourceAdmin?: 'tmdb' | 'manual' | 'tmdb_anilist';
  isFeatured?: boolean;
  trailerUrl?: string;
  characters?: Character[];
  createdAt?: string; // ISO string on client
  updatedAt?: string; // ISO string on client
  
  season?: string;
  seasonYear?: number;
  countryOfOrigin?: string;
  studios?: { id: number; name: string; isAnimationStudio: boolean; }[];
  source?: string;
  popularity?: number;
  format?: string;
  duration?: number;
  airedFrom?: string; // ISO date string
  airedTo?: string; // ISO date string
  episodesCount?: number;
}

export interface Episode {
  id: string; 
  tmdbEpisodeId?: number;
  title: string;
  episodeNumber: number;
  seasonNumber: number;
  thumbnail?: string;
  duration?: string | number;
  url?: string;
  airDate?: string; // ISO date string
  overview?: string;
}

export interface Season {
  id: string;
  tmdbSeasonId?: number;
  seasonNumber: number;
  title?: string;
  episodes: Episode[];
  airDate?: string;
  posterPath?: string;
  overview?: string;
}

export interface AnimeRecommendation {
  id: string;
  title: string;
  coverImage: string;
  reason?: string;
}
