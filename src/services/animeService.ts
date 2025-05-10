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
    
    const newAnimeData: Anime = { // Ensure 'id' is part of the type being constructed for setDoc
      ...animeData,
      id: animeDocRef.id, 
      episodes: animeData.episodes || [], 
      tmdbId: animeData.tmdbId,
      isFeatured: animeData.isFeatured || false, 
      trailerUrl: (animeData.trailerUrl === '' || animeData.trailerUrl === undefined || animeData.trailerUrl === null) ? undefined : animeData.trailerUrl,
    };

    // Firestore doesn't store undefined fields, so this cleaning might not be strictly necessary
    // but good for ensuring consistent data.
    const cleanedAnimeData: { [key: string]: any } = { ...newAnimeData };
    Object.keys(cleanedAnimeData).forEach(key => {
      if (cleanedAnimeData[key] === undefined) {
        delete cleanedAnimeData[key]; // Or set to null if preferred, depending on query needs
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
    
    const hasExplicitFilters = filters?.type || filters?.genre || (filters?.featured !== undefined);

    if (filters?.sortBy) {
      // If a sortBy is explicitly provided, use it.
      // This might still require an index if combined with other filters.
      // e.g., if filters = { featured: true, sortBy: 'title' }, it needs (isFeatured, title) index.
      queryConstraints.push(orderBy(filters.sortBy, filters.sortOrder || 'desc'));
    } else if (!hasExplicitFilters) {
      // Only default to orderBy 'title' if there are NO filters at all.
      // This makes the most basic call `getAllAnimes()` sort by title.
      queryConstraints.push(orderBy('title', 'asc'));
    }
    // If there are filters (e.g., featured: true, or type: 'Movie') but no explicit sortBy,
    // DO NOT add a default orderBy('title'). This is the key to avoiding
    // automatic requirements for composite indexes like (isFeatured, title) or (type, title).
    // The client can sort the limited results if needed, or a specific sortBy can be passed.

    queryConstraints.push(limit(count));
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
    return animes;

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      let warningMessage = `Firestore query requires an index. Please create the required composite index in your Firebase console. The error message usually provides a link. Original error: ${error.message}`;
      console.warn(warningMessage, "Firestore will often provide a direct link in the error to create the missing index.");
    }
    throw handleFirestoreError(error, 'getAllAnimes');
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const searchTermLower = searchTerm.toLowerCase();
    
    // This is a client-side search after fetching all (or a large set of) animes.
    // For very large datasets, consider server-side search with Firestore (e.g., using 3rd party like Algolia/Typesense or basic array-contains-any with limitations).
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
    const queryConstraints: QueryConstraint[] = [where('type', '==', type), limit(count)];
    // Default ordering for this specific function can be by title, or by popularity if available.
    // Adding orderBy('title') here requires an index on (type, title).
    // queryConstraints.push(orderBy('title', 'asc')); 
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByType (type: ${type})`);
  }
};

export const getAnimesByGenre = async (genre: string, count: number = 20): Promise<Anime[]> => {
  try {
     const queryConstraints: QueryConstraint[] = [where('genre', 'array-contains', genre), limit(count)];
    // Adding orderBy('title') here requires an index on (genre, title).
    // queryConstraints.push(orderBy('title', 'asc'));
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByGenre (genre: ${genre})`);
  }
};


export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Omit<Anime, 'episodes' | 'id'>>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    const updatePayload: { [key: string]: any } = { ...dataToUpdate };

    // Explicitly handle trailerUrl: set to null if empty string, otherwise use the value.
    // Firestore does not store 'undefined'. If you want to remove a field, you use deleteField() or set to null.
    if (updatePayload.hasOwnProperty('trailerUrl')) {
      updatePayload.trailerUrl = updatePayload.trailerUrl || null;
    }
    
    // Ensure isFeatured is explicitly false if not provided or undefined
    if (!updatePayload.hasOwnProperty('isFeatured') || updatePayload.isFeatured === undefined) {
        updatePayload.isFeatured = false;
    }
    
    // Remove any fields that are still undefined to prevent Firestore errors.
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
       // Handle movie case: if it's a movie and only one "episode" (the movie itself) exists, update it
       if (animeData.type === 'Movie' && episodes.length === 1 && updatedEpisodeData.url) {
         episodes[0] = { ...episodes[0], ...updatedEpisodeData }; 
       } else {
         throw new Error(`Episode with ID ${episodeId} not found for update in anime ${animeId}.`);
       }
    } else {
      // Update existing episode
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
    // This function might need a more complex implementation if seasons are stored as separate subcollections or complex objects.
    // For now, it's a placeholder as season info is embedded in episodes.
    console.log(`Placeholder/Not Implemented: Add season ${seasonNumber} (${seasonTitle}) to anime ${animeId}. Current structure has seasonNumber within each episode.`);
    // Example: Fetch anime, add a season object to an array of seasons, then updateDoc.
    // Or, if seasons are subcollections, add a new document to the seasons subcollection.
};

export const addEpisodeToSeason = async (animeId: string, episodeData: Episode): Promise<void> => {
    // This function assumes episodes are part of an array within the Anime document.
    try {
        const animeRef = doc(animesCollection, animeId);
        const animeSnap = await getDoc(animeRef);

        if (!animeSnap.exists()) {
            throw new Error(`Anime with ID ${animeId} not found.`);
        }
        const anime = animeSnap.data() as Anime;
        
        // Ensure unique episode ID if not provided
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

// Static list of genres, can be augmented by fetched genres
const staticAvailableGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Isekai', 'Josei', 'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire', 'Game', 'Demons', 'Ecchi', 'Harem'];


export const getUniqueGenres = async (): Promise<string[]> => {
  try {
    // Fetch a limited number of documents to extract genres.
    // For very large datasets, consider maintaining a separate 'genres' collection updated by a function.
    const snapshot = await getDocs(query(animesCollection, limit(500))); 
    const allGenres = new Set<string>();
    snapshot.docs.forEach(doc => {
      const anime = doc.data() as Anime;
      if (anime.genre) {
        anime.genre.forEach(g => allGenres.add(g));
      }
    });
    // Ensure static genres are also included for consistency if DB is empty or missing some
    staticAvailableGenres.forEach(g => allGenres.add(g));
    return Array.from(allGenres).sort();
  } catch (error) {
    console.warn("Failed to dynamically fetch genres, falling back to static list with additions:", error);
    // Fallback to static list if Firestore fetch fails
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

// Function to get multiple animes by their IDs (useful for favorites/wishlist)
export const getAnimesByIds = async (ids: string[]): Promise<Anime[]> => {
  if (!ids || ids.length === 0) {
    return [];
  }
  try {
    // Firestore 'in' query limit is 30 values per query. Batch if necessary.
    const MAX_IDS_PER_QUERY = 30;
    const animePromises: Promise<Anime[]>[] = [];

    for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
      const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
      const q = query(animesCollection, where(documentId(), 'in', batchIds));
      animePromises.push(
        getDocs(q).then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime)))
      );
    }
    
    const results = await Promise.all(animePromises);
    return results.flat();
  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByIds (ids: ${ids.join(',')})`);
  }
};

export const getFeaturedAnimes = async (count: number = 5): Promise<Anime[]> => {
  try {
    // This query specifically fetches featured animes.
    // If you want them ordered, e.g., by a 'featuredAt' timestamp or 'averageRating',
    // you would add orderBy here and need the corresponding index (isFeatured, desiredOrderField).
    // For now, just fetching featured items without a specific order beyond what Firestore provides.
    const q = query(animesCollection, where('isFeatured', '==', true), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
    // If this specific query for featured items fails due to a missing index (e.g., just on `isFeatured`),
    // the error message from Firestore will guide on creating it.
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
       console.warn(`Firestore query for featured animes might require an index on 'isFeatured'. Original error: ${error.message}`);
    }
    throw handleFirestoreError(error, `getFeaturedAnimes`);
  }
};