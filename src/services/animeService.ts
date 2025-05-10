'use server';
import { db } from '@/lib/firebase';
import type { Anime, Episode } from '@/types/anime';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  Timestamp,
  FirestoreError,
  serverTimestamp,
  writeBatch,
  QueryConstraint,
  documentId,
} from 'firebase/firestore';

const animesCollection = collection(db, 'animes');

const handleFirestoreError = (error: unknown, context: string): FirestoreError => {
  console.error(`Firestore Error in ${context}:`, error);
  if (error instanceof FirestoreError) {
    return error;
  }
  const genericError = new FirestoreError('unknown', `An unknown error occurred in ${context}.`);
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    (genericError as any).message = error.message;
  }
  return genericError;
};

export const addAnimeToFirestore = async (animeData: Omit<Anime, 'id'>): Promise<string> => {
  try {
    const animeDocRef = doc(animesCollection); 
    
    const newAnime: Anime = {
      ...animeData,
      id: animeDocRef.id, 
      episodes: animeData.episodes || [], 
      tmdbId: animeData.tmdbId || undefined, 
    };

    await setDoc(animeDocRef, newAnime);
    return animeDocRef.id;
  } catch (error) {
    throw handleFirestoreError(error, 'addAnimeToFirestore');
  }
};


export const getAnimeById = async (id: string): Promise<Anime | undefined> => {
  try {
    const docRef = doc(animesCollection, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Anime;
    }
    return undefined;
  } catch (error) {
    throw handleFirestoreError(error, `getAnimeById (id: ${id})`);
  }
};

export const getAllAnimes = async (
  count: number = 20,
  filters?: {
    type?: Anime['type'];
    genre?: string;
    sortBy?: 'averageRating' | 'year' | 'title';
    sortOrder?: 'asc' | 'desc';
    featured?: boolean; // For a potential "featured" flag in DB
  }
): Promise<Anime[]> => {
  try {
    const queryConstraints: QueryConstraint[] = [];

    if (filters?.type) {
      queryConstraints.push(where('type', '==', filters.type));
    }
    if (filters?.genre) {
      queryConstraints.push(where('genre', 'array-contains', filters.genre));
    }
    if (filters?.featured) {
       queryConstraints.push(where('isFeatured', '==', true)); // Assuming 'isFeatured' boolean field
    }

    if (filters?.sortBy) {
      queryConstraints.push(orderBy(filters.sortBy, filters.sortOrder || 'desc'));
    } else if (!filters?.genre) { 
      // Only apply default sort by title if NOT filtering by genre to avoid specific composite index error.
      // If filtering by genre and no sort is specified, Firestore's default order will be used.
      // For full sort functionality with genre filters, the user needs to create the composite index.
      queryConstraints.push(orderBy('title', 'asc'));
    }
    // If filters.genre is present and filters.sortBy is not, no explicit orderBy is added here.

    queryConstraints.push(limit(count));
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn(
        `Firestore query requires an index. This is common when filtering by an array and ordering by another field. Please create the required composite index in your Firebase console. The error message usually provides a link to create it. Original error: ${error.message}`
      );
      // Optionally, re-throw a more user-friendly error or return empty array
      // throw new Error(`Query requires a Firestore index. Check server logs for details or Firebase console. ${error.message}`);
    }
    // For other errors, use the generic handler
    throw handleFirestoreError(error, 'getAllAnimes');
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const searchTermLower = searchTerm.toLowerCase();
    
    const allAnime = await getAllAnimes(200); 
    
    return allAnime.filter(anime => 
      anime.title.toLowerCase().includes(searchTermLower) ||
      (anime.genre && anime.genre.some(g => g.toLowerCase().includes(searchTermLower))) ||
      (anime.year && anime.year.toString().includes(searchTermLower))
    );
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
  }
};

export const getAnimesByType = async (type: Anime['type'], count: number = 20): Promise<Anime[]> => {
  try {
    const q = query(animesCollection, where('type', '==', type), orderBy('title', 'asc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByType (type: ${type})`);
  }
};

export const getAnimesByGenre = async (genre: string, count: number = 20): Promise<Anime[]> => {
  try {
    // When querying by genre, if no explicit sort is provided, default to title sort.
    // This specific combination (array-contains + orderBy another field) needs a composite index.
    const q = query(animesCollection, where('genre', 'array-contains', genre), orderBy('title', 'asc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn(
        `Firestore query in getAnimesByGenre requires an index for 'genre' (array-contains) and 'title' (orderBy). Please create this index in your Firebase console. Original error: ${error.message}`
      );
    }
    throw handleFirestoreError(error, `getAnimesByGenre (genre: ${genre})`);
  }
};


export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Anime>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeInFirestore (id: ${id})`);
  }
};

export const updateAnimeEpisode = async (animeId: string, episodeId: string, updatedEpisodeData: Partial<Episode>): Promise<void> => {
  try {
    const animeRef = doc(animesCollection, animeId);
    const animeSnap = await getDoc(animeRef);

    if (!animeSnap.exists()) {
      throw new Error(`Anime with ID ${animeId} not found.`);
    }

    const animeData = animeSnap.data() as Anime;
    const episodes = animeData.episodes || [];
    
    const episodeIndex = episodes.findIndex(ep => ep.id === episodeId);

    if (episodeIndex === -1) {
       console.warn(`Episode with ID ${episodeId} not found in anime ${animeId}. Cannot update.`);
       return; 
    } else {
      episodes[episodeIndex] = { ...episodes[episodeIndex], ...updatedEpisodeData };
    }
    
    await updateDoc(animeRef, { episodes: episodes });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeEpisode (animeId: ${animeId}, episodeId: ${episodeId})`);
  }
};


export const deleteAnimeFromFirestore = async (id: string): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    throw handleFirestoreError(error, `deleteAnimeFromFirestore (id: ${id})`);
  }
};

export const addSeasonToAnime = async (animeId: string, seasonNumber: number, seasonTitle?: string): Promise<void> => {
    console.log(`Placeholder: Add season ${seasonNumber} (${seasonTitle}) to anime ${animeId}`);
};

export const addEpisodeToSeason = async (animeId: string, episodeData: Episode): Promise<void> => {
    try {
        const animeRef = doc(animesCollection, animeId);
        const animeSnap = await getDoc(animeRef);

        if (!animeSnap.exists()) {
            throw new Error(`Anime with ID ${animeId} not found.`);
        }
        const anime = animeSnap.data() as Anime;
        const newEpisode: Episode = {
            ...episodeData,
            id: episodeData.id || `${animeId}-s${episodeData.seasonNumber}e${episodeData.episodeNumber}-${Date.now()}` 
        };
        const updatedEpisodes = [...(anime.episodes || []), newEpisode];
        await updateDoc(animeRef, { episodes: updatedEpisodes });
    } catch (error) {
        throw handleFirestoreError(error, `addEpisodeToSeason (animeId: ${animeId})`);
    }
};

const staticAvailableGenres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Romance', 'Horror', 'Mystery', 'Thriller', 'Sports', 'Supernatural', 'Mecha', 'Historical', 'Music', 'School', 'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Psychological', 'Ecchi', 'Harem', 'Demons', 'Magic', 'Martial Arts', 'Military', 'Parody', 'Police', 'Samurai', 'Space', 'Super Power', 'Vampire', 'Game'];

export const getUniqueGenres = async (): Promise<string[]> => {
  return staticAvailableGenres.sort();
};