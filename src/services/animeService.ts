
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

// Define animesCollection at the top level
const animesCollection = collection(db, 'animes');

interface QueryFilters {
  type?: Anime['type'];
  genre?: string;
  sortBy?: 'averageRating' | 'year' | 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
}


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

export const getAllAnimes = async ({
  count = 20, 
  filters = {},
}: {
  count?: number;
  filters?: QueryFilters;
} = {}): Promise<Anime[]> => {
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
      queryConstraints.push(orderBy(filters.sortBy, filters.sortOrder || 'desc'));
    } else {
      if (filters.type || filters.genre || (typeof filters.featured === 'boolean' && filters.featured)) {
        // No default sort if specific filters are applied
      } else {
        // Default sort only if no specific filters that would require composite indexes are present
        queryConstraints.push(orderBy('updatedAt', filters.sortOrder || 'desc'));
      }
    }
    
    if (count > 0) {
      queryConstraints.push(limit(count));
    } else if (count === 0) { 
      // Allow fetching all documents if count is 0 (e.g. for admin panel or full lists)
      // Firestore limits queries to 1000 documents by default, so if more are needed, pagination would be required.
      // For simplicity, let's set a higher limit for "all" like 500. If you have more, implement pagination.
      queryConstraints.push(limit(500));
    } else {
      // Fallback to default if count is negative or not a number.
      queryConstraints.push(limit(20));
    }
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient({ id: doc.id, ...doc.data() }) as Anime);
    return animes;

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      let warningMessage = `Firestore query in getAllAnimes requires an index. Filters: ${JSON.stringify(filters)}. Original error: ${error.message}`;
      console.warn(warningMessage, "Please create the required composite index in your Firebase console. The error message usually provides a direct link.");
    }
    throw handleFirestoreError(error, 'getAllAnimes with filters: ' + JSON.stringify(filters));
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const searchTermLower = searchTerm.toLowerCase();
    // Fetching all animes for client-side search can be inefficient for large datasets.
    // Consider using a dedicated search service like Algolia or Elasticsearch for production.
    // For now, this approach will work for smaller datasets.
    const allAnime = await getAllAnimes({ count: 0 }); // count: 0 to fetch all (up to Firestore default limit)
    
    return allAnime.filter(anime => 
      anime.title.toLowerCase().includes(searchTermLower) ||
      (anime.genre && anime.genre.some(g => g.toLowerCase().includes(searchTermLower))) ||
      (anime.year && anime.year.toString().includes(searchTermLower))
    ).slice(0, 50); // Limit results on client-side after filtering
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
  }
};

export const getAnimesByType = async (type: Anime['type'], count: number = 20): Promise<Anime[]> => {
  try {
    const effectiveCount = count > 0 ? count : 20;
    // Added orderBy('title') for consistency, ensure index exists.
    const q = query(animesCollection, where('type', '==', type), orderBy('title', 'asc'), limit(effectiveCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient({ id: doc.id, ...doc.data() }) as Anime);
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Missing Firestore index for getAnimesByType (type: ${type}). The query requires a composite index on 'type' (ASC/DESC) and 'title' (ASC). Please create it in Firebase console.`);
    }
    throw handleFirestoreError(error, `getAnimesByType (type: ${type})`);
  }
};

export const getAnimesByGenre = async (genre: string, count: number = 20): Promise<Anime[]> => {
  try {
    const effectiveCount = count > 0 ? count : 20;
    // Added orderBy('title') for consistency, ensure index exists.
    const q = query(animesCollection, where('genre', 'array-contains', genre), orderBy('title', 'asc'), limit(effectiveCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient({ id: doc.id, ...doc.data() }) as Anime);
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Missing Firestore index for getAnimesByGenre (genre: ${genre}). The query requires a composite index on 'genre' (array-contains) and 'title' (ASC). Please create it in Firebase console.`);
    }
    throw handleFirestoreError(error, `getAnimesByGenre (genre: ${genre})`);
  }
};


export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Omit<Anime, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    const updatePayload: { [key: string]: any } = { ...dataToUpdate, updatedAt: serverTimestamp() };

    if (updatePayload.hasOwnProperty('trailerUrl')) {
      updatePayload.trailerUrl = (updatePayload.trailerUrl === '' || updatePayload.trailerUrl === undefined || updatePayload.trailerUrl === null) ? null : updatePayload.trailerUrl;
    }
    
    if (updatePayload.hasOwnProperty('bannerImage') && (updatePayload.bannerImage === '' || updatePayload.bannerImage === undefined || updatePayload.bannerImage === null) ) {
        updatePayload.bannerImage = null; 
    }
    
    if (updatePayload.isFeatured === undefined) {
        const currentDoc = await getDoc(docRef);
        if (currentDoc.exists()) {
            const currentData = currentDoc.data() as Anime;
            updatePayload.isFeatured = currentData.isFeatured || false; 
        } else {
            // If document doesn't exist, but we're trying to update (e.g., through an admin action),
            // default isFeatured to false or handle as an error. Here, defaulting.
            updatePayload.isFeatured = false;
        }
    }
    
    // Clean out any undefined fields to prevent Firestore errors
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
       // For Movies, there's usually one "episode" representing the full movie.
       // If it's a movie and has one episode, update that one.
       if (animeData.type === 'Movie' && episodes.length === 1 && updatedEpisodeData.url) {
         episodes[0] = { ...episodes[0], ...updatedEpisodeData }; 
       } else {
         // This scenario means the episodeId doesn't match, which shouldn't happen if UI lists existing episodes.
         // Could log or throw if it's critical, or simply not update if episode not found.
         console.warn(`Episode with ID ${episodeId} not found in anime ${animeId}. Cannot update.`);
         throw new Error(`Episode with ID ${episodeId} not found for update in anime ${animeId}.`);
       }
    } else {
      // Update the existing episode
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
    // This function might not be directly used if seasons are implicitly defined by episodes having seasonNumber.
    // If you were to manage seasons as separate entities or explicitly add "Season X" placeholders,
    // you would implement logic here, possibly updating the anime document.
    // For now, assuming episodes are added with their seasonNumber directly.
    console.log(`Placeholder/Not Implemented: Add season ${seasonNumber} (${seasonTitle}) to anime ${animeId}. Current structure has seasonNumber within each episode.`);
    // Example: if you wanted to store season titles or meta-data on the anime object itself.
    // const animeRef = doc(animesCollection, animeId);
    // await updateDoc(animeRef, { [`seasons.${seasonNumber}.title`]: seasonTitle || `Season ${seasonNumber}` });
};

export const addEpisodeToSeason = async (animeId: string, episodeData: Episode): Promise<void> => {
    // This function assumes episodes are part of an array within the main Anime document.
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
            // seasonNumber is already part of episodeData
        };
        const updatedEpisodes = [...(anime.episodes || []), newEpisode];
        await updateDoc(animeRef, { episodes: updatedEpisodes, updatedAt: serverTimestamp() });
    } catch (error) {
        throw handleFirestoreError(error, `addEpisodeToSeason (animeId: ${animeId})`);
    }
};

// Static list of common genres to ensure they appear in selectors even if no anime has them yet.
const staticAvailableGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Isekai', 'Josei', 'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire', 'Game', 'Demons', 'Ecchi', 'Harem'];


export const getUniqueGenres = async (): Promise<string[]> => {
  try {
    // Fetch a sample of documents to gather genres. Limited to 500 for performance.
    // This might not capture ALL genres if your DB is very large and diverse.
    // Consider a separate 'genres' collection or a Cloud Function to maintain this list if it's critical.
    const snapshot = await getDocs(query(animesCollection, limit(500))); 
    const allGenres = new Set<string>();
    snapshot.docs.forEach(doc => {
      const anime = convertAnimeTimestampsForClient(doc.data()) as Anime; // Use converter
      if (anime.genre && Array.isArray(anime.genre)) { // Check if genre exists and is an array
        anime.genre.forEach(g => {
          if (typeof g === 'string' && g.trim() !== '') { // Ensure genre is a non-empty string
            allGenres.add(g.trim());
          }
        });
      }
    });
    // Merge with static list to ensure common ones are always available
    staticAvailableGenres.forEach(g => allGenres.add(g));
    return Array.from(allGenres).sort();
  } catch (error) {
    console.warn("Failed to dynamically fetch genres, falling back to static list with additions:", error);
    // Fallback to a predefined list if Firestore fetch fails
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

export const getAnimesByIds = async (ids: string[]): Promise<Anime[]> => {
  if (!ids || ids.length === 0) {
    return [];
  }
  try {
    // Firestore 'in' query supports up to 30 elements in the array.
    // If `ids` can be larger, batch the requests.
    const MAX_IDS_PER_QUERY = 30; // Firestore 'in' query limit
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


// Fetch featured animes, optionally ordered by title
export const getFeaturedAnimes = async (options: { count?: number; sortByTitle?: boolean } = {}): Promise<Anime[]> => {
  const { count = 5, sortByTitle = true } = options;
  try {
    const effectiveCount = count > 0 ? count : 5;
    const queryConstraints: QueryConstraint[] = [where('isFeatured', '==', true)];

    if (sortByTitle) {
      queryConstraints.push(orderBy('title', 'asc'));
    }
    // No default sort if sortByTitle is false, to prevent needing an index on just isFeatured
    // If another sort order is needed for featured (e.g. by updatedAt), add it and ensure the index exists.
    
    queryConstraints.push(limit(effectiveCount));
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient({ id: doc.id, ...doc.data() }) as Anime);
    return animes;
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && sortByTitle) {
      console.warn(`Firestore query in getFeaturedAnimes (sorted by title) requires an index: (isFeatured == true, title ASC). Please create it in your Firebase console. Original error: ${error.message}`);
    } else if (error instanceof FirestoreError && error.code === 'failed-precondition' && !sortByTitle) {
      console.warn(`Firestore query in getFeaturedAnimes (not sorted) might still require an index on 'isFeatured' depending on your setup or if combined with other implicit sorts. Original error: ${error.message}`);
    }
    throw handleFirestoreError(error, 'getFeaturedAnimes');
  }
};
