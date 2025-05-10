
import type { Timestamp } from 'firebase/firestore';

export interface Anime {
  id: string; // Firestore document ID
  tmdbId?: string; // TMDB ID (movie or TV), optional
  title: string;
  coverImage: string; // URL to poster image
  bannerImage?: string; // URL to backdrop image
  year: number;
  genre: string[];
  status: 'Ongoing' | 'Completed' | 'Upcoming' | 'Unknown';
  synopsis: string;
  averageRating?: number; // Optional, 0-10 scale
  episodes?: Episode[]; // Optional, especially for movies or if episodes are added later
  type?: 'TV' | 'Movie' | 'OVA' | 'Special' | 'Unknown';
  sourceAdmin?: 'tmdb' | 'manual'; // To track how it was added
  isFeatured?: boolean; // To mark anime as featured
  trailerUrl?: string; // Optional YouTube video URL for trailer
  createdAt?: Timestamp; // Firestore Timestamp for when the document was created
  updatedAt?: Timestamp; // Firestore Timestamp for when the document was last updated
}

export interface Episode {
  id: string; // Can be tmdb_season_X_episode_Y or custom
  tmdbEpisodeId?: number; // TMDB's own episode ID
  title: string;
  episodeNumber: number;
  seasonNumber: number; // Explicitly part of Episode
  thumbnail?: string; // URL
  duration?: string; // e.g., "24min" or number of minutes
  url?: string; // Video source URL, to be added by admin
  airDate?: string; // From TMDB
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
