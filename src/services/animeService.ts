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
      // Ensure the data is correctly cast to Anime after conversion
      return convertAnimeTimestampsForClient(docSnap.data() as Omit<Anime, 'id'> & { id: string }) as Anime;
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

    const sortBy = filters.sortBy;
    const sortOrder = filters.sortOrder || 'desc';

    if (sortBy) {
      queryConstraints.push(orderBy(sortBy, sortOrder));
    } else {
      // Apply a default sort only if no specific filters that require composite indexes are present
      // and no other sort order is explicitly requested.
      // This helps avoid "missing index" errors for common browse scenarios.
      if (!filters.type && !filters.genre && typeof filters.featured !== 'boolean') {
          queryConstraints.push(orderBy('updatedAt', 'desc')); // Default general sort
      } else if (filters.type && !filters.genre && typeof filters.featured !== 'boolean') {
          // If filtering by type, and no other complex filter, sort by title might be safe
          // but check Firestore console for index (type ASC/DESC, title ASC)
          // queryConstraints.push(orderBy('title', 'asc')); // Example if desired and index exists
      }
      // If more complex filters are present (e.g., genre, featured), avoid adding a default sort
      // that could easily lead to missing index errors. The user must specify sort for these or
      // rely on Firestore's default (which is not guaranteed).
    }
    
    if (count > 0) {
      queryConstraints.push(limit(count));
    } else if (count === 0 || count === -1) { // Allow -1 as a way to signify "all" for clarity, maps to 500
      queryConstraints.push(limit(500)); // Fetch up to 500 for "all"
    }
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Omit<Anime, 'id'> & { id: string }) as Anime);
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
    const allAnime = await getAllAnimes({ count: -1 }); // Fetch all for client-side search
    
    return allAnime.filter(anime => 
      anime.title.toLowerCase().includes(searchTermLower) ||
      (anime.genre && anime.genre.some(g => g.toLowerCase().includes(searchTermLower))) ||
      (anime.year && anime.year.toString().includes(searchTermLower))
    ).slice(0, 50); 
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
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
            updatePayload.isFeatured = false;
        }
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

    const animeData = convertAnimeTimestampsForClient(animeSnap.data() as Omit<Anime, 'id'> & {id:string}) as Anime;
    let episodes = [...(animeData.episodes || [])]; 
    
    const episodeIndex = episodes.findIndex(ep => ep.id === episodeId);

    if (episodeIndex === -1) {
       if (animeData.type === 'Movie' && episodes.length === 1 && updatedEpisodeData.url) {
         episodes[0] = { ...episodes[0], ...updatedEpisodeData }; 
       } else {
         console.warn(`Episode with ID ${episodeId} not found in anime ${animeId}. Cannot update.`);
         throw new Error(`Episode with ID ${episodeId} not found for update in anime ${animeId}.`);
       }
    } else {
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


export const addEpisodeToSeason = async (animeId: string, episodeData: Episode): Promise<void> => {
    try {
        const animeRef = doc(animesCollection, animeId);
        const animeSnap = await getDoc(animeRef);

        if (!animeSnap.exists()) {
            throw new Error(`Anime with ID ${animeId} not found.`);
        }
        const anime = convertAnimeTimestampsForClient(animeSnap.data() as Omit<Anime, 'id'> & {id:string}) as Anime;
        
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

const staticAvailableGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Isekai', 'Josei', 'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire', 'Game', 'Demons', 'Ecchi', 'Harem'];


export const getUniqueGenres = async (): Promise<string[]> => {
  try {
    const snapshot = await getDocs(query(animesCollection, limit(500))); 
    const allGenres = new Set<string>();
    snapshot.docs.forEach(doc => {
      const anime = convertAnimeTimestampsForClient(doc.data() as Omit<Anime, 'id'> & {id:string}) as Anime; 
      if (anime.genre && Array.isArray(anime.genre)) { 
        anime.genre.forEach(g => {
          if (typeof g === 'string' && g.trim() !== '') { 
            allGenres.add(g.trim());
          }
        });
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
    const MAX_IDS_PER_QUERY = 30; 
    const animePromises: Promise<Anime[]>[] = [];

    for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
      const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
      const q = query(animesCollection, where(documentId(), 'in', batchIds));
      animePromises.push(
        getDocs(q).then(snapshot => snapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Omit<Anime, 'id'> & { id: string }) as Anime))
      );
    }
    
    const results = await Promise.all(animePromises);
    return results.flat(); 
  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByIds (ids: ${ids.join(',')})`);
  }
};


export const getFeaturedAnimes = async (options: { count?: number; sortByTitle?: boolean } = {}): Promise<Anime[]> => {
  const { count = 5 /*, sortByTitle = true */ } = options; // sortByTitle is effectively ignored for now to prevent index error for (isFeatured == true, title ASC)
  try {
    const effectiveCount = count > 0 ? count : 5;
    const queryConstraints: QueryConstraint[] = [where('isFeatured', '==', true)];

    // To prevent the specific index error "isFeatured ASC, title ASC", we are removing the orderBy('title')
    // when isFeatured is true. The `sortByTitle` option is thus disregarded here.
    // If title-sorted featured items are required, the Firestore index (isFeatured ASC, title ASC) must be created.
    // if (sortByTitle) {
    //   queryConstraints.push(orderBy('title', 'asc'));
    // }
    // Example of alternative sort (would also need an index): queryConstraints.push(orderBy('updatedAt', 'desc'));

    queryConstraints.push(limit(effectiveCount));
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Omit<Anime, 'id'> & {id:string}) as Anime);
    return animes;
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Firestore query in getFeaturedAnimes likely requires an index. Query involved 'isFeatured == true'. Original error: ${error.message}. Sorting by title for featured items has been temporarily removed to prevent this. If you need title-sorted featured items, please create the composite index: (isFeatured ASC, title ASC) in your Firebase console.`);
    }
    throw handleFirestoreError(error, 'getFeaturedAnimes');
  }
};