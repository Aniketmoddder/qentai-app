// Raw types matching AniList GraphQL API response structure
// This helps in parsing the direct response before transforming it to our app's Character/VoiceActor types.

export interface AniListName {
  full: string | null;
  native?: string | null;
  userPreferred?: string | null;
}

export interface AniListImage {
  large: string | null;
  medium?: string | null;
}

export interface AniListCharacterNode {
  id: number;
  name: AniListName | null;
  image: AniListImage | null;
  role?: 'MAIN' | 'SUPPORTING' | 'BACKGROUND';
}

export interface AniListVoiceActorNode {
  id: number;
  name: AniListName | null;
  image: AniListImage | null;
  languageV2?: string; // e.g. JAPANESE, ENGLISH
}

export interface AniListCharacterEdge {
  node: AniListCharacterNode;
  role?: 'MAIN' | 'SUPPORTING' | 'BACKGROUND'; // Role of the character in this specific media
  voiceActors?: AniListVoiceActorNode[];
}

export interface AniListCharacterConnection {
  edges: AniListCharacterEdge[];
}

export interface AniListMediaTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
  userPreferred?: string | null;
}

export interface AniListMediaCoverImage {
  extraLarge?: string | null;
  large?: string | null;
  medium?: string | null;
  color?: string | null;
}

export interface AniListMedia {
  id: number;
  title?: AniListMediaTitle | null;
  bannerImage?: string | null;
  coverImage?: AniListMediaCoverImage | null;
  characters?: AniListCharacterConnection | null;
  // Add other fields from AniList Media object as needed
  description?: string | null; // For synopsis if TMDB is missing
  genres?: string[] | null;
  status?: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS' | null; // AniList status values
  averageScore?: number | null; // 0-100 scale
  seasonYear?: number | null;
  format?: 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC' | 'MANGA' | 'NOVEL' | 'ONE_SHOT' | null; // AniList format
}

export interface AniListGraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

export interface AniListMediaData {
  Media: AniListMedia | null;
}