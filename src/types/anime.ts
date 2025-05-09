export interface Anime {
  id: string;
  title: string;
  coverImage: string;
  bannerImage?: string; // Optional
  year: number;
  genre: string[];
  status: 'Ongoing' | 'Completed' | 'Upcoming';
  synopsis: string;
  averageRating?: number; // Optional, 0-10 or 0-5 scale
  episodes?: Episode[]; // Optional for brief display
  type?: 'TV' | 'Movie' | 'OVA' | 'Special'; // Optional
}

export interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  thumbnail?: string; // Optional
  duration?: string; // Optional, e.g., "24min"
}

export interface Season {
  id: string;
  seasonNumber: number;
  title?: string; // Optional, e.g., "Season 1" or arc name
  episodes: Episode[];
}

// For AI Recommendations
export interface AnimeRecommendation {
  id: string;
  title: string;
  coverImage: string;
  reason?: string; // Optional: Why this is recommended
}
