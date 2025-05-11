
'use server';

import { db } from '@/lib/firebase';
import type { Anime, Episode } from '@/types/anime';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';
import { slugify } from '@/lib/stringUtils';
import {
  collection,
  doc,
  addDoc,
  setDoc, // Added setDoc for creating doc with specific ID
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  FirestoreError,
  documentId,
  QueryConstraint,
  startAt,
  endAt,
  getCountFromServer
} from 'firebase/firestore';

const animesCollection = collection(db, 'animes');

const MAX_WRITES_PER_BATCH = 500;
const MAX_IDS_PER_QUERY = 30; // Firestore 'in' query limit

// Centralized error handler
const handleFirestoreError = (error: unknown, context: string): FirestoreError => {
  console.error(`Firestore Error in ${context}:`, error);
  if (error instanceof FirestoreError) {
    return error;
  }
  const genericError = new FirestoreError('unknown', `An unknown error occurred in ${context}.`);
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    (genericError as any).message = error.message; // Type assertion
  }
  return genericError;
};


export async function getAllAnimes(
  options: {
    count?: number;
    filters?: {
      genre?: string;
      type?: Anime['type'];
      status?: Anime['status'];
      year?: number;
      featured?: boolean;
      sortBy?: 'title' | 'year' | 'averageRating' | 'updatedAt' | 'createdAt' | 'popularity';
      sortOrder?: 'asc' | 'desc';
      searchQuery?: string;
    };
  } = {}
): Promise<Anime[]> {
  const { count = 20, filters = {} } = options;
  const queryConstraints: QueryConstraint[] = [];

  if (filters.genre) {
    queryConstraints.push(where('genre', 'array-contains', filters.genre));
  }
  if (filters.type) {
    queryConstraints.push(where('type', '==', filters.type));
  }
  if (filters.status) {
    queryConstraints.push(where('status', '==', filters.status));
  }
  if (filters.year) {
    queryConstraints.push(where('year', '==', filters.year));
  }
  if (filters.featured !== undefined) {
    queryConstraints.push(where('isFeatured', '==', filters.featured));
  }
  
  // Default sort field if none is provided, to avoid issues with complex filters without orderBy
  let effectiveSortBy = filters.sortBy;
  let effectiveSortOrder = filters.sortOrder || 'desc';

  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const searchTerm = filters.searchQuery.trim();
    // For basic prefix search, an orderBy on title is usually needed
    // If sortBy is also title, this is fine. If sortBy is different, this might conflict or require specific indexes.
    // Keeping it simple: if searchQuery, prioritize title sort.
    queryConstraints.push(orderBy('title'));
    queryConstraints.push(startAt(searchTerm));
    queryConstraints.push(endAt(searchTerm + '\uf8ff'));
    // No other orderBy if searchQuery is present to simplify index needs for search
    effectiveSortBy = undefined; 
  } else if (effectiveSortBy) {
    queryConstraints.push(orderBy(effectiveSortBy, effectiveSortOrder));
  } else {
    // Fallback default sort if no specific sort or search. Helps with basic queries.
    queryConstraints.push(orderBy('updatedAt', 'desc')); 
  }


  if (count > 0) {
    queryConstraints.push(limit(count));
  }
  
  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime);
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
        console.warn(`Firestore query in getAllAnimes requires an index. Details: ${error.message} Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}, SortOrder: ${effectiveSortOrder}`);
        try {
            console.warn("Attempting fallback query for getAllAnimes (minimal filters, orderBy title, limit)");
            const fallbackConstraints: QueryConstraint[] = [orderBy('title', 'asc')];
            if (filters.featured !== undefined) { 
                fallbackConstraints.unshift(where('isFeatured', '==', filters.featured));
            }
            if (filters.type) {
                fallbackConstraints.unshift(where('type', '==', filters.type));
            }
             if (filters.genre) {
                fallbackConstraints.unshift(where('genre', 'array-contains', filters.genre));
            }
            if(count > 0) fallbackConstraints.push(limit(count));

            const fallbackQuery = query(animesCollection, ...fallbackConstraints.slice(0,3)); // Limit complexity
            const fallbackSnapshot = await getDocs(fallbackQuery);
            return fallbackSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime);
        } catch (fallbackError) {
            console.error("Fallback query for getAllAnimes also failed:", fallbackError);
             throw handleFirestoreError(fallbackError, `getAllAnimes (fallback query) - Filters: ${JSON.stringify(filters)}`);
        }
    }
    throw handleFirestoreError(error, `getAllAnimes - Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}`);
  }
}


export async function getFeaturedAnimes(
  options: {
    count?: number;
    filters?: {
      sortBy?: 'updatedAt' | 'popularity' | 'title';
      sortOrder?: 'asc' | 'desc';
    };
  } = {}
): Promise<Anime[]> {
  const { count = 5, filters = {} } = options;
  const isSortingByPopularity = filters.sortBy === 'popularity';
  
  // If sorting by popularity, fetch more items sorted by a simpler field (e.g., updatedAt)
  // and then sort by popularity in code. This helps avoid complex index for isFeatured + popularity.
  const fetchLimit = isSortingByPopularity ? Math.max(25, count * 3) : (count > 0 ? count : 5); // Fetch more for client-side sort
  
  // Determine the field to sort by in Firestore. Default to 'updatedAt' for simplicity if sorting by popularity client-side.
  const firestoreSortBy = isSortingByPopularity ? 'updatedAt' : (filters.sortBy || 'updatedAt');
  const firestoreSortOrder = filters.sortOrder || 'desc';

  const queryConstraints: QueryConstraint[] = [
    where('isFeatured', '==', true),
    orderBy(firestoreSortBy, firestoreSortOrder)
  ];
  
  if (fetchLimit > 0) {
    queryConstraints.push(limit(fetchLimit));
  }
  
  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    let animes = querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime);

    if (isSortingByPopularity) {
      // Sort by popularity in application code
      animes.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      // Then take the top 'count' results
      if (count > 0) {
        animes = animes.slice(0, count);
      }
    }
    
    return animes;

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
      console.warn(`Firestore query in getFeaturedAnimes (primary with sort by ${firestoreSortBy}) requires an index. Details: ${error.message}`);
      try {
        console.warn(`Attempting basic fallback for getFeaturedAnimes (isFeatured == true, no specific sort, limit ${count > 0 ? count : 5}).`);
        const fallbackQueryConstraints = [where('isFeatured', '==', true)];
        if (count > 0) {
            fallbackQueryConstraints.push(limit(count));
        } else {
            fallbackQueryConstraints.push(limit(5)); // Ensure a limit for safety
        }
        // Add a very basic order to the fallback to ensure it has one if needed by Firestore implicitly
        fallbackQueryConstraints.push(orderBy('title', 'asc'));


        const fallbackQuery = query(animesCollection, ...fallbackQueryConstraints);
        const fallbackSnapshot = await getDocs(fallbackQuery);
        let fallbackAnimes = fallbackSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime);

        // If the original intent was to sort by popularity, and we had to fallback, apply client-side sort here too
        if (isSortingByPopularity) {
            fallbackAnimes.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            if (count > 0) {
                 fallbackAnimes = fallbackAnimes.slice(0, count);
            }
        }
        return fallbackAnimes;

      } catch (fallbackError) {
        console.error("Basic fallback query for getFeaturedAnimes also failed:", fallbackError);
        throw handleFirestoreError(fallbackError, 'getFeaturedAnimes (basic fallback query failed)');
      }
    }
    // For other types of errors, or if the primary error was not index-related but still a FirestoreError
    throw handleFirestoreError(error, `getFeaturedAnimes (primary query with sortBy: ${firestoreSortBy})`);
  }
}


export async function getAnimeById(id: string): Promise<Anime | undefined> {
  if (!id) {
    console.warn("getAnimeById called with no ID");
    return undefined;
  }
  const docRef = doc(animesCollection, id);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime;
    }
    console.warn(`Anime with ID ${id} not found.`);
    return undefined;
  } catch (error) {
    throw handleFirestoreError(error, `getAnimeById (id: ${id})`);
  }
}

export async function getAnimesByIds(ids: string[]): Promise<Anime[]> {
  if (!ids || ids.length === 0) {
    return [];
  }
  const results: Anime[] = [];
  
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
    const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
    if (batchIds.length === 0) continue;

    const q = query(animesCollection, where(documentId(), 'in', batchIds));
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        results.push(convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime);
      });
    } catch (error) {
      console.error(`Error fetching batch of animes by IDs (batch starting with ${batchIds[0]}):`, error);
    }
  }
  return results;
}


export async function addAnimeToFirestore(animeData: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const slug = slugify(animeData.title);
  const docRef = doc(animesCollection, slug);

  try {
    const docSnap = await getDoc(docRef);
    const dataToSave = {
      ...animeData,
      trailerUrl: animeData.trailerUrl || null, // Ensure undefined becomes null
      bannerImage: animeData.bannerImage || null, // Ensure undefined becomes null
      averageRating: animeData.averageRating === undefined ? null : animeData.averageRating,
      updatedAt: serverTimestamp(),
    };

    if (docSnap.exists()) {
      // Document with this slug already exists. Update it.
      // This behavior might need adjustment based on desired outcome for duplicates (e.g., error or create unique slug)
      console.warn(`Anime with slug "${slug}" already exists. Updating existing document.`);
      await updateDoc(docRef, dataToSave);
      return slug;
    } else {
      // Document does not exist, create it with the slug as ID
      await setDoc(docRef, { 
        ...dataToSave, 
        id: slug, 
        createdAt: serverTimestamp(),
      });
      return slug;
    }
  } catch (error) {
    throw handleFirestoreError(error, `addAnimeToFirestore (title: ${animeData.title})`);
  }
}

export async function updateAnimeInFirestore(id: string, animeData: Partial<Omit<Anime, 'id' | 'episodes' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  if (!id) {
    throw new Error("Anime ID is required for update.");
  }
  const docRef = doc(animesCollection, id);
  try {
    const updatePayload: any = { ...animeData, updatedAt: serverTimestamp() };
    
    if (updatePayload.hasOwnProperty('trailerUrl')) {
      updatePayload.trailerUrl = updatePayload.trailerUrl || null;
    }
    if (updatePayload.hasOwnProperty('bannerImage')) {
      updatePayload.bannerImage = updatePayload.bannerImage || null;
    }
     if (updatePayload.hasOwnProperty('aniListId')) {
      updatePayload.aniListId = updatePayload.aniListId || null;
    }
    if (updatePayload.hasOwnProperty('averageRating') && updatePayload.averageRating === undefined) {
      updatePayload.averageRating = null;
    }


    await updateDoc(docRef, updatePayload);
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeInFirestore (id: ${id})`);
  }
}


export async function deleteAnimeFromFirestore(id: string): Promise<void> {
  const docRef = doc(animesCollection, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    throw handleFirestoreError(error, `deleteAnimeFromFirestore (id: ${id})`);
  }
}

export async function updateAnimeEpisode(animeId: string, episodeId: string, episodeData: Partial<Episode>): Promise<void> {
  const animeRef = doc(animesCollection, animeId);
  try {
    const animeSnap = await getDoc(animeRef);
    if (!animeSnap.exists()) {
      throw new Error(`Anime with ID ${animeId} not found.`);
    }
    const anime = animeSnap.data() as Anime;
    const episodes = anime.episodes ? [...anime.episodes] : [];
    const episodeIndex = episodes.findIndex(ep => ep.id === episodeId);

    if (episodeIndex === -1) {
      throw new Error(`Episode with ID ${episodeId} not found in anime ${animeId}.`);
    }
    
    episodes[episodeIndex] = { 
      ...episodes[episodeIndex], 
      ...episodeData,
      url: episodeData.url || undefined, // Ensure empty string becomes undefined for DB
      thumbnail: episodeData.thumbnail || undefined,
    };

    await updateDoc(animeRef, { episodes: episodes, updatedAt: serverTimestamp() });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeEpisode (animeId: ${animeId}, episodeId: ${episodeId})`);
  }
}

export async function updateAnimeIsFeatured(animeId: string, isFeatured: boolean): Promise<void> {
  const animeRef = doc(animesCollection, animeId);
  try {
    await updateDoc(animeRef, { isFeatured: isFeatured, updatedAt: serverTimestamp() });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeIsFeatured (animeId: ${animeId})`);
  }
}

export async function getUniqueGenres(): Promise<string[]> {
  try {
    // Efficiently get genres: fetch only the 'genre' field if possible, or process after full fetch.
    // For simplicity with current structure, we fetch all and process.
    // Consider a separate 'genres' collection or aggregation for very large datasets.
    const querySnapshot = await getDocs(query(animesCollection, limit(500))); // Limit to avoid excessive reads if not needed
    const genresSet = new Set<string>();
    querySnapshot.forEach(docSnap => {
      const anime = docSnap.data() as Anime;
      if (anime.genre && Array.isArray(anime.genre)) {
        anime.genre.forEach(g => genresSet.add(g));
      }
    });
    return Array.from(genresSet).sort();
  } catch (error) {
    throw handleFirestoreError(error, 'getUniqueGenres');
  }
}

export async function searchAnimes(searchTerm: string, count: number = 20): Promise<Anime[]> {
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  try {
    // This is a simplified search. For production, consider Algolia or Elasticsearch.
    // Attempt to query by title prefix first.
    const titleQueryConstraints: QueryConstraint[] = [
        orderBy('title'),
        startAt(searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase()), // Case-insensitive start
        endAt(searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase() + '\uf8ff'),
        limit(count * 2) // Fetch more to filter genres later
    ];
    const titleQuery = query(animesCollection, ...titleQueryConstraints);
    const titleSnapshot = await getDocs(titleQuery);
    let results = titleSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime);

    // Filter further by title and genre client-side
    results = results.filter(anime => 
      anime.title.toLowerCase().includes(lowerSearchTerm) ||
      anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
    );

    // If results are still too few, try a broader approach if necessary (e.g. querying where genre array-contains)
    // For now, this basic approach is kept.

    // Simple relevance: prioritize exact title matches or starting matches
    results.sort((a, b) => {
        const aTitleLower = a.title.toLowerCase();
        const bTitleLower = b.title.toLowerCase();
        const aStartsWith = aTitleLower.startsWith(lowerSearchTerm);
        const bStartsWith = bTitleLower.startsWith(lowerSearchTerm);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        return aTitleLower.localeCompare(bTitleLower);
    });

    return results.slice(0, count);

  } catch (error) {
    // If the title prefix query fails (e.g., needs an index not present for some reason),
    // try a broader fetch and filter.
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn("Search by title prefix failed, attempting broader search for:", searchTerm, error.message);
        try {
            const allAnimes = await getAllAnimes({ count: 100 }); // Fetch a larger general set
            let filtered = allAnimes.filter(anime => 
                anime.title.toLowerCase().includes(lowerSearchTerm) ||
                anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
            );
            filtered.sort((a, b) => { /* same sort logic as above */ 
                const aTitleLower = a.title.toLowerCase();
                const bTitleLower = b.title.toLowerCase();
                if (aTitleLower.startsWith(lowerSearchTerm) && !bTitleLower.startsWith(lowerSearchTerm)) return -1;
                if (!aTitleLower.startsWith(lowerSearchTerm) && bTitleLower.startsWith(lowerSearchTerm)) return 1;
                return aTitleLower.localeCompare(bTitleLower);
            });
            return filtered.slice(0, count);
        } catch (broadSearchError) {
             throw handleFirestoreError(broadSearchError, `searchAnimes (broad fallback for term: ${searchTerm})`);
        }
    }
    throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
  }
}


export async function getTotalAnimeCount(): Promise<number> {
  try {
    const snapshot = await getCountFromServer(animesCollection);
    return snapshot.data().count;
  } catch (error) {
    throw handleFirestoreError(error, 'getTotalAnimeCount');
  }
}
   
