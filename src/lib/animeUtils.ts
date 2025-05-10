
import type { Anime } from '@/types/anime';
import { Timestamp } from 'firebase/firestore';

// Helper to convert Firestore Timestamps to ISO strings for client components
export const convertAnimeTimestampsForClient = (animeData: any): Omit<Anime, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string } => {
  const data = { ...animeData };

  if (data.createdAt && data.createdAt instanceof Timestamp) {
    data.createdAt = data.createdAt.toDate().toISOString();
  } else if (typeof data.createdAt === 'object' && data.createdAt && 'seconds' in data.createdAt && 'nanoseconds' in data.createdAt && typeof data.createdAt.seconds === 'number' && typeof data.createdAt.nanoseconds === 'number') {
    data.createdAt = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate().toISOString();
  } else if (typeof data.createdAt === 'string') {
    try {
      data.createdAt = new Date(data.createdAt).toISOString();
    } catch (e) {
      console.warn("Failed to parse createdAt string, leaving as is:", data.createdAt, e);
    }
  } else if (data.createdAt) {
    console.warn("Unexpected createdAt format, attempting conversion:", data.createdAt);
    try {
      data.createdAt = new Date(data.createdAt).toISOString();
    } catch (e) { console.error("Failed to convert createdAt", e); delete data.createdAt; }
  }


  if (data.updatedAt && data.updatedAt instanceof Timestamp) {
    data.updatedAt = data.updatedAt.toDate().toISOString();
  } else if (typeof data.updatedAt === 'object' && data.updatedAt && 'seconds' in data.updatedAt && 'nanoseconds' in data.updatedAt && typeof data.updatedAt.seconds === 'number' && typeof data.updatedAt.nanoseconds === 'number') {
     data.updatedAt = new Timestamp(data.updatedAt.seconds, data.updatedAt.nanoseconds).toDate().toISOString();
  } else if (typeof data.updatedAt === 'string') {
    try {
      data.updatedAt = new Date(data.updatedAt).toISOString();
    } catch (e) {
      console.warn("Failed to parse updatedAt string, leaving as is:", data.updatedAt, e);
    }
  } else if (data.updatedAt) {
    console.warn("Unexpected updatedAt format, attempting conversion:", data.updatedAt);
     try {
      data.updatedAt = new Date(data.updatedAt).toISOString();
    } catch (e) { console.error("Failed to convert updatedAt", e); delete data.updatedAt; }
  }
  
  if (data.episodes && Array.isArray(data.episodes)) {
    data.episodes = data.episodes.map((ep: any) => {
      const episode = { ...ep };
      if (episode.airDate && episode.airDate instanceof Timestamp) {
        episode.airDate = episode.airDate.toDate().toISOString().split('T')[0];
      } else if (typeof episode.airDate === 'object' && episode.airDate && 'seconds' in episode.airDate && 'nanoseconds'in episode.airDate) {
        episode.airDate = new Timestamp(episode.airDate.seconds, episode.airDate.nanoseconds).toDate().toISOString().split('T')[0];
      } else if (typeof episode.airDate === 'string') {
         try {
          episode.airDate = new Date(episode.airDate).toISOString().split('T')[0];
        } catch (e) { console.warn("Failed to parse episode airDate string", e); }
      }
      return episode;
    });
  }
  return data as Omit<Anime, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string };
};
