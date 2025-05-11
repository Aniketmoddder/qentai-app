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
  let effectiveSortOrder = filters.sortOrder || 'desc';

  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const searchTerm = filters.searchQuery.trim();
    const searchTermUpper = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
    queryConstraints.push(orderBy('title'));
    queryConstraints.push(startAt(searchTermUpper));
    queryConstraints.push(endAt(searchTermUpper + '\uf8ff'));
    effectiveSortBy = undefined; // Search implies title sort, override other sorts
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
      // If filtering by featured, and no specific sort is given,
      // default to sorting by title to avoid needing complex indexes for every combination.
      if (!effectiveSortBy && filters.featured) {
        effectiveSortBy = 'title';
        effectiveSortOrder = 'asc';
      }
    }

    if (effectiveSortBy) {
      queryConstraints.push(orderBy(effectiveSortBy, effectiveSortOrder));
    } else {
      queryConstraints.push(orderBy('updatedAt', 'desc')); // Fallback default sort
    }
  }
  
  if (count > 0) {
    queryConstraints.push(limit(count));
  } else if (count === -1) {
    // No limit
  } else {
    queryConstraints.push(limit(20)); // Default safety limit
  }
  
  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
        console.warn(`Firestore query in getAllAnimes requires an index. Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}, SortOrder: ${effectiveSortOrder}. Error: ${error.message}`);
        // Attempt a simpler fallback if the complex query fails
        try {
            console.warn("Attempting simpler fallback query for getAllAnimes (orderBy title, limit)");
            const fallbackQuery = query(animesCollection, orderBy('title', 'asc'), limit(count > 0 ? count : 20));
            const fallbackSnapshot = await getDocs(fallbackQuery);
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
    sortByPopularity?: boolean; // New specific flag for popularity sort
  } = {}
): Promise<Anime[]> {
  const { count = 5, sortByPopularity = false } = options;
  
  // For featured animes, the Firestore query will always sort by updatedAt descending.
  // Popularity sort, if requested, will be done client-side.
  const firestoreQuerySortBy: 'updatedAt' = 'updatedAt';
  const firestoreQuerySortOrder: 'desc' = 'desc';

  // Fetch more items if client-side popularity sort is needed, to get a good pool.
  const fetchLimit = sortByPopularity ? Math.max(25, count * 3) : (count > 0 ? count : 5);

  const queryConstraints: QueryConstraint[] = [
    where('isFeatured', '==', true),
    orderBy(firestoreQuerySortBy, firestoreQuerySortOrder),
  ];
  
  if (fetchLimit > 0) {
    queryConstraints.push(limit(fetchLimit));
  }
  
  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    let animes = querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));

    if (sortByPopularity) {
      animes.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      if (count > 0) {
        animes = animes.slice(0, count);
      }
    }
    
    return animes;

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
      console.warn(`Firestore query in getFeaturedAnimes (sorted by ${firestoreQuerySortBy}) requires an index. Details: ${error.message}`);
      try {
        console.warn(`Attempting basic fallback for getFeaturedAnimes (isFeatured == true, orderBy title, limit ${count > 0 ? count : 5}).`);
        const fallbackQueryConstraints: QueryConstraint[] = [
            where('isFeatured', '==', true),
            orderBy('title', 'asc') // Simplest possible sort for fallback
        ];
        if (count > 0) {
            fallbackQueryConstraints.push(limit(count));
        } else {
            fallbackQueryConstraints.push(limit(5));
        }
        const fallbackQuery = query(animesCollection, ...fallbackQueryConstraints);
        const fallbackSnapshot = await getDocs(fallbackQuery);
        let fallbackAnimes = fallbackSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
        
        if (sortByPopularity) {
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
    throw handleFirestoreError(error, `getFeaturedAnimes (sorted by ${firestoreQuerySortBy})`);
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
      // Decide if you want to throw or continue. For now, log and continue.
    }
  }
  // Preserve original order of IDs
  ids.forEach(id => {
    if(fetchedAnimesMap.has(id)){
      results.push(fetchedAnimesMap.get(id)!);
    }
  });
  return results;
}


export async function addAnimeToFirestore(animeData: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const slug = slugify(animeData.title);
  const docRef = doc(animesCollection, slug);

  const dataToSave = {
    ...animeData,
    id: slug, // Explicitly set slug as ID here
    trailerUrl: animeData.trailerUrl || null,
    bannerImage: animeData.bannerImage || null,
    averageRating: animeData.averageRating === undefined ? null : animeData.averageRating,
    updatedAt: serverTimestamp(),
  };

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.warn(`Anime with slug "${slug}" already exists. Updating existing document.`);
      await updateDoc(docRef, dataToSave); // Update if exists
    } else {
      await setDoc(docRef, { ...dataToSave, createdAt: serverTimestamp() }); // Create if not exists
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
  
  try {
    // Title prefix search
    const searchTermUpper = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
    const titleQueryConstraints: QueryConstraint[] = [
        orderBy('title'),
        startAt(searchTermUpper), 
        endAt(searchTermUpper + '\uf8ff'),
        limit(count * 2) 
    ];
    const titleQuery = query(animesCollection, ...titleQueryConstraints);
    const titleSnapshot = await getDocs(titleQuery);
    let results = titleSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));

    // Filter by title and genre client-side (if needed, or improve Firestore query)
    results = results.filter(anime => 
      anime.title.toLowerCase().includes(lowerSearchTerm) ||
      anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
    );

    // Relevance sort
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
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn("Search by title prefix failed, attempting broader search for:", searchTerm, error.message);
        // Fallback: fetch more broadly and filter client-side
        // This can be inefficient for large datasets.
        try {
            const allAnimes = await getAllAnimes({ count: 200 }); // Fetch a larger general set
            let filtered = allAnimes.filter(anime => 
                anime.title.toLowerCase().includes(lowerSearchTerm) ||
                anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
            );
            // Apply same relevance sort
            filtered.sort((a, b) => { 
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