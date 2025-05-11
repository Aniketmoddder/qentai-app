'use server';

import { db } from '@/lib/firebase';
import type { Anime, Episode } from '@/types/anime';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';
import { slugify } from '@/lib/stringUtils';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  FirestoreError,
  documentId,
  QueryConstraint,
  startAt,
  endAt,
  getCountFromServer,
  serverTimestamp
} from 'firebase/firestore';

const animesCollection = collection(db, 'animes');

const MAX_IDS_PER_QUERY = 30; 

// Centralized error handler
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

  let effectiveSortBy = filters.sortBy;
  let effectiveSortOrder = filters.sortOrder || (filters.sortBy === 'title' ? 'asc' : 'desc'); // Default asc for title, desc for others

  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const searchTerm = filters.searchQuery.trim();
    const searchTermUpper = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
    queryConstraints.push(orderBy('title'));
    queryConstraints.push(startAt(searchTermUpper));
    queryConstraints.push(endAt(searchTermUpper + '\uf8ff'));
    effectiveSortBy = undefined; 
  } else {
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
      if (!effectiveSortBy && filters.featured) {
        effectiveSortBy = 'updatedAt'; // Default sort for featured if no other sort specified
        effectiveSortOrder = 'desc';
      }
    }

    if (effectiveSortBy) {
      queryConstraints.push(orderBy(effectiveSortBy, effectiveSortOrder));
    } else {
      // Default sort if no specific sort or search query
       queryConstraints.push(orderBy('updatedAt', 'desc')); 
    }
  }
  
  const effectiveCount = count === -1 ? 500 : (count > 0 ? count : 20); // Safety limit for -1, else use count or default
  if (count !== -1) { // Only add limit if not fetching all
    queryConstraints.push(limit(effectiveCount));
  }
  
  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
        console.warn(`Firestore query in getAllAnimes requires an index. Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}, SortOrder: ${effectiveSortOrder}. Error: ${error.message}`);
        try {
            console.warn("Attempting simpler fallback query for getAllAnimes.");
            const fallbackQueryConstraints: QueryConstraint[] = [];
            
            // Prioritize a single most specific filter for the fallback
            if (filters.genre) {
              fallbackQueryConstraints.push(where('genre', 'array-contains', filters.genre));
            } else if (filters.type) {
                fallbackQueryConstraints.push(where('type', '==', filters.type));
            } else if (filters.featured !== undefined) {
                fallbackQueryConstraints.push(where('isFeatured', '==', filters.featured));
                 // If featured is the filter, a common fallback sort might be 'updatedAt' or 'popularity'
                 // but to avoid further index errors, we'll omit explicit sort here.
            } else if (filters.status) {
                fallbackQueryConstraints.push(where('status', '==', filters.status));
            } else if (filters.year) {
                fallbackQueryConstraints.push(where('year', '==', filters.year));
            } else {
              // If no specific filter was problematic or as an ultimate fallback, sort by title
              fallbackQueryConstraints.push(orderBy('title', 'asc'));
            }
            
            // Apply limit to fallback
            const fallbackLimit = effectiveCount > 0 ? effectiveCount : 20; // Use original limit or default
            fallbackQueryConstraints.push(limit(fallbackLimit));

            const fallbackQuery = query(animesCollection, ...fallbackQueryConstraints);
            const fallbackSnapshot = await getDocs(fallbackQuery);
            console.warn(`Fallback query executed. Returned ${fallbackSnapshot.docs.length} documents.`);
            return fallbackSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
        } catch (fallbackError) {
            console.error("Fallback query for getAllAnimes also failed:", fallbackError);
            throw handleFirestoreError(fallbackError, `getAllAnimes (fallback) - Filters: ${JSON.stringify(filters)}`);
        }
    }
    throw handleFirestoreError(error, `getAllAnimes - Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}`);
  }
}


export async function getFeaturedAnimes(
  options: {
    count?: number;
    sortByPopularity?: boolean;
  } = {}
): Promise<Anime[]> {
  const { count = 5, sortByPopularity = false } = options;
  
  const queryConstraints: QueryConstraint[] = [where('isFeatured', '==', true)];
  
  // Determine sort order for Firestore query
  if (sortByPopularity) {
    queryConstraints.push(orderBy('popularity', 'desc'));
  } else {
    queryConstraints.push(orderBy('updatedAt', 'desc')); 
  }

  const effectiveCount = count === -1 ? 25 : (count > 0 ? count : 5); // Max 25 if fetching all featured, else use count or default 5
   if (count !== -1) {
    queryConstraints.push(limit(effectiveCount));
  }
  
  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    let animes = querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
    
    // If sortByPopularity was true, Firestore already sorted. 
    // If it was false, it's sorted by updatedAt.
    // No additional client-side sort needed here based on this logic.
    
    return animes;

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
      const requiredIndexSort = sortByPopularity ? 'popularity' : 'updatedAt';
      console.warn(`Firestore query in getFeaturedAnimes (isFeatured == true, orderBy ${requiredIndexSort}) requires an index. Details: ${error.message}`);
      try {
        console.warn(`Attempting fallback for getFeaturedAnimes (isFeatured == true, orderBy title, limit ${effectiveCount}).`);
        const fallbackQueryConstraints: QueryConstraint[] = [
            where('isFeatured', '==', true),
            orderBy('title', 'asc') 
        ];
        fallbackQueryConstraints.push(limit(effectiveCount));
        
        const fallbackQuery = query(animesCollection, ...fallbackQueryConstraints);
        const fallbackSnapshot = await getDocs(fallbackQuery);
        let fallbackAnimes = fallbackSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
        
        // If original intent was popularity sort, apply it to the fallback results
        if (sortByPopularity) {
            fallbackAnimes.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
             if (count > 0) { // Re-apply original count limit if it was specified
                 fallbackAnimes = fallbackAnimes.slice(0, count);
            }
        }
        return fallbackAnimes;
      } catch (fallbackError) {
        console.error("Fallback query for getFeaturedAnimes also failed:", fallbackError);
        throw handleFirestoreError(fallbackError, 'getFeaturedAnimes (fallback query failed)');
      }
    }
    throw handleFirestoreError(error, `getFeaturedAnimes (sorted by ${sortByPopularity ? 'popularity' : 'updatedAt'})`);
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
      return convertAnimeTimestampsForClient(docSnap.data() as Anime);
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
  const fetchedAnimesMap = new Map<string, Anime>();
  
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
    const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
    if (batchIds.length === 0) continue;

    const q = query(animesCollection, where(documentId(), 'in', batchIds));
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
         const anime = convertAnimeTimestampsForClient(docSnap.data() as Anime);
         fetchedAnimesMap.set(anime.id, anime);
      });
    } catch (error) {
      console.error(`Error fetching batch of animes by IDs (batch starting with ${batchIds[0]}):`, error);
    }
  }
  ids.forEach(id => {
    if(fetchedAnimesMap.has(id)){
      results.push(fetchedAnimesMap.get(id)!);
    }
  });
  return results;
}


export async function addAnimeToFirestore(animeData: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const slug = slugify(animeData.title);
  if (!slug) {
    throw new Error("Failed to generate a valid slug from the title.");
  }
  const docRef = doc(animesCollection, slug);

  const dataToSave = {
    ...animeData,
    id: slug, 
    trailerUrl: animeData.trailerUrl || null,
    bannerImage: animeData.bannerImage || null,
    averageRating: animeData.averageRating === undefined ? null : animeData.averageRating,
    popularity: animeData.popularity === undefined ? 0 : animeData.popularity,
    isFeatured: animeData.isFeatured === undefined ? false : animeData.isFeatured,
    updatedAt: serverTimestamp(),
  };

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.warn(`Anime with slug "${slug}" already exists. Updating existing document.`);
      await updateDoc(docRef, dataToSave); 
    } else {
      await setDoc(docRef, { ...dataToSave, createdAt: serverTimestamp() }); 
    }
    return slug;
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
    if (updatePayload.hasOwnProperty('popularity') && updatePayload.popularity === undefined) {
      updatePayload.popularity = 0;
    }
    if (updatePayload.hasOwnProperty('isFeatured') && updatePayload.isFeatured === undefined) {
      updatePayload.isFeatured = false;
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
      url: episodeData.url || undefined,
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
    // Fetch a larger sample or all documents if feasible, otherwise this might not be truly "unique" globally
    const querySnapshot = await getDocs(query(animesCollection, limit(500))); 
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
  const effectiveCount = count > 0 ? count : 20;
  
  try {
    const searchTermUpper = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
    const titleQueryConstraints: QueryConstraint[] = [
        orderBy('title'),
        startAt(searchTermUpper), 
        endAt(searchTermUpper + '\uf8ff'),
        limit(effectiveCount * 2) // Fetch more to allow client-side relevance sort for prefix matches
    ];
    const titleQuery = query(animesCollection, ...titleQueryConstraints);
    const titleSnapshot = await getDocs(titleQuery);
    let results = titleSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));

    // Further client-side filtering for substring matches within titles or genres
    // This is less efficient than full-text search but works for smaller datasets or as a supplement
    results = results.filter(anime => 
      anime.title.toLowerCase().includes(lowerSearchTerm) ||
      anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
    );

    // Relevance sort: prioritize direct title matches, then starting with term, then general inclusion
    results.sort((a, b) => {
        const aTitleLower = a.title.toLowerCase();
        const bTitleLower = b.title.toLowerCase();
        
        const aIsDirectMatch = aTitleLower === lowerSearchTerm;
        const bIsDirectMatch = bTitleLower === lowerSearchTerm;
        if (aIsDirectMatch && !bIsDirectMatch) return -1;
        if (!aIsDirectMatch && bIsDirectMatch) return 1;

        const aStartsWith = aTitleLower.startsWith(lowerSearchTerm);
        const bStartsWith = bTitleLower.startsWith(lowerSearchTerm);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Could add more sophisticated scoring here (e.g., by popularity if title match is similar)
        return aTitleLower.localeCompare(bTitleLower); // Fallback to alphabetical
    });

    return results.slice(0, effectiveCount);

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn("Search by title prefix failed, attempting broader search for:", searchTerm, error.message);
        try {
            const allAnimes = await getAllAnimes({ count: 200 }); // Fetch a general set
            let filtered = allAnimes.filter(anime => 
                anime.title.toLowerCase().includes(lowerSearchTerm) ||
                anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
            );
            filtered.sort((a, b) => { 
                const aTitleLower = a.title.toLowerCase();
                const bTitleLower = b.title.toLowerCase();
                if (aTitleLower.startsWith(lowerSearchTerm) && !bTitleLower.startsWith(lowerSearchTerm)) return -1;
                if (!aTitleLower.startsWith(lowerSearchTerm) && bTitleLower.startsWith(lowerSearchTerm)) return 1;
                return aTitleLower.localeCompare(bTitleLower);
            });
            return filtered.slice(0, effectiveCount);
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
