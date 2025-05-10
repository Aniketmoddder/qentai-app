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
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';

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

export const addAnimeToFirestore = async (animeData: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const animeDocRef = doc(animesCollection); 
    
    const newAnimeDataForDb = { 
      ...animeData,
      episodes: animeData.episodes || [], 
      tmdbId: animeData.tmdbId,
      isFeatured: animeData.isFeatured || false, 
      trailerUrl: (animeData.trailerUrl === '' || animeData.trailerUrl === undefined || animeData.trailerUrl === null) ? null : animeData.trailerUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(), 
      id: animeDocRef.id 
    };

    const cleanedAnimeData: { [key: string]: any } = { ...newAnimeDataForDb };
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
      return convertAnimeTimestampsForClient({ id: docSnap.id, ...docSnap.data() }) as Anime;
    }
    return undefined;
  } catch (error) {
    throw handleFirestoreError(error, `getAnimeById (id: ${id})`);
  }
};

export const getAllAnimes = async (
  count: number = 20,
  filters: {
    type?: Anime['type'];
    genre?: string;
    sortBy?: 'averageRating' | 'year' | 'title' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    featured?: boolean;
  } = {}
): Promise<Anime[]> => {
  try {
    const queryConstraints: QueryConstraint[] = [];

    if (filters.type) {
      queryConstraints.push(where('type', '==', filters.type));
    }
    if (filters.genre) {
      queryConstraints.push(where('genre', 'array-contains', filters.genre));
    }
     if (typeof filters.featured === 'boolean') { 
       queryConstraints.push(where('isFeatured', '==', filters.featured));
    }

    if (filters.sortBy) {
      // If a sort order is explicitly requested, apply it.
      // This assumes the user has created the necessary composite index.
      queryConstraints.push(orderBy(filters.sortBy, filters.sortOrder || 'desc'));
    } else {
      // If NO explicit sort is given:
      if (filters.type || filters.genre || (typeof filters.featured === 'boolean' && filters.featured)) {
        // If filtering by type, genre, or featured=true, and NO explicit sort is given,
        // DO NOT add a default orderBy clause. Firestore's default ordering will be used.
        // This avoids requiring specific composite indexes for simple filtered views.
        // The user must explicitly pass `sortBy` if they want specific ordering with these filters
        // and have created the corresponding index.
      } else {
        // General fallback for a generic "all animes" list (no major filters, no explicit sort)
        // Default to ordering by 'updatedAt'.
        queryConstraints.push(orderBy('updatedAt', filters.sortOrder || 'desc'));
      }
    }
    
    if (count > 0) {
        queryConstraints.push(limit(count));
    } else if (count === 0) { 
        // Allow fetching all documents if count is 0, up to Firestore limits or a reasonable cap
        // For very large collections, consider pagination or higher limits if truly needed.
        // Defaulting to a high limit like 1000.
        queryConstraints.push(limit(1000)); 
    }
    // If count is negative or not specified in a way that implies "all", it defaults to 20.
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient({ id: doc.id, ...doc.data() }) as Anime);
    return animes;

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      let warningMessage = `Firestore query in getAllAnimes requires an index. Please create the required composite index in your Firebase console. The error message usually provides a link. Filters: ${JSON.stringify(filters)}. Original error: ${error.message}`;
      console.warn(warningMessage, "Firestore will often provide a direct link in the error to create the missing index.");
    }
    throw handleFirestoreError(error, 'getAllAnimes with filters: ' + JSON.stringify(filters));
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const searchTermLower = searchTerm.toLowerCase();
    // Fetch a larger set for client-side filtering, but be mindful of read costs.
    // Sorting by title might help make client-side search feel more natural if initial set is large.
    // However, this requires (title ASC) index. If it's not present, remove orderBy('title').
    const allAnime = await getAllAnimes(200); // Removed default sort by title
    
    return allAnime.filter(anime => 
      anime.title.toLowerCase().includes(searchTermLower) ||
      (anime.genre && anime.genre.some(g => g.toLowerCase().includes(searchTermLower))) ||
      (anime.year && anime.year.toString().includes(searchTermLower))
    ).slice(0, 50); // Limit results after client-side filtering
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
  }
};

export const getAnimesByType = async (type: Anime['type'], count: number = 20): Promise<Anime[]> => {
  try {
    // Basic query: filter by type, order by title (requires 'type' and 'title' composite index)
    // If index (type ASC, title ASC) doesn't exist, remove orderBy('title', 'asc')
    const q = query(animesCollection, where('type', '==', type), orderBy('title', 'asc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient({ id: doc.id, ...doc.data() }) as Anime);
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Missing Firestore index for getAnimesByType (type: ${type}). The query likely requires a composite index on 'type' and 'title' (asc). Please create it in Firebase console, or remove the orderBy('title') clause from this function if title sorting isn't critical here and the index is not present.`);
    }
    throw handleFirestoreError(error, `getAnimesByType (type: ${type})`);
  }
};

export const getAnimesByGenre = async (genre: string, count: number = 20): Promise<Anime[]> => {
  try {
    // Basic query: filter by genre, order by title (requires 'genre' (array-contains) and 'title' composite index)
    // If index (genre ASC, title ASC) doesn't exist, remove orderBy('title', 'asc')
    const q = query(animesCollection, where('genre', 'array-contains', genre), orderBy('title', 'asc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient({ id: doc.id, ...doc.data() }) as Anime);
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Missing Firestore index for getAnimesByGenre (genre: ${genre}). The query likely requires a composite index on 'genre' (array-contains) and 'title' (asc). Please create it in Firebase console, or remove the orderBy('title') clause from this function if title sorting isn't critical here and the index is not present.`);
    }
    throw handleFirestoreError(error, `getAnimesByGenre (genre: ${genre})`);
  }
};


export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Omit<Anime, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    const updatePayload: { [key: string]: any } = { ...dataToUpdate, updatedAt: serverTimestamp() };

    // Ensure trailerUrl is explicitly set to null if empty or undefined, rather than undefined
    if (updatePayload.hasOwnProperty('trailerUrl')) {
      updatePayload.trailerUrl = (updatePayload.trailerUrl === '' || updatePayload.trailerUrl === undefined || updatePayload.trailerUrl === null) ? null : updatePayload.trailerUrl;
    }
    
    // Ensure bannerImage is explicitly set to null if empty or undefined
    if (updatePayload.hasOwnProperty('bannerImage') && (updatePayload.bannerImage === '' || updatePayload.bannerImage === undefined || updatePayload.bannerImage === null) ) {
        updatePayload.bannerImage = null; // Use null for Firestore to remove the field if desired or store as null
    }
    
    // Preserve existing isFeatured value if not explicitly provided in dataToUpdate
    if (updatePayload.isFeatured === undefined) {
        const currentDoc = await getDoc(docRef);
        if (currentDoc.exists()) {
            const currentData = currentDoc.data() as Anime;
            updatePayload.isFeatured = currentData.isFeatured || false; // Default to false if not set
        } else {
            // This case should ideally not happen if we are updating an existing document
            updatePayload.isFeatured = false;
        }
    }
    
    // Remove any fields that are explicitly undefined from the payload
    // Firestore does not support storing 'undefined'
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

    const animeData = convertAnimeTimestampsForClient(animeSnap.data()) as Anime;
    let episodes = [...(animeData.episodes || [])]; 
    
    const episodeIndex = episodes.findIndex(ep => ep.id === episodeId);

    if (episodeIndex === -1) {
       console.warn(`Episode with ID ${episodeId} not found in anime ${animeId}. Cannot update.`);
       // If it's a movie and there's only one placeholder episode, update that one.
       if (animeData.type === 'Movie' && episodes.length === 1 && updatedEpisodeData.url) {
         // Allow updating the single "Full Movie" placeholder entry
         episodes[0] = { ...episodes[0], ...updatedEpisodeData }; 
       } else {
         // For TV shows or if multiple episodes exist, and the ID doesn't match, it's an issue.
         throw new Error(`Episode with ID ${episodeId} not found for update in anime ${animeId}.`);
       }
    } else {
      // If episode is found by ID, update it
      episodes[episodeIndex] = { ...episodes[episodeIndex], ...updatedEpisodeData };
    }
    
    await updateDoc(animeRef, { episodes: episodes, updatedAt: serverTimestamp() });
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
    // This function is a placeholder as season management is implicit via episode.seasonNumber
    console.log(`Placeholder/Not Implemented: Add season ${seasonNumber} (${seasonTitle}) to anime ${animeId}. Current structure has seasonNumber within each episode.`);
    // If you decide to have explicit Season objects later, implement logic here.
};

export const addEpisodeToSeason = async (animeId: string, episodeData: Episode): Promise<void> => {
    // This function would typically be used by an admin panel to add a new episode.
    // Ensure episodeData includes seasonNumber.
    try {
        const animeRef = doc(animesCollection, animeId);
        const animeSnap = await getDoc(animeRef);

        if (!animeSnap.exists()) {
            throw new Error(`Anime with ID ${animeId} not found.`);
        }
        const anime = convertAnimeTimestampsForClient(animeSnap.data()) as Anime;
        
        // Generate a unique ID for the new episode if not provided
        const newEpisodeId = episodeData.id || 
                             `${animeId}-s${episodeData.seasonNumber || 1}e${episodeData.episodeNumber}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-');

        const newEpisode: Episode = {
            ...episodeData,
            id: newEpisodeId
        };
        const updatedEpisodes = [...(anime.episodes || []), newEpisode];
        await updateDoc(animeRef, { episodes: updatedEpisodes, updatedAt: serverTimestamp() });
    } catch (error) {
        throw handleFirestoreError(error, `addEpisodeToSeason (animeId: ${animeId})`);
    }
};

// List of common genres, can be expanded.
// Used as a fallback or initial set for the genre list component if dynamic fetch fails.
const staticAvailableGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Isekai', 'Josei', 'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire', 'Game', 'Demons', 'Ecchi', 'Harem'];


export const getUniqueGenres = async (): Promise<string[]> => {
  try {
    // Fetch a sample of documents to extract genres. Limit to reduce read costs.
    // For very large datasets, consider a separate 'genres' collection maintained by a function.
    const snapshot = await getDocs(query(animesCollection, limit(500))); // Increased limit for better coverage
    const allGenres = new Set<string>();
    snapshot.docs.forEach(doc => {
      const anime = convertAnimeTimestampsForClient(doc.data()) as Anime; // Ensure timestamps are handled if present
      if (anime.genre && Array.isArray(anime.genre)) { // Check if genre is an array
        anime.genre.forEach(g => {
          if (typeof g === 'string' && g.trim() !== '') { // Ensure genre is a non-empty string
            allGenres.add(g.trim());
          }
        });
      }
    });
    // Merge with static list to ensure common genres are always available
    staticAvailableGenres.forEach(g => allGenres.add(g));
    return Array.from(allGenres).sort();
  } catch (error) {
    console.warn("Failed to dynamically fetch genres, falling back to static list with additions:", error);
    // Fallback to a predefined list combined with a static list to ensure some genres are always shown
    return [...new Set(staticAvailableGenres)].sort();
  }
};

export const updateAnimeIsFeatured = async (animeId: string, isFeatured: boolean): Promise<void> => {
  try {
    const animeRef = doc(animesCollection, animeId);
    await updateDoc(animeRef, { isFeatured, updatedAt: serverTimestamp() });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeIsFeatured (id: ${animeId})`);
  }
};

// Fetches multiple animes by their IDs. Useful for wishlists, favorites, etc.
export const getAnimesByIds = async (ids: string[]): Promise<Anime[]> => {
  if (!ids || ids.length === 0) {
    return [];
  }
  try {
    // Firestore 'in' query supports up to 30 elements in the array.
    // For more than 30 IDs, batch the requests.
    const MAX_IDS_PER_QUERY = 30; 
    const animePromises: Promise<Anime[]>[] = [];

    for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
      const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
      const q = query(animesCollection, where(documentId(), 'in', batchIds));
      animePromises.push(
        getDocs(q).then(snapshot => snapshot.docs.map(doc => convertAnimeTimestampsForClient({ id: doc.id, ...doc.data() }) as Anime))
      );
    }
    
    const results = await Promise.all(animePromises);
    return results.flat(); // Combine results from all batches
  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByIds (ids: ${ids.join(',')})`);
  }
};


// Specific function to get featured animes
export const getFeaturedAnimes = async (count: number = 5): Promise<Anime[]> => {
  try {
    // Query for featured animes, optionally ordered by title.
    // This specific query requires a composite index on (isFeatured == true, title ASC) if title ordering is used.
    // If this index is not present, remove orderBy('title', 'asc') or ensure the user creates it.
    const q = query(animesCollection, where('isFeatured', '==', true), orderBy('title', 'asc'), limit(count));
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient({ id: doc.id, ...doc.data() }) as Anime);
    return animes;
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Firestore query in getFeaturedAnimes requires an index: (isFeatured == true, title ASC). Please create it in your Firebase console. Original error: ${error.message}`);
    }
    throw handleFirestoreError(error, 'getFeaturedAnimes');
  }
};
