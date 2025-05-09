
'use server';
import type { Anime, Episode, Season } from '@/types/anime';
import type { TMDBMovie, TMDBTVShow, TMDBTVSeasonResponse, TMDBEpisode } from '@/types/tmdb';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

if (!TMDB_API_KEY) {
  console.warn("TMDB API Key is not configured. TMDB related features will not work.");
}

const fetchFromTMDB = async <T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T | null> => {
  if (!TMDB_API_KEY) return null;
  const urlParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
  });
  const url = `${TMDB_BASE_URL}/${endpoint}?${urlParams.toString()}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`TMDB API Error for ${url}: ${response.status} ${response.statusText}`);
      const errorData = await response.json().catch(() => ({}));
      console.error("TMDB Error Details:", errorData);
      return null;
    }
    return response.json() as Promise<T>;
  } catch (error) {
    console.error(`Network error fetching from TMDB ${url}:`, error);
    return null;
  }
};

const getTMDBStatus = (tmdbStatus: string, type: 'movie' | 'tv'): Anime['status'] => {
  if (type === 'movie') {
    if (tmdbStatus === 'Released') return 'Completed';
    if (tmdbStatus === 'Post Production' || tmdbStatus === 'In Production' || tmdbStatus === 'Planned') return 'Upcoming';
  } else if (type === 'tv') {
    if (tmdbStatus === 'Ended' || tmdbStatus === 'Canceled') return 'Completed';
    if (tmdbStatus === 'Returning Series' || tmdbStatus === 'In Production' || tmdbStatus === 'Pilot') return 'Ongoing'; // Pilot can be considered ongoing
    if (tmdbStatus === 'Planned') return 'Upcoming';
  }
  return 'Unknown'; // Default or if status doesn't match
};


export const fetchAnimeDetailsFromTMDB = async (tmdbId: string, type: 'movie' | 'tv'): Promise<Partial<Anime> | null> => {
  if (!TMDB_API_KEY) return null;
  let details: Partial<Anime> = {};

  if (type === 'movie') {
    const movieData = await fetchFromTMDB<TMDBMovie>(`movie/${tmdbId}`);
    if (!movieData) return null;
    details = {
      tmdbId: movieData.id.toString(),
      title: movieData.title,
      synopsis: movieData.overview,
      coverImage: movieData.poster_path ? `${TMDB_IMAGE_BASE_URL}w500${movieData.poster_path}` : `https://picsum.photos/seed/${movieData.id}poster/300/450`,
      bannerImage: movieData.backdrop_path ? `${TMDB_IMAGE_BASE_URL}w1280${movieData.backdrop_path}` : `https://picsum.photos/seed/${movieData.id}banner/1200/400`,
      year: movieData.release_date ? parseInt(movieData.release_date.split('-')[0]) : 0,
      genre: movieData.genres.map(g => g.name),
      averageRating: movieData.vote_average ? parseFloat(movieData.vote_average.toFixed(1)) : undefined,
      status: getTMDBStatus(movieData.status, 'movie'),
      type: 'Movie',
      episodes: [{ // For movies, create a single "episode"
          id: `${movieData.id}-movie`,
          title: 'Full Movie',
          episodeNumber: 1,
          seasonNumber: 1,
          // URL needs to be added by admin
      }],
      sourceAdmin: 'tmdb',
    };
  } else if (type === 'tv') {
    const tvData = await fetchFromTMDB<TMDBTVShow>(`tv/${tmdbId}`);
    if (!tvData) return null;

    const animeEpisodes: Episode[] = [];
    if (tvData.seasons && tvData.seasons.length > 0) {
      for (const seasonBrief of tvData.seasons.filter(s => s.season_number > 0)) { // Skip "Specials" season (season_number 0) for now
        const seasonDetails = await fetchFromTMDB<TMDBTVSeasonResponse>(`tv/${tmdbId}/season/${seasonBrief.season_number}`);
        if (seasonDetails && seasonDetails.episodes) {
          seasonDetails.episodes.forEach((ep: TMDBEpisode) => {
            animeEpisodes.push({
              id: `s${seasonBrief.season_number}e${ep.episode_number}-${tvData.id}`,
              tmdbEpisodeId: ep.id,
              title: ep.name || `Episode ${ep.episode_number}`,
              episodeNumber: ep.episode_number,
              seasonNumber: seasonBrief.season_number,
              thumbnail: ep.still_path ? `${TMDB_IMAGE_BASE_URL}w300${ep.still_path}` : `https://picsum.photos/seed/s${seasonBrief.season_number}e${ep.episode_number}${tvData.id}thumb/320/180`,
              duration: ep.runtime ? `${ep.runtime}min` : undefined,
              airDate: ep.air_date || undefined,
              overview: ep.overview,
              // URL needs to be added by admin
            });
          });
        }
      }
    }

    details = {
      tmdbId: tvData.id.toString(),
      title: tvData.name,
      synopsis: tvData.overview,
      coverImage: tvData.poster_path ? `${TMDB_IMAGE_BASE_URL}w500${tvData.poster_path}` : `https://picsum.photos/seed/${tvData.id}poster/300/450`,
      bannerImage: tvData.backdrop_path ? `${TMDB_IMAGE_BASE_URL}w1280${tvData.backdrop_path}` : `https://picsum.photos/seed/${tvData.id}banner/1200/400`,
      year: tvData.first_air_date ? parseInt(tvData.first_air_date.split('-')[0]) : 0,
      genre: tvData.genres.map(g => g.name),
      averageRating: tvData.vote_average ? parseFloat(tvData.vote_average.toFixed(1)) : undefined,
      status: getTMDBStatus(tvData.status, 'tv'),
      type: 'TV',
      episodes: animeEpisodes.length > 0 ? animeEpisodes : undefined,
      sourceAdmin: 'tmdb',
    };
  }
  return details;
};

// Placeholder for searching TMDB, could be used in admin panel
export const searchTMDB = async (query: string, type: 'movie' | 'tv' | 'multi' = 'multi') => {
  if (!TMDB_API_KEY) return null;
  const endpoint = type === 'multi' ? `search/multi` : `search/${type}`;
  return fetchFromTMDB(endpoint, { query });
};
