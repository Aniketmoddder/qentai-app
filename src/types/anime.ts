export interface Anime {
  id: string; // Firestore document ID
  tmdbId?: string; // TMDB ID (movie or TV)
  title: string;
  coverImage: string; // URL to poster image
  bannerImage?: string; // URL to backdrop image
  year: number;
  genre: string[];
  status: 'Ongoing' | 'Completed' | 'Upcoming' | 'Unknown';
  synopsis: string;
  averageRating?: number; // Optional, 0-10 or 0-5 scale
  episodes?: Episode[]; // Optional, especially for movies or if episodes are added later
  type?: 'TV' | 'Movie' | 'OVA' | 'Special' | 'Unknown';
  sourceAdmin?: 'tmdb' | 'manual'; // To track how it was added
}

export interface Episode {
  id: string; // Can be tmdb_season_X_episode_Y or custom
  tmdbEpisodeId?: number;
  title: string;
  episodeNumber: number;
  seasonNumber?: number; // Add season number to episode
  thumbnail?: string; // URL
  duration?: string; // e.g., "24min" or number of minutes
  url?: string; // Video source URL, to be added by admin
  airDate?: string; // From TMDB
  overview?: string; // From TMDB
}

export interface Season {
  id: string; // Can be tmdb_season_X
  tmdbSeasonId?: number;
  seasonNumber: number;
  title?: string; // Optional, e.g., "Season 1" or arc name
  episodes: Episode[];
  airDate?: string; // From TMDB
  posterPath?: string; // From TMDB
  overview?: string; // From TMDB
}

// For AI Recommendations
export interface AnimeRecommendation {
  id: string;
  title: string;
  coverImage: string;
  reason?: string; // Optional: Why this is recommended
}
