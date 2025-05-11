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
  let effectiveSortOrder = filters.sortOrder || (filters.sortBy === 'title' ? 'asc' : 'desc');

  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const searchTerm = filters.searchQuery.trim();
    queryConstraints.push(orderBy('title'));
    queryConstraints.push(startAt(searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase()));
    queryConstraints.push(endAt(searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase() + '\uf8ff'));
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
         effectiveSortBy = 'updatedAt';
         effectiveSortOrder = 'desc';
       }
    }

    if (effectiveSortBy) {
      queryConstraints.push(orderBy(effectiveSortBy, effectiveSortOrder));
    } else {
      queryConstraints.push(orderBy('updatedAt', 'desc'));
    }
  }
  
  const effectiveCount = count === -1 ? 500 : (count > 0 ? count : 20);
  if (count !== -1) {
    queryConstraints.push(limit(effectiveCount));
  }


  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
      console.warn(`Firestore query in getAllAnimes requires an index. Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}, SortOrder: ${effectiveSortOrder}. Error: ${error.message}`);
      console.warn("Attempting simpler fallback query for getAllAnimes (limit 20, orderBy title).");
      try {
        const fallbackQuerySimple = query(animesCollection, orderBy('title', 'asc'), limit(20));
        const fallbackSnapshot = await getDocs(fallbackQuerySimple);
        return fallbackSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
      } catch (fallbackError) {
        console.error("Fallback query for getAllAnimes also failed:", fallbackError);
         throw handleFirestoreError(fallbackError, `getAllAnimes (fallback) - Filters: ${JSON.stringify(filters)}`);
      }
    }
    throw handleFirestoreError(error, `getAllAnimes - Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}, SortOrder: ${effectiveSortOrder}`);
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

  if (sortByPopularity) {
    queryConstraints.push(orderBy('popularity', 'desc'));
  } else {
    // If not sorting by popularity, default to updatedAt to show recently featured or updated ones first.
    queryConstraints.push(orderBy('updatedAt', 'desc'));
  }
  
  const effectiveCount = count === -1 ? 25 : (count > 0 ? count : 5);
  if (count !== -1) {
     queryConstraints.push(limit(effectiveCount));
  }

  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
  } catch (error) {
     const primarySortField = sortByPopularity ? 'popularity' : 'updatedAt';
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
      console.warn(`Primary query for getFeaturedAnimes (isFeatured == true, orderBy ${primarySortField} desc) failed due to missing index. Error: ${error.message}`);
      console.warn(`Attempting fallback for getFeaturedAnimes: (isFeatured == true, limit ${effectiveCount}). Client-side sort will be applied if sortByPopularity was true.`);
      try {
        const fallbackQueryConstraints: QueryConstraint[] = [
            where('isFeatured', '==', true),
            limit(effectiveCount) 
        ];
        const fallbackQuery = query(animesCollection, ...fallbackQueryConstraints);
        const fallbackSnapshot = await getDocs(fallbackQuery);
        let animes = fallbackSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));

        if (sortByPopularity) {
          animes.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        } else {
          animes.sort((a,b) => (new Date(b.updatedAt || 0).getTime()) - (new Date(a.updatedAt || 0).getTime()));
        }
        return animes;
      } catch (fallbackError) {
        console.error("Fallback query for getFeaturedAnimes also failed:", fallbackError);
        throw handleFirestoreError(error, `getFeaturedAnimes (original query with sort by ${primarySortField} failed, and fallback also failed)`);
      }
    }
    throw handleFirestoreError(error, `getFeaturedAnimes (sorted by ${primarySortField})`);
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

  const dataToSave: any = {
    ...animeData,
    id: slug,
    updatedAt: serverTimestamp(),
  };

  dataToSave.trailerUrl = animeData.trailerUrl || null;
  dataToSave.bannerImage = animeData.bannerImage || null;
  dataToSave.averageRating = animeData.averageRating === undefined ? null : animeData.averageRating;
  dataToSave.popularity = animeData.popularity === undefined ? 0 : animeData.popularity;
  dataToSave.isFeatured = animeData.isFeatured === undefined ? false : animeData.isFeatured;

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.warn(`Anime with slug "${slug}" already exists. Updating existing document.`);
      await updateDoc(docRef, dataToSave);
    } else {
      dataToSave.createdAt = serverTimestamp();
      await setDoc(docRef, dataToSave);
    }
    return slug;
  } catch (error) {
    throw handleFirestoreError(error, `addAnimeToFirestore (title: ${animeData.title})`);
  }
}

export async function updateAnimeInFirestore(id: string, animeData: Partial<Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  if (!id) {
    throw new Error("Anime ID is required for update.");
  }
  const docRef = doc(animesCollection, id);
  try {
    const updatePayload: any = { ...animeData, updatedAt: serverTimestamp() };

    if (animeData.hasOwnProperty('trailerUrl')) {
      updatePayload.trailerUrl = animeData.trailerUrl || null;
    }
    if (animeData.hasOwnProperty('bannerImage')) {
      updatePayload.bannerImage = animeData.bannerImage || null;
    }
    if (animeData.hasOwnProperty('aniListId')) {
      updatePayload.aniListId = animeData.aniListId || null;
    }
    if (animeData.hasOwnProperty('averageRating') && animeData.averageRating === undefined) {
      updatePayload.averageRating = null;
    }
     if (animeData.hasOwnProperty('popularity') && animeData.popularity === undefined) {
      updatePayload.popularity = 0;
    }
    if (animeData.hasOwnProperty('isFeatured') && animeData.isFeatured === undefined) {
      updatePayload.isFeatured = false;
    }
    
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined && !['trailerUrl', 'bannerImage', 'aniListId', 'averageRating', 'episodes'].includes(key)) {
        delete updatePayload[key];
      }
    });


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
    // Fetch a reasonable number of documents; adjust limit as needed for performance vs. completeness.
    // If you have a very large number of animes and many unique genres, consider a more optimized approach
    // (e.g., a separate 'genres' collection updated by a Cloud Function).
    const querySnapshot = await getDocs(query(animesCollection, limit(500))); // Increased limit
    const genresSet = new Set<string>();
    querySnapshot.forEach(docSnap => {
      const anime = docSnap.data() as Anime;
      if (anime.genre && Array.isArray(anime.genre)) {
        anime.genre.forEach(g => {
          if (typeof g === 'string' && g.trim() !== '') { // Ensure genre is a non-empty string
            genresSet.add(g.trim());
          }
        });
      }
    });
    if (genresSet.size === 0) {
      console.warn("getUniqueGenres: No genres found in the first 500 documents or genres field is empty/malformed.");
      // Consider returning a predefined list or throwing a more specific error if this is critical
      return ['Action', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Romance', 'Horror', 'Adventure']; // Fallback
    }
    return Array.from(genresSet).sort();
  } catch (error) {
    // Handle potential Firestore errors, e.g., if the 'animes' collection doesn't exist
    // or there are permission issues not caught by Firestore rules (less likely for reads).
    console.error("Error in getUniqueGenres:", error);
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
    const searchTermCapitalized = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
    const titleQueryConstraints: QueryConstraint[] = [
        orderBy('title'),
        startAt(searchTermCapitalized),
        endAt(searchTermCapitalized + '\uf8ff'),
        limit(effectiveCount * 2) 
    ];
    const titleQuery = query(animesCollection, ...titleQueryConstraints);
    const titleSnapshot = await getDocs(titleQuery);
    let results = titleSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));

    results = results.filter(anime =>
      anime.title.toLowerCase().includes(lowerSearchTerm) ||
      anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
    );

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
        
        if ((b.popularity || 0) !== (a.popularity || 0)) {
            return (b.popularity || 0) - (a.popularity || 0);
        }
        
        return aTitleLower.localeCompare(bTitleLower);
    });

    return results.slice(0, effectiveCount);

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn("Search by title prefix failed due to missing index. Attempting broader client-side search for:", searchTerm, error.message);
        try {
            const allAnimes = await getAllAnimes({ count: 200 }); 
            let filtered = allAnimes.filter(anime =>
                anime.title.toLowerCase().includes(lowerSearchTerm) ||
                anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
            );
            filtered.sort((a, b) => {
                const aTitleLower = a.title.toLowerCase();
                const bTitleLower = b.title.toLowerCase();
                if (aTitleLower.startsWith(lowerSearchTerm) && !bTitleLower.startsWith(lowerSearchTerm)) return -1;
                if (!aTitleLower.startsWith(lowerSearchTerm) && bTitleLower.startsWith(lowerSearchTerm)) return 1;
                if ((b.popularity || 0) !== (a.popularity || 0)) {
                    return (b.popularity || 0) - (a.popularity || 0);
                }
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
