
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
      isFeatured: animeData.isFeatured || false, 
      trailerUrl: animeData.trailerUrl || undefined, // Add trailerUrl
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
    let isTypeQuery = false;

    if (filters?.type) {
      queryConstraints.push(where('type', '==', filters.type));
      isTypeQuery = true;
    }
    if (filters?.genre) {
      queryConstraints.push(where('genre', 'array-contains', filters.genre));
      isGenreQuery = true;
    }
    if (filters?.featured !== undefined) { 
       queryConstraints.push(where('isFeatured', '==', filters.featured));
       isFeaturedQuery = true;
    }

    if (filters?.sortBy) {
      queryConstraints.push(orderBy(filters.sortBy, filters.sortOrder || 'desc'));
      // If sorting by a field other than the one used in a 'where' clause,
      // and also not sorting by title, Firestore might require a composite index.
      // Example: if filtering by 'isFeatured' and sorting by 'averageRating', 
      // an index on (isFeatured, averageRating) might be needed.
      // The error message from Firestore usually provides a link to create it.
      // Adding title as a secondary sort for consistency if not already the primary sort.
      if (filters.sortBy !== 'title') {
         queryConstraints.push(orderBy('title', 'asc'));
      }
    } else {
      // Default sort by title if no other specific sort is requested and no equality/array-contains filters are present
      // or if only 'isFeatured' is present (to enable a default sort for featured lists).
      if ((!isGenreQuery && !isTypeQuery)) {
        queryConstraints.push(orderBy('title', 'asc'));
      }
      // If filtering by genre or type, and no explicit sort is given,
      // avoid default sorting by title to prevent mandatory composite index errors.
      // The user can still sort via the UI if they wish, which would then trigger the above `if (filters?.sortBy)` block.
    }
    
    queryConstraints.push(limit(count));
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      let warningMessage = `Firestore query requires an index. Please create the required composite index in your Firebase console. The error message usually provides a link. Original error: ${error.message}`;
      
      // Provide more specific guidance based on active filters if possible
      if (filters?.featured && !filters.sortBy) {
        warningMessage = `The query for featured animes requires an index on ('isFeatured' [ASC/DESC], 'title' [ASC/DESC]). Check Firebase console. Original: ${error.message}`;
      } else if (filters?.genre && !filters.sortBy) {
         warningMessage = `The query for animes filtered by genre requires an index on ('genre' [CONTAINS], 'title' [ASC/DESC]). Check Firebase console. Original: ${error.message}`;
      } else if (filters?.type && !filters.sortBy) {
        warningMessage = `The query for animes filtered by type requires an index on ('type' [ASC/DESC], 'title' [ASC/DESC]). Check Firebase console. Original: ${error.message}`;
      } else if (filters?.sortBy) {
        const filterField = filters.featured ? 'isFeatured' : filters.genre ? 'genre' : filters.type ? 'type' : null;
        if (filterField) {
          warningMessage = `The query with filter on '${filterField}' and sort by '${filters.sortBy}' requires a composite index. Check Firebase console. Original: ${error.message}`;
        }
      }
      console.warn(warningMessage);
      // Consider re-throwing a more user-friendly error or handling it gracefully in the UI
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


export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Anime>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    if ('isFeatured' in dataToUpdate && dataToUpdate.isFeatured === undefined) {
       dataToUpdate.isFeatured = false;
    }
    if ('trailerUrl' in dataToUpdate && dataToUpdate.trailerUrl === '') {
        dataToUpdate.trailerUrl = undefined; // Store empty string as undefined or use FieldValue.delete()
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

const staticAvailableGenres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Romance', 'Horror', 'Mystery', 'Thriller', 'Sports', 'Supernatural', 'Mecha', 'Historical', 'Music', 'School', 'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Psychological', 'Ecchi', 'Harem', 'Demons', 'Magic', 'Martial Arts', 'Military', 'Parody', 'Police', 'Samurai', 'Space', 'Super Power', 'Vampire', 'Game'];

export const getUniqueGenres = async (): Promise<string[]> => {
  try {
    const snapshot = await getDocs(query(animesCollection, limit(500))); // Fetch a good sample
    const allGenres = new Set<string>();
    snapshot.docs.forEach(doc => {
      const anime = doc.data() as Anime;
      if (anime.genre) {
        anime.genre.forEach(g => allGenres.add(g));
      }
    });
    // Add static genres to ensure all predefined ones are available, then sort
    staticAvailableGenres.forEach(g => allGenres.add(g));
    return Array.from(allGenres).sort();
  } catch (error) {
    console.warn("Failed to dynamically fetch genres, falling back to static list with additions:", error);
    return [...new Set(staticAvailableGenres)].sort(); // Ensure static list is unique and sorted
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
