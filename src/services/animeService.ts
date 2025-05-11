
'use server';

import { db } from '@/lib/firebase';
import type { Anime, Episode } from '@/types/anime';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';
import { slugify } from '@/lib/stringUtils';
import {
  collection,
  doc,
  addDoc,
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
      searchQuery?: string; // For basic title search within this function
    };
  } = {}
): Promise<Anime[]> {
  const { count = 20, filters = {} } = options;
  let q = query(animesCollection);
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

  // Search query for title (basic prefix match)
  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const searchTerm = filters.searchQuery.trim();
    queryConstraints.push(orderBy('title')); // Required for range comparisons
    queryConstraints.push(startAt(searchTerm));
    queryConstraints.push(endAt(searchTerm + '\uf8ff'));
     // Note: This is a basic prefix search. For full-text search, consider a dedicated search service.
  } else if (filters.sortBy) {
     queryConstraints.push(orderBy(filters.sortBy, filters.sortOrder || 'asc'));
  } else {
    // Default sort if no specific sort or search is provided to avoid index issues
    queryConstraints.push(orderBy('title', 'asc'));
  }


  if (count > 0) {
    queryConstraints.push(limit(count));
  }

  q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
        console.warn(`Firestore query in getAllAnimes requires an index. Details: ${error.message} Filters: ${JSON.stringify(filters)}`);
         // Attempt a simpler query if the complex one fails due to missing index
        try {
            console.warn("Attempting fallback query for getAllAnimes (orderBy title, limit 50)");
            const fallbackQueryConstraints = [orderBy('title', 'asc'), limit(count > 0 ? count : 50)];
            if (filters.featured !== undefined) { // Keep featured filter if present, as it's common
                fallbackQueryConstraints.unshift(where('isFeatured', '==', filters.featured));
            }
            const fallbackQuery = query(animesCollection, ...fallbackQueryConstraints);
            const fallbackSnapshot = await getDocs(fallbackQuery);
            return fallbackSnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
        } catch (fallbackError) {
            console.error("Fallback query also failed:", fallbackError);
             throw handleFirestoreError(fallbackError, `getAllAnimes (fallback query) - Filters: ${JSON.stringify(filters)}`);
        }
    }
    throw handleFirestoreError(error, `getAllAnimes - Filters: ${JSON.stringify(filters)}`);
  }
}


export async function getFeaturedAnimes(
  options: {
    count?: number;
     filters?: { // Keep filters signature consistent, though featured will override
      sortBy?: 'updatedAt' | 'popularity' | 'title';
      sortOrder?: 'asc' | 'desc';
    };
  } = {}
): Promise<Anime[]> {
  const { count = 5, filters = {} } = options;
  // For featured animes, we always filter by isFeatured: true
  // And typically sort by a field like 'updatedAt' or 'popularity' if no specific sort is given.
  // If filters.sortBy is provided, use that, otherwise default.
  const sortBy = filters.sortBy || 'updatedAt'; // Default sort for featured
  const sortOrder = filters.sortOrder || 'desc'; // Default order for featured

  const queryConstraints: QueryConstraint[] = [
    where('isFeatured', '==', true),
    orderBy(sortBy, sortOrder)
  ];
  
  if (count > 0) {
    queryConstraints.push(limit(count));
  }
  
  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
        console.warn(`Firestore query in getFeaturedAnimes requires an index. Query was: isFeatured == true, orderBy ${sortBy} ${sortOrder}. Details: ${error.message}`);
        // Fallback: fetch featured items without specific sort if index is missing
        try {
            console.warn("Attempting fallback query for getFeaturedAnimes (isFeatured true, no specific sort, limit 5)");
            const fallbackQuery = query(animesCollection, where('isFeatured', '==', true), limit(count > 0 ? count : 5));
            const fallbackSnapshot = await getDocs(fallbackQuery);
            return fallbackSnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
        } catch (fallbackError) {
            console.error("Fallback query for featured animes also failed:", fallbackError);
            throw handleFirestoreError(fallbackError, 'getFeaturedAnimes (fallback)');
        }
    }
    throw handleFirestoreError(error, 'getFeaturedAnimes');
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
  // Firestore 'in' queries are limited to 30 elements per query
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
    const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
    if (batchIds.length === 0) continue;

    const q = query(animesCollection, where(documentId(), 'in', batchIds));
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
      });
    } catch (error) {
      console.error(`Error fetching batch of animes by IDs (batch starting with ${batchIds[0]}):`, error);
      // Decide if you want to throw or continue and return partial results
      // For now, log error and continue to fetch other batches
    }
  }
  return results;
}


export async function addAnimeToFirestore(animeData: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const slug = slugify(animeData.title);
  const docRef = doc(animesCollection, slug);

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      // Document with this slug already exists.
      // Option 1: Throw an error
      // throw new Error(`Anime with title "${animeData.title}" (slug: "${slug}") already exists.`);
      // Option 2: Update the existing document (be careful with this, ensure it's intended)
      // await updateDoc(docRef, { ...animeData, updatedAt: serverTimestamp() });
      // return slug;
      // Option 3: Generate a unique slug if collision (e.g., append a short random string or number)
      const uniqueSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
      const uniqueDocRef = doc(animesCollection, uniqueSlug);
      await addDoc(animesCollection, { // addDoc will generate a unique ID if needed, but we want to control the slug
        ...animeData,
        id: uniqueSlug, // Store the slug as the ID field as well for consistency
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return uniqueSlug;

    } else {
      // Document does not exist, create it with the slug as ID
      await setDoc(docRef, { 
        ...animeData, 
        id: slug, // Explicitly set the id field to the slug
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
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
    // Ensure trailerUrl and bannerImage are set to null if they are empty strings
    if (updatePayload.hasOwnProperty('trailerUrl') && updatePayload.trailerUrl === '') {
      updatePayload.trailerUrl = null;
    }
    if (updatePayload.hasOwnProperty('bannerImage') && updatePayload.bannerImage === '') {
      updatePayload.bannerImage = null;
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
    
    // Merge existing episode data with new data
    episodes[episodeIndex] = { ...episodes[episodeIndex], ...episodeData };

    // Ensure URL is handled correctly (set to null if empty string)
    if (episodes[episodeIndex].hasOwnProperty('url') && episodes[episodeIndex].url === '') {
        episodes[episodeIndex].url = undefined; // Or null if preferred for DB
    }
    if (episodes[episodeIndex].hasOwnProperty('thumbnail') && episodes[episodeIndex].thumbnail === '') {
        episodes[episodeIndex].thumbnail = undefined;
    }


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
    const querySnapshot = await getDocs(animesCollection);
    const genresSet = new Set<string>();
    querySnapshot.forEach(doc => {
      const anime = doc.data() as Anime;
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

  // This is a client-side like search if Firestore full-text search is not available or set up.
  // For better performance on large datasets, use a dedicated search service (e.g., Algolia, Elasticsearch)
  // or Firestore's Vector Search (if applicable to your data).
  
  // Strategy 1: Fetch a larger set and filter client-side (not ideal for very large datasets)
  // We will use getAllAnimes with its basic title prefix search and then further filter
  try {
    // Fetch a broader set using prefix search for title
    const initialResults = await getAllAnimes({
      count: count * 5, // Fetch more to have a better chance after filtering
      filters: { searchQuery: searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1) } // Try with capitalized first letter
    });
    
    let results = initialResults.filter(anime => 
      anime.title.toLowerCase().includes(lowerSearchTerm) ||
      anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
    );

    // If not enough results, try with all lowercase search
    if (results.length < count) {
        const lowerCaseResults = await getAllAnimes({
            count: count * 5,
            filters: { searchQuery: lowerSearchTerm }
        });
        const additionalResults = lowerCaseResults.filter(anime => 
            (anime.title.toLowerCase().includes(lowerSearchTerm) ||
            anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))) &&
            !results.find(r => r.id === anime.id) // Avoid duplicates
        );
        results = [...results, ...additionalResults];
    }


    // Prioritize exact title matches or beginning of title matches
    results.sort((a, b) => {
        const aTitleLower = a.title.toLowerCase();
        const bTitleLower = b.title.toLowerCase();
        const aStartsWith = aTitleLower.startsWith(lowerSearchTerm);
        const bStartsWith = bTitleLower.startsWith(lowerSearchTerm);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // If both or neither start with, sort by overall relevance (length or other factors if needed)
        // For now, just keep original order from Firestore or sort by title alphabetically
        return aTitleLower.localeCompare(bTitleLower);
    });


    return results.slice(0, count);

  } catch (error) {
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

export async function getTotalUserCount(): Promise<number> {
   const usersCol = collection(db, 'users');
  try {
    const snapshot = await getCountFromServer(usersCol);
    return snapshot.data().count;
  } catch (error) {
    throw handleFirestoreError(error, 'getTotalUserCount');
  }
}

    