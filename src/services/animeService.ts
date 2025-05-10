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

const convertAnimeTimestamps = (animeData: any): Anime => {
  const data = { ...animeData };
  if (data.createdAt && data.createdAt instanceof Timestamp) {
    data.createdAt = data.createdAt.toDate().toISOString();
  } else if (typeof data.createdAt === 'object' && data.createdAt && 'seconds' in data.createdAt && 'nanoseconds' in data.createdAt) {
    data.createdAt = new Timestamp(data.createdAt.seconds, data.createdAt.nanoseconds).toDate().toISOString();
  } else if (typeof data.createdAt === 'string') {
    // Assume it's already an ISO string
  } else if (data.createdAt) {
    console.warn("Unexpected createdAt format, attempting conversion:", data.createdAt);
    try {
      data.createdAt = new Date(data.createdAt).toISOString();
    } catch (e) { console.error("Failed to convert createdAt", e); }
  }


  if (data.updatedAt && data.updatedAt instanceof Timestamp) {
    data.updatedAt = data.updatedAt.toDate().toISOString();
  } else if (typeof data.updatedAt === 'object' && data.updatedAt && 'seconds' in data.updatedAt && 'nanoseconds' in data.updatedAt) {
     data.updatedAt = new Timestamp(data.updatedAt.seconds, data.updatedAt.nanoseconds).toDate().toISOString();
  } else if (typeof data.updatedAt === 'string') {
    // Assume it's already an ISO string
  } else if (data.updatedAt) {
    console.warn("Unexpected updatedAt format, attempting conversion:", data.updatedAt);
     try {
      data.updatedAt = new Date(data.updatedAt).toISOString();
    } catch (e) { console.error("Failed to convert updatedAt", e); }
  }
  
  if (data.episodes && Array.isArray(data.episodes)) {
    data.episodes = data.episodes.map((ep: any) => {
      const episode = { ...ep };
      if (episode.airDate && episode.airDate instanceof Timestamp) {
        episode.airDate = episode.airDate.toDate().toISOString().split('T')[0];
      } else if (typeof episode.airDate === 'object' && episode.airDate && 'seconds' in episode.airDate && 'nanoseconds' in episode.airDate) {
        episode.airDate = new Timestamp(episode.airDate.seconds, episode.airDate.nanoseconds).toDate().toISOString().split('T')[0];
      }
      return episode;
    });
  }
  return data as Anime;
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
      updatedAt: serverTimestamp(), // Also set updatedAt on creation
      id: animeDocRef.id // Add the ID to the document data as well
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
      return convertAnimeTimestamps({ id: docSnap.id, ...docSnap.data() });
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

    // Apply filters
    if (filters.type) {
      queryConstraints.push(where('type', '==', filters.type));
    }
    if (filters.genre) {
      queryConstraints.push(where('genre', 'array-contains', filters.genre));
    }
    if (typeof filters.featured === 'boolean') {
       queryConstraints.push(where('isFeatured', '==', filters.featured));
    }

    // Apply sorting
    if (filters.sortBy) {
      queryConstraints.push(orderBy(filters.sortBy, filters.sortOrder || 'desc'));
    } else {
      // Default sorting logic if no filters.sortBy is provided
      if (filters.featured === true) {
        // For featured items, if no explicit sortBy is provided,
        // DO NOT add a default orderBy clause like 'title'. Firestore will use its natural order.
        // This is the safest way to avoid the (isFeatured, title) composite index error.
        // If a specific order is desired (e.g., by 'updatedAt'), pass it via filters.sortBy.
        // Example: queryConstraints.push(orderBy('updatedAt', 'desc'));
      } else if (filters.featured === false) {
        // For items explicitly *not* featured, and no specific sortBy.
        // Default to ordering by 'createdAt' to show newest non-featured first.
        queryConstraints.push(orderBy('createdAt', 'desc'));
      } else if (!filters.type && !filters.genre && typeof filters.featured === 'undefined') {
        // Default sort for general browsing (no specific filters like type, genre, or featured status applied, and no sortBy)
        queryConstraints.push(orderBy('createdAt', 'desc'));
      }
      // If other filters (like type or genre) are applied without a sortBy,
      // and 'featured' is not specified (true or false), no default sort is added here.
      // Firestore will use its default ordering or any available single-field indexes.
    }
    
    queryConstraints.push(limit(count));
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => convertAnimeTimestamps({ id: doc.id, ...doc.data() }));
    return animes;

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      let warningMessage = `Firestore query requires an index. Please create the required composite index in your Firebase console. The error message usually provides a link. Filters: ${JSON.stringify(filters)}. Original error: ${error.message}`;
      console.warn(warningMessage, "Firestore will often provide a direct link in the error to create the missing index.");
    }
    throw handleFirestoreError(error, 'getAllAnimes with filters: ' + JSON.stringify(filters));
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const searchTermLower = searchTerm.toLowerCase();
    // Fetch a larger set for client-side filtering if a direct indexed search isn't feasible/set up.
    // This is not ideal for very large datasets. Consider Algolia or specialized search for production.
    const allAnime = await getAllAnimes(200); 
    
    return allAnime.filter(anime => 
      anime.title.toLowerCase().includes(searchTermLower) ||
      (anime.genre && anime.genre.some(g => g.toLowerCase().includes(searchTermLower))) ||
      (anime.year && anime.year.toString().includes(searchTermLower))
    ).slice(0, 50); // Limit results after filtering
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
  }
};

export const getAnimesByType = async (type: Anime['type'], count: number = 20): Promise<Anime[]> => {
  try {
    const q = query(animesCollection, where('type', '==', type), orderBy('title', 'asc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestamps({ id: doc.id, ...doc.data() }));
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Missing Firestore index for getAnimesByType (type: ${type}). The query likely requires a composite index on 'type' and 'title'. Please create it in Firebase console.`);
    }
    throw handleFirestoreError(error, `getAnimesByType (type: ${type})`);
  }
};

export const getAnimesByGenre = async (genre: string, count: number = 20): Promise<Anime[]> => {
  try {
    // Note: Firestore array-contains queries cannot be combined with range/inequality filters on other fields
    // or multiple orderBy clauses on different fields without specific composite indexes.
    // Defaulting to sort by title after filtering by genre.
    const q = query(animesCollection, where('genre', 'array-contains', genre), orderBy('title', 'asc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestamps({ id: doc.id, ...doc.data() }));
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Missing Firestore index for getAnimesByGenre (genre: ${genre}). The query likely requires a composite index on 'genre' (array-contains) and 'title' (asc). Please create it in Firebase console.`);
    }
    throw handleFirestoreError(error, `getAnimesByGenre (genre: ${genre})`);
  }
};


export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    const updatePayload: { [key: string]: any } = { ...dataToUpdate, updatedAt: serverTimestamp() };

    if (updatePayload.hasOwnProperty('trailerUrl')) {
      updatePayload.trailerUrl = (updatePayload.trailerUrl === '' || updatePayload.trailerUrl === undefined) ? null : updatePayload.trailerUrl; 
    }
    
    // Ensure isFeatured is explicitly set to false if not provided or undefined
    if (!updatePayload.hasOwnProperty('isFeatured') || typeof updatePayload.isFeatured !== 'boolean') {
        updatePayload.isFeatured = false;
    }
    
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined) {
        // Firestore doesn't allow 'undefined' values. Convert to 'null' or delete.
        // For optional fields, deleting might be better if 'null' has a specific meaning.
        // Here, setting to null if it was meant to be removed, or deleting if it was truly undefined.
        // For this case, let's assume undefined means it should be removed if already null, or kept if has value.
        // A safer bet is to just delete it to avoid unintended nulls.
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
    let episodes = [...(animeData.episodes || [])]; // Create a mutable copy
    
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
        await updateDoc(animeRef, { episodes: updatedEpisodes, updatedAt: serverTimestamp() });
    } catch (error) {
        throw handleFirestoreError(error, `addEpisodeToSeason (animeId: ${animeId})`);
    }
};

const staticAvailableGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Isekai', 'Josei', 'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire', 'Game', 'Demons', 'Ecchi', 'Harem'];


export const getUniqueGenres = async (): Promise<string[]> => {
  try {
    // Fetch a limited number of documents to extract genres.
    // For very large collections, consider a separate 'genres' collection or aggregate.
    const snapshot = await getDocs(query(animesCollection, limit(500))); 
    const allGenres = new Set<string>();
    snapshot.docs.forEach(doc => {
      const anime = doc.data() as Anime;
      if (anime.genre && Array.isArray(anime.genre)) { // Ensure genre is an array
        anime.genre.forEach(g => {
          if (typeof g === 'string' && g.trim() !== '') { // Ensure genre is a non-empty string
            allGenres.add(g.trim());
          }
        });
      }
    });
    // Add static genres to ensure they are always available, even if no anime currently has them
    staticAvailableGenres.forEach(g => allGenres.add(g));
    return Array.from(allGenres).sort();
  } catch (error) {
    console.warn("Failed to dynamically fetch genres, falling back to static list with additions:", error);
    // Fallback to only static genres if fetch fails
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
    const MAX_IDS_PER_QUERY = 30; // Firestore 'in' query limit
    const animePromises: Promise<Anime[]>[] = [];

    for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
      const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
      const q = query(animesCollection, where(documentId(), 'in', batchIds));
      animePromises.push(
        getDocs(q).then(snapshot => snapshot.docs.map(doc => convertAnimeTimestamps({ id: doc.id, ...doc.data() })))
      );
    }
    
    const results = await Promise.all(animePromises);
    return results.flat();
  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByIds (ids: ${ids.join(',')})`);
  }
};

export const getFeaturedAnimes = async (count: number = 5, otherFilters: Pick<Parameters<typeof getAllAnimes>[1], 'sortBy' | 'sortOrder'> = {}): Promise<Anime[]> => {
  return getAllAnimes(count, { featured: true, ...otherFilters });
};