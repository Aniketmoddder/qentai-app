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
      isFeatured: animeData.isFeatured || false, // Ensure isFeatured has a default
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
    featured?: boolean;
  }
): Promise<Anime[]> => {
  try {
    const queryConstraints: QueryConstraint[] = [];
    let isFeaturedQuery = false;
    let isGenreQuery = false;

    if (filters?.type) {
      queryConstraints.push(where('type', '==', filters.type));
    }
    if (filters?.genre) {
      queryConstraints.push(where('genre', 'array-contains', filters.genre));
      isGenreQuery = true;
    }
    if (filters?.featured) {
       queryConstraints.push(where('isFeatured', '==', true));
       isFeaturedQuery = true;
    }

    if (filters?.sortBy) {
      queryConstraints.push(orderBy(filters.sortBy, filters.sortOrder || 'desc'));
    } else {
      // Apply default sort by title only if NOT filtering by genre or featured.
      // If filtering by genre or featured and no explicit sort is given,
      // we avoid default sorting by title to prevent mandatory composite index errors.
      // The user can still explicitly request sorting on these filtered views.
      if (!isGenreQuery && !isFeaturedQuery) {
        queryConstraints.push(orderBy('title', 'asc'));
      }
      // If isFeaturedQuery is true (and no sortBy), results will be returned without a specific order
      // (likely by document ID), thus avoiding the need for the (isFeatured ASC, title ASC) index.
      // Same logic applies for isGenreQuery.
    }
    
    queryConstraints.push(limit(count));
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      let warningMessage = `Firestore query requires an index. Please create the required composite index in your Firebase console. The error message usually provides a link to create it. Original error: ${error.message}`;
      
      if (isFeaturedQuery && !filters?.sortBy) {
        warningMessage = `The query for featured animes (currently unsorted by default to avoid errors) would typically require a composite index if you want to sort by title. If you need title sorting for featured items, please create an index in Firestore on the 'animes' collection with fields: 'isFeatured' (Ascending) and 'title' (Ascending). The Firebase console error message might provide a direct link. Original error: ${error.message}`;
      } else if (isGenreQuery && !filters?.sortBy) {
        warningMessage = `The query for animes filtered by genre (currently unsorted by default) would typically require a composite index if you want to sort by title. For title sorting on genre-filtered views, create an index in Firestore on the 'animes' collection with fields: 'genre' (Array-Contains) and 'title' (Ascending). Original error: ${error.message}`;
      }
      console.warn(warningMessage);
    }
    throw handleFirestoreError(error, 'getAllAnimes');
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const searchTermLower = searchTerm.toLowerCase();
    
    // Fetch a larger set for local filtering. Consider more advanced search if performance degrades.
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
    // Avoid default title sort here as well if it causes index issues without explicit request
    const q = query(animesCollection, where('genre', 'array-contains', genre), limit(count));
    // If title sort is desired here and causes index errors, add orderBy('title','asc') and ensure composite index exists
    // e.g., query(animesCollection, where('genre', 'array-contains', genre), orderBy('title', 'asc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn(
        `Firestore query in getAnimesByGenre for genre '${genre}' might require an index if sorted (e.g., by title). Currently unsorted to avoid errors. If sorting is needed, create the composite index. Original error: ${error.message}`
      );
    }
    throw handleFirestoreError(error, `getAnimesByGenre (genre: ${genre})`);
  }
};


export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Anime>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    // Ensure 'isFeatured' is explicitly set if it's part of the update, or it might be removed
    if (dataToUpdate.isFeatured === undefined && 'isFeatured' in dataToUpdate) {
        // If isFeatured is intentionally being set to undefined/null by the form,
        // it might be better to explicitly set it to false.
        // Or, if it's just not part of this particular update, don't include it.
        // For now, let's assume if it's in dataToUpdate, it's intentional.
    }
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
       // Check if it's a movie - movies might have a generic episode ID like 'animeId-movie'
       if (animeData.type === 'Movie' && episodes.length === 1 && updatedEpisodeData.url) {
         episodes[0] = { ...episodes[0], ...updatedEpisodeData }; // Update the single movie entry
       } else {
         // For TV shows, if episode ID not found, perhaps it's a new episode.
         // This function is for *updating*, adding should be separate.
         // Or, the ID generation logic for episodes needs to be consistent.
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
    // This function is more complex as it implies managing seasons as separate entities or arrays.
    // For now, episodes directly contain seasonNumber. If seasons become top-level arrays, this needs rework.
    console.log(`Placeholder/Not Implemented: Add season ${seasonNumber} (${seasonTitle}) to anime ${animeId}. Current structure has seasonNumber within each episode.`);
    // To implement properly, you might:
    // 1. Fetch the anime document.
    // 2. Check if a 'seasons' array exists.
    // 3. Add a new season object to this array.
    // 4. Update the anime document.
    // This would be a significant schema change from how episodes are currently handled.
};

export const addEpisodeToSeason = async (animeId: string, episodeData: Episode): Promise<void> => {
    try {
        const animeRef = doc(animesCollection, animeId);
        const animeSnap = await getDoc(animeRef);

        if (!animeSnap.exists()) {
            throw new Error(`Anime with ID ${animeId} not found.`);
        }
        const anime = animeSnap.data() as Anime;
        
        // Ensure consistent ID generation for new episodes
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

// This list should ideally be dynamic or configurable if genres change often.
// For now, a static list is used as per previous structure.
const staticAvailableGenres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Romance', 'Horror', 'Mystery', 'Thriller', 'Sports', 'Supernatural', 'Mecha', 'Historical', 'Music', 'School', 'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Psychological', 'Ecchi', 'Harem', 'Demons', 'Magic', 'Martial Arts', 'Military', 'Parody', 'Police', 'Samurai', 'Space', 'Super Power', 'Vampire', 'Game'];

export const getUniqueGenres = async (): Promise<string[]> => {
  // In a real application, you might want to fetch unique genres from your actual data
  // For example, by iterating over all anime documents and collecting unique genres.
  // This would be more resource-intensive.
  // For now, returning the static list.
  // Example of dynamic fetching (expensive, use with caution or aggregation):
  /*
  try {
    const snapshot = await getDocs(query(animesCollection, limit(300))); // Limit to avoid huge reads
    const allGenres = new Set<string>();
    snapshot.docs.forEach(doc => {
      const anime = doc.data() as Anime;
      if (anime.genre) {
        anime.genre.forEach(g => allGenres.add(g));
      }
    });
    return Array.from(allGenres).sort();
  } catch (error) {
    console.error("Failed to dynamically fetch genres, falling back to static list:", error);
    return staticAvailableGenres.sort();
  }
  */
  return staticAvailableGenres.sort();
};

export const updateAnimeIsFeatured = async (animeId: string, isFeatured: boolean): Promise<void> => {
  try {
    const animeRef = doc(animesCollection, animeId);
    await updateDoc(animeRef, { isFeatured });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeIsFeatured (id: ${animeId})`);
  }
};
