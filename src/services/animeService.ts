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
    
    const newAnimeData: Omit<Anime, 'id'> & { id: string } = {
      ...animeData,
      id: animeDocRef.id, 
      episodes: animeData.episodes || [], 
      tmdbId: animeData.tmdbId,
      isFeatured: animeData.isFeatured || false, 
      trailerUrl: (animeData.trailerUrl === '' || animeData.trailerUrl === undefined) ? null : animeData.trailerUrl,
    };

    const cleanedAnimeData: { [key: string]: any } = { ...newAnimeData };
    Object.keys(cleanedAnimeData).forEach(key => {
      if (cleanedAnimeData[key] === undefined) {
        delete cleanedAnimeData[key];
      }
    });

    await setDoc(animeDocRef, cleanedAnimeData);
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
    featured?: boolean;
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
    if (filters?.featured !== undefined) { 
       queryConstraints.push(where('isFeatured', '==', filters.featured));
    }

    // Sorting logic
    if (filters?.sortBy) {
      // User explicitly specified a sort
      queryConstraints.push(orderBy(filters.sortBy, filters.sortOrder || 'desc'));
      // Add secondary sort by title ONLY if primary sort is not title AND we are NOT filtering by featured.
      // This is to avoid implicitly requiring a very complex index (isFeatured + otherSort + title) by default.
      if (filters.sortBy !== 'title' && filters.featured === undefined) {
         queryConstraints.push(orderBy('title', 'asc'));
      }
      // If filters.featured is true and filters.sortBy is 'title', this creates the (isFeatured, title) query.
      // If filters.featured is true and filters.sortBy is something else, this creates (isFeatured, otherSort) query.
      // These will require the respective composite indexes to be created in Firestore.
    } else {
      // No sortBy explicitly passed by the user.
      if (filters?.featured !== undefined) {
        // If filtering by 'featured' and NO sortBy is given,
        // DO NOT default to orderBy('title'). Let Firestore use its natural/index order for 'isFeatured'.
        // This avoids the (isFeatured, title) composite index requirement for this default case.
        // If a specific order for featured items is desired (e.g., by a rank or date), it should be passed via `sortBy`.
        // queryConstraints.push(orderBy('__name__', 'asc')); // Could be added for deterministic order by ID
      } else if (filters?.genre) {
        // If filtering by genre and no sort, default to title. Needs (genre, title) index.
        queryConstraints.push(orderBy('title', 'asc'));
      } else if (filters?.type) {
        // If filtering by type and no sort, default to title. Needs (type, title) index.
        queryConstraints.push(orderBy('title', 'asc'));
      } else {
        // Absolute default if no filters and no sort: order by title.
        queryConstraints.push(orderBy('title', 'asc'));
      }
    }
    
    queryConstraints.push(limit(count));
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
    return animes;

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      let warningMessage = `Firestore query requires an index. Please create the required composite index in your Firebase console. The error message usually provides a link. Original error: ${error.message}`;
      console.warn(warningMessage, " Firestore will often provide a direct link in the error to create the missing index.");
    }
    throw handleFirestoreError(error, 'getAllAnimes');
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const searchTermLower = searchTerm.toLowerCase();
    
    const allAnime = await getAllAnimes(200, { sortBy: 'title', sortOrder: 'asc'}); 
    
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
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn(
        `Firestore query in getAnimesByType for type '${type}' sorted by title might require an index (type ASC, title ASC). Original error: ${error.message}`
      );
    }
    throw handleFirestoreError(error, `getAnimesByType (type: ${type})`);
  }
};

export const getAnimesByGenre = async (genre: string, count: number = 20): Promise<Anime[]> => {
  try {
    const q = query(animesCollection, where('genre', 'array-contains', genre), orderBy('title', 'asc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn(
        `Firestore query in getAnimesByGenre for genre '${genre}' sorted by title might require an index (genre CONTAINS, title ASC). Original error: ${error.message}`
      );
    }
    throw handleFirestoreError(error, `getAnimesByGenre (genre: ${genre})`);
  }
};


export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Omit<Anime, 'episodes' | 'id'>>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    const updatePayload: { [key: string]: any } = { ...dataToUpdate };

    if (updatePayload.hasOwnProperty('trailerUrl')) {
      if (updatePayload.trailerUrl === '' || updatePayload.trailerUrl === undefined) {
        updatePayload.trailerUrl = null; 
      }
    }

    if (updatePayload.hasOwnProperty('isFeatured') && updatePayload.isFeatured === undefined) {
      updatePayload.isFeatured = false;
    }
    
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key]; 
      }
    });

    await updateDoc(docRef, updatePayload);
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
       if (animeData.type === 'Movie' && episodes.length === 1 && updatedEpisodeData.url) {
         episodes[0] = { ...episodes[0], ...updatedEpisodeData }; 
       } else {
         throw new Error(`Episode with ID ${episodeId} not found for update in anime ${animeId}.`);
       }
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
    console.log(`Placeholder/Not Implemented: Add season ${seasonNumber} (${seasonTitle}) to anime ${animeId}. Current structure has seasonNumber within each episode.`);
};

export const addEpisodeToSeason = async (animeId: string, episodeData: Episode): Promise<void> => {
    try {
        const animeRef = doc(animesCollection, animeId);
        const animeSnap = await getDoc(animeRef);

        if (!animeSnap.exists()) {
            throw new Error(`Anime with ID ${animeId} not found.`);
        }
        const anime = animeSnap.data() as Anime;
        
        const newEpisodeId = episodeData.id || 
                             `${animeId}-s${episodeData.seasonNumber || 1}e${episodeData.episodeNumber}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-');

        const newEpisode: Episode = {
            ...episodeData,
            id: newEpisodeId
        };
        const updatedEpisodes = [...(anime.episodes || []), newEpisode];
        await updateDoc(animeRef, { episodes: updatedEpisodes });
    } catch (error) {
        throw handleFirestoreError(error, `addEpisodeToSeason (animeId: ${animeId})`);
    }
};

const staticAvailableGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Isekai', 'Josei', 'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire', 'Game', 'Demons', 'Ecchi', 'Harem'];


export const getUniqueGenres = async (): Promise<string[]> => {
  try {
    const snapshot = await getDocs(query(animesCollection, limit(500))); 
    const allGenres = new Set<string>();
    snapshot.docs.forEach(doc => {
      const anime = doc.data() as Anime;
      if (anime.genre) {
        anime.genre.forEach(g => allGenres.add(g));
      }
    });
    staticAvailableGenres.forEach(g => allGenres.add(g));
    return Array.from(allGenres).sort();
  } catch (error) {
    console.warn("Failed to dynamically fetch genres, falling back to static list with additions:", error);
    return [...new Set(staticAvailableGenres)].sort();
  }
};

export const updateAnimeIsFeatured = async (animeId: string, isFeatured: boolean): Promise<void> => {
  try {
    const animeRef = doc(animesCollection, animeId);
    await updateDoc(animeRef, { isFeatured });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeIsFeatured (id: ${animeId})`);
  }
};
