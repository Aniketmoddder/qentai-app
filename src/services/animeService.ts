// src/services/animeService.ts
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

const MAX_IDS_PER_QUERY = 30; // Firestore 'in' query limit for web

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
  let hasSpecificDefaultSortApplied = false;

  if (filters.searchQuery && filters.searchQuery.trim() !== '') {
    const searchTerm = filters.searchQuery.trim();
    queryConstraints.push(orderBy('title'));
    queryConstraints.push(startAt(searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase()));
    queryConstraints.push(endAt(searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase() + '\uf8ff'));
    effectiveSortBy = undefined; 
  } else {
    if (filters.genre) {
      queryConstraints.push(where('genre', 'array-contains', filters.genre));
       if (!effectiveSortBy) { 
         effectiveSortBy = 'updatedAt'; // Default to updatedAt for genre to match existing enabled index
         effectiveSortOrder = 'desc';
         hasSpecificDefaultSortApplied = true;
       }
    }
    if (filters.type) {
      queryConstraints.push(where('type', '==', filters.type));
        if (!effectiveSortBy && !hasSpecificDefaultSortApplied) {
         effectiveSortBy = 'popularity'; 
         effectiveSortOrder = 'desc';
         hasSpecificDefaultSortApplied = true;
       }
    }
    if (filters.status) {
      queryConstraints.push(where('status', '==', filters.status));
    }
    if (filters.year) {
      queryConstraints.push(where('year', '==', filters.year));
    }
    if (filters.featured !== undefined) {
      queryConstraints.push(where('isFeatured', '==', filters.featured));
       if (!effectiveSortBy && !hasSpecificDefaultSortApplied) { 
         effectiveSortBy = 'popularity'; // Relies on the isFeatured+popularity index (currently building)
         effectiveSortOrder = 'desc';
         hasSpecificDefaultSortApplied = true;
       }
    }

    if (effectiveSortBy) {
      queryConstraints.push(orderBy(effectiveSortBy, effectiveSortOrder));
    } else if (!hasSpecificDefaultSortApplied) {
      // Absolute default sort if no filters dictated a default and not a search query
      queryConstraints.push(orderBy('popularity', 'desc')); // General default - relies on popularity index
      queryConstraints.push(orderBy('updatedAt', 'desc')); // Secondary general default
    }
  }
  
  const effectiveCount = count === -1 ? 1000 : (count > 0 ? count : 20);
  if (count !== -1 && effectiveCount > 0) { // Ensure effectiveCount is positive
    queryConstraints.push(limit(effectiveCount));
  } else if (count === 0) { // Handle count === 0 explicitly if it means "no limit but also no items"
    // This case might be an error or intentional. For now, return empty.
    // If you want to interpret 0 as 'fetch all available', remove this block and handle effectiveCount = -1 logic.
     console.warn("getAllAnimes called with count: 0. Returning empty array.");
     return [];
  }


  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
      const specificIndexMessage = `Firestore query in getAllAnimes requires an index. Details: ${error.message}. Query based on Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}, SortOrder: ${effectiveSortOrder}. You can create this index in the Firebase console.`;
      console.warn(specificIndexMessage);
      throw handleFirestoreError(error, `getAllAnimes (Index Required) - Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}, SortOrder: ${effectiveSortOrder}. Message: ${specificIndexMessage}`);
    }
    throw handleFirestoreError(error, `getAllAnimes - Filters: ${JSON.stringify(filters)}, SortBy: ${effectiveSortBy}, SortOrder: ${effectiveSortOrder}`);
  }
}

export async function getFeaturedAnimes(
  options: {
    count?: number;
    sortBy?: 'popularity' | 'updatedAt'; // Explicitly allow sorting for featured
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<Anime[]> {
  const { count = 5, sortBy = 'popularity', sortOrder = 'desc' } = options;

  const queryConstraints: QueryConstraint[] = [
    where('isFeatured', '==', true),
    orderBy(sortBy, sortOrder) 
  ];
  
  const effectiveCount = count === -1 ? 25 : (count > 0 ? count : 5);
   if (count !== -1 && effectiveCount > 0) { // Ensure effectiveCount is positive
     queryConstraints.push(limit(effectiveCount));
   } else if (count === 0) {
     console.warn("getFeaturedAnimes called with count: 0. Returning empty array.");
     return [];
   }
  
  const q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
      const specificIndexMessage = `Firestore query for getFeaturedAnimes requires an index. Details: ${error.message}. Query: isFeatured == true, orderBy ${sortBy} ${sortOrder}. You can create this index in the Firebase console.`;
      console.warn(specificIndexMessage);
      // Attempt fallback to isFeatured + updatedAt if popularity fails and is the sort key
      if (sortBy === 'popularity') {
        console.warn("getFeaturedAnimes: Falling back to sort by updatedAt due to missing popularity index for featured items.");
        try {
          const fallbackQueryConstraints: QueryConstraint[] = [
            where('isFeatured', '==', true),
            orderBy('updatedAt', 'desc') // Fallback sort
          ];
          if (count !== -1 && effectiveCount > 0) {
            fallbackQueryConstraints.push(limit(effectiveCount));
          }
          const fallbackQuery = query(animesCollection, ...fallbackQueryConstraints);
          const fallbackSnapshot = await getDocs(fallbackQuery);
          return fallbackSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));
        } catch (fallbackError) {
          console.error("Fallback query for getFeaturedAnimes (sorted by updatedAt) also failed:", fallbackError);
          throw handleFirestoreError(fallbackError, `getFeaturedAnimes (fallback after index error) - Original Error: ${specificIndexMessage}`);
        }
      }
    }
    throw handleFirestoreError(error, `getFeaturedAnimes (sortBy: ${sortBy})`);
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
    const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY).filter(id => id); 
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
      // Decide if to throw or continue. For robustness, continue and log.
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
    throw new Error("Failed to generate a valid slug from the title. Title might be empty or contain only special characters.");
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
  dataToSave.aniListId = animeData.aniListId || null;
  dataToSave.episodes = animeData.episodes || []; 

  dataToSave.season = animeData.season || null;
  dataToSave.seasonYear = animeData.seasonYear || (animeData.year || null);
  dataToSave.countryOfOrigin = animeData.countryOfOrigin || null;
  dataToSave.studios = animeData.studios || [];
  dataToSave.source = animeData.source || null;
  dataToSave.format = animeData.format || animeData.type || null;
  dataToSave.duration = animeData.duration || null;
  dataToSave.airedFrom = animeData.airedFrom || null;
  dataToSave.airedTo = animeData.airedTo || null;
  dataToSave.episodesCount = animeData.episodesCount || animeData.episodes?.length || 0;


  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.warn(`Anime with slug "${slug}" already exists. Updating existing document.`);
      // Ensure existing fields like episodes are not accidentally overwritten if not provided in animeData
      const existingData = docSnap.data();
      const updatePayload = { ...existingData, ...dataToSave }; // Merge to preserve fields not in dataToSave
      await updateDoc(docRef, updatePayload);
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
    const updatePayload: { [key: string]: any } = { ...animeData, updatedAt: serverTimestamp() };


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
       // Default to 0 if popularity is explicitly set to undefined in the update
       updatePayload.popularity = 0;
    }
    if (animeData.hasOwnProperty('isFeatured') && animeData.isFeatured === undefined) {
       // Default to false if isFeatured is explicitly set to undefined
       updatePayload.isFeatured = false;
    }
    
    // Remove top-level undefined properties to prevent errors,
    // except for those explicitly handled to become null or default.
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined && 
          !['trailerUrl', 'bannerImage', 'aniListId', 'averageRating', 'popularity', 'isFeatured'].includes(key)) { 
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
      url: episodeData.url === '' ? undefined : (episodeData.url !== undefined ? episodeData.url : episodes[episodeIndex].url),
      thumbnail: episodeData.thumbnail === '' ? undefined : (episodeData.thumbnail !== undefined ? episodeData.thumbnail : episodes[episodeIndex].thumbnail),
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
    const q = query(animesCollection, limit(1000)); 
    const querySnapshot = await getDocs(q);
    const genresSet = new Set<string>();
    querySnapshot.forEach(docSnap => {
      const anime = docSnap.data() as Anime;
      if (anime.genre && Array.isArray(anime.genre)) {
        anime.genre.forEach(g => {
          if (typeof g === 'string' && g.trim() !== '') {
            genresSet.add(g.trim());
          }
        });
      }
    });
    if (genresSet.size === 0) {
      console.warn("getUniqueGenres: No genres found. Returning a comprehensive default list.");
      return ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Romance', 'Horror', 'Mystery', 'Thriller', 'Sports', 'Supernatural', 'Mecha', 'Historical', 'Music', 'School', 'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Psychological', 'Ecchi', 'Harem', 'Demons', 'Magic', 'Martial Arts', 'Military', 'Parody', 'Police', 'Samurai', 'Space', 'Super Power', 'Vampire', 'Game', 'Animation', 'Crime', 'Family', 'Kids', 'Reality', 'Soap', 'Talk', 'War & Politics', 'Western' ].sort();
    }
    return Array.from(genresSet).sort();
  } catch (error) {
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
    
    // Firestore does not support case-insensitive search or "contains" directly in a scalable way without 3rd party tools (e.g. Algolia)
    // A common workaround is to store a lowercased version of the title or keywords for searching.
    // For simplicity, we'll fetch based on prefix and then filter client-side, which is not ideal for large datasets.
    // A more robust solution would involve dedicated search services.
    
    const titleQueryConstraints: QueryConstraint[] = [
        orderBy('title'), 
        startAt(searchTermCapitalized),
        endAt(searchTermCapitalized + '\uf8ff'), 
        limit(effectiveCount * 2) // Fetch more to allow for client-side filtering
    ];
    const titleQuery = query(animesCollection, ...titleQueryConstraints);
    const titleSnapshot = await getDocs(titleQuery);
    let results = titleSnapshot.docs.map(docSnap => convertAnimeTimestampsForClient(docSnap.data() as Anime));

    // Client-side filtering for actual "contains" and genre match
    results = results.filter(anime =>
      anime.title.toLowerCase().includes(lowerSearchTerm) ||
      anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
    );

    // Re-sort based on relevance (exact match, startsWith, then popularity)
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
        
        // Fallback to popularity then title if no strong relevance difference
        if ((b.popularity || 0) !== (a.popularity || 0)) {
            return (b.popularity || 0) - (a.popularity || 0);
        }
        return aTitleLower.localeCompare(bTitleLower);
    });

    return results.slice(0, effectiveCount);

  } catch (error) {
    // If prefix search fails due to missing index (orderBy title is basic, but combined with other implicit things might need one)
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
        console.warn("Search by title prefix failed due to missing index. Attempting broader client-side search for:", searchTerm, error.message);
        // Fallback to fetching more data (e.g., recently updated or popular) and filtering client-side
        try {
            // Fetching a broader set of data, e.g., 200 most popular/recent animes
            const allAnimes = await getAllAnimes({ count: 200, filters: { sortBy: 'popularity', sortOrder: 'desc'} }); 
            let filtered = allAnimes.filter(anime =>
                anime.title.toLowerCase().includes(lowerSearchTerm) ||
                anime.genre.some(g => g.toLowerCase().includes(lowerSearchTerm))
            );
            // Re-sort as above
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
