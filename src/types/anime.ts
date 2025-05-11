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
  id: string; // Firestore document ID
  tmdbId?: string; // TMDB ID (movie or TV), optional
  aniListId?: number; // AniList ID, optional
  title: string;
  coverImage: string; // URL to poster image (can be from TMDB or AniList)
  bannerImage?: string; // URL to backdrop image (can be from TMDB or AniList)
  year: number;
  genre: string[];
  status: 'Ongoing' | 'Completed' | 'Upcoming' | 'Unknown' | 'Airing' | 'Not Yet Aired' | 'Cancelled' | 'Hiatus';
  synopsis: string;
  averageRating?: number; // Optional, 0-10 scale (usually from TMDB)
  averageScore?: number; // Optional, 0-100 scale (from AniList)
  episodes?: Episode[]; // Optional, especially for movies or if episodes are added later
  type?: 'TV' | 'Movie' | 'OVA' | 'Special' | 'Unknown' | 'ONA' | 'Music';
  sourceAdmin?: 'tmdb' | 'manual' | 'tmdb_anilist'; // To track how it was added/enriched
  isFeatured?: boolean; // To mark anime as featured
  trailerUrl?: string; // Optional YouTube video URL for trailer
  characters?: Character[]; // Enriched character data from AniList
  createdAt?: string; // Firestore Timestamp for when the document was created, converted to ISO string
  updatedAt?: string; // Firestore Timestamp for when the document was last updated, converted to ISO string
  
  // New fields from AniList/TMDB for details section
  season?: string; // e.g., "WINTER", "SPRING", "SUMMER", "FALL"
  seasonYear?: number; // Year the season aired
  countryOfOrigin?: string; // e.g., "JP"
  studios?: { id: number; name: string; isAnimationStudio: boolean; }[]; // List of production studios
  source?: string; // e.g., "MANGA", "ORIGINAL", "LIGHT_NOVEL"
  popularity?: number; // AniList popularity score
  format?: string; // AniList media format (TV, MOVIE, OVA, etc.)
  duration?: number; // Episode duration in minutes
  airedFrom?: string; // ISO date string
  airedTo?: string; // ISO date string
  episodesCount?: number; // Total number of episodes from AniList/TMDB
}

export interface Episode {
  id: string; // Can be tmdb_season_X_episode_Y or custom
  tmdbEpisodeId?: number; // TMDB's own episode ID
  title: string;
  episodeNumber: number;
  seasonNumber: number; // Explicitly part of Episode
  thumbnail?: string; // URL
  duration?: string | number; // e.g., "24min" or number of minutes
  url?: string; // Video source URL, to be added by admin
  airDate?: string; // From TMDB/AniList (ISO date string)
  overview?: string; // From TMDB
}

// Season interface might be useful for more structured TV show data,
// but current approach embeds seasonNumber in Episode.
// If you decide to structure seasons explicitly:
export interface Season {
  id: string; // e.g., animeId-season-1
  tmdbSeasonId?: number;
  seasonNumber: number;
  title?: string; // Optional, e.g., "Season 1" or arc name
  episodes: Episode[]; // Episodes would then not need seasonNumber if they are part of a Season object
  airDate?: string;
  posterPath?: string;
  overview?: string;
}

// For AI Recommendations
export interface AnimeRecommendation {
  id: string;
  title: string;
  coverImage: string;
  reason?: string; // Optional: Why this is recommended
}
