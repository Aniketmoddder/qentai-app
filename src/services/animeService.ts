'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  documentId,
  QueryConstraint,
  writeBatch,
  serverTimestamp,
  FirestoreError
} from 'firebase/firestore';
import type { Anime, Episode } from '@/types/anime';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';
import { slugify } from '@/lib/stringUtils';
import { fetchAniListMediaDetails } from './aniListService'; // For fetching additional data

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


export async function getAllAnimes(
  options: {
    count?: number;
    filters?: {
      genre?: string;
      type?: Anime['type'];
      featured?: boolean;
      sortBy?: 'title' | 'year' | 'averageRating' | 'updatedAt' | 'popularity';
      sortOrder?: 'asc' | 'desc';
    };
  } = {} // Default options object
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
  if (filters.featured !== undefined) {
    queryConstraints.push(where('isFeatured', '==', filters.featured));
  }

  // Default sort if not specified, or if specific filters are applied that might conflict with default sort
  let effectiveSortBy = filters.sortBy;
  let effectiveSortOrder = filters.sortOrder || 'desc';

  if (!effectiveSortBy) {
    if (filters.featured) {
      effectiveSortBy = 'updatedAt'; // Or 'popularity' if available and preferred for featured
      effectiveSortOrder = 'desc';
    } else if (filters.genre || filters.type) {
      effectiveSortBy = 'popularity'; // Example: default sort by popularity for filtered views
      effectiveSortOrder = 'desc';
    } else {
      effectiveSortBy = 'updatedAt'; // General default sort
      effectiveSortOrder = 'desc';
    }
  }
  
  if (effectiveSortBy) {
    queryConstraints.push(orderBy(effectiveSortBy, effectiveSortOrder));
  }
  
  // Always add a default secondary sort by title if not already sorting by title, for consistent ordering
  if (effectiveSortBy !== 'title') {
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
     const firestoreError = handleFirestoreError(error, `getAllAnimes with filters: ${JSON.stringify(filters)}, count: ${count}`);
    if (firestoreError.code === 'failed-precondition' && firestoreError.message.includes("index")) {
        console.error("Query for getAllAnimes requires a composite index. Please create it in Firebase console. Query details:", queryConstraints.map(qc => qc.type));
         // Fallback to a simpler query or return empty array to avoid app crash
        try {
            const fallbackQueryConstraints = [orderBy('updatedAt', 'desc'), limit(count > 0 ? count : 5)];
            const fallbackQuery = query(animesCollection, ...fallbackQueryConstraints);
            const fallbackSnapshot = await getDocs(fallbackQuery);
            console.warn("Falling back to simpler query due to missing index.");
            return fallbackSnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
        } catch (fallbackError) {
            console.error("Fallback query also failed:", fallbackError);
            throw firestoreError; // Re-throw original error if fallback fails
        }
    }
    throw firestoreError;
  }
}

export async function getFeaturedAnimes(
   options: {
    count?: number;
    filters?: {
      sortBy?: 'title' | 'year' | 'averageRating' | 'updatedAt' | 'popularity';
      sortOrder?: 'asc' | 'desc';
    };
  } = {}
): Promise<Anime[]> {
   const { count = 5, filters = {} } = options;
   const effectiveSortBy = filters.sortBy || 'updatedAt'; // Default sort for featured
   const effectiveSortOrder = filters.sortOrder || 'desc';

  try {
    const q = query(
      animesCollection,
      where('isFeatured', '==', true),
      orderBy(effectiveSortBy, effectiveSortOrder), // Ensure this index exists
      orderBy('title', 'asc'), // Secondary sort for consistency
      limit(count > 0 ? count : 5)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
  } catch (error) {
    const firestoreError = handleFirestoreError(error, `getFeaturedAnimes with sort: ${effectiveSortBy} ${effectiveSortOrder}`);
     if (firestoreError.code === 'failed-precondition' && firestoreError.message.includes("index")) {
        console.error("Query for getFeaturedAnimes requires a composite index: isFeatured (true) + " + effectiveSortBy + " (" + effectiveSortOrder + ") + title (asc). Please create it in Firebase console.");
         // Fallback to simpler query or return empty array
        try {
            const fallbackQuery = query(animesCollection, where('isFeatured', '==', true), limit(count > 0 ? count : 5));
            const fallbackSnapshot = await getDocs(fallbackQuery);
            console.warn("Falling back to simpler query for getFeaturedAnimes due to missing index.");
            return fallbackSnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
        } catch (fallbackError) {
            console.error("Fallback query for getFeaturedAnimes also failed:", fallbackError);
             throw firestoreError;
        }
    }
    throw firestoreError;
  }
}


export const addAnimeToFirestore = async (animeData: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const animeIdSlug = slugify(animeData.title);
  const docRef = doc(animesCollection, animeIdSlug);

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      // Document with this slug already exists, handle as an update or throw error
      // For now, let's update it, or you might want to return an error/warning
      console.warn(`Anime with slug ${animeIdSlug} already exists. Updating it.`);
      await updateDoc(docRef, {
        ...animeData,
        trailerUrl: animeData.trailerUrl || null,
        updatedAt: serverTimestamp(),
      });
      return animeIdSlug;
    } else {
      // Document does not exist, create it
      await setDoc(docRef, {
        ...animeData,
        id: animeIdSlug, // Ensure the slug is also stored in the document if needed elsewhere
        trailerUrl: animeData.trailerUrl || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return animeIdSlug;
    }
  } catch (error) {
    throw handleFirestoreError(error, `addAnimeToFirestore (slug: ${animeIdSlug})`);
  }
};

export const updateAnimeInFirestore = async (animeId: string, animeData: Partial<Omit<Anime, 'id' | 'createdAt' | 'episodes'>>): Promise<void> => {
  const docRef = doc(animesCollection, animeId);
  const updateData = {
    ...animeData,
    trailerUrl: animeData.trailerUrl !== undefined ? (animeData.trailerUrl || null) : undefined, // Handle empty string to null
    updatedAt: serverTimestamp(),
  };
  // Remove undefined fields from updateData to avoid Firestore errors, except for trailerUrl which can be explicitly set to null
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] === undefined && key !== 'trailerUrl') {
      delete updateData[key as keyof typeof updateData];
    }
  });

  try {
    await updateDoc(docRef, updateData);
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeInFirestore (id: ${animeId})`);
  }
};


export const deleteAnimeFromFirestore = async (animeId: string): Promise<void> => {
  const docRef = doc(animesCollection, animeId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    throw handleFirestoreError(error, `deleteAnimeFromFirestore (id: ${animeId})`);
  }
};

export const getAnimeById = async (animeId: string): Promise<Anime | undefined> => {
  if (!animeId) return undefined;
  const docRef = doc(animesCollection, animeId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let animeData = convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime;
      
      // If AniList ID exists and characters/studios are not yet populated or need refresh
      if (animeData.aniListId && (!animeData.characters || !animeData.studios || animeData.characters.length === 0 || animeData.studios.length === 0 )) {
        const anilistDetails = await fetchAniListMediaDetails(animeData.aniListId);
        if (anilistDetails) {
          // Merge AniList data carefully
          animeData.bannerImage = anilistDetails.bannerImage || animeData.bannerImage;
          if (anilistDetails.coverImage?.extraLarge || anilistDetails.coverImage?.large) {
            animeData.coverImage = anilistDetails.coverImage.extraLarge || anilistDetails.coverImage.large || animeData.coverImage;
          }
          animeData.characters = anilistDetails.characters?.edges?.map(edge => ({
            id: edge.node.id,
            name: edge.node.name?.userPreferred || edge.node.name?.full || null,
            role: edge.role || 'SUPPORTING',
            image: edge.node.image?.large || null,
            voiceActors: edge.voiceActors?.map(va => ({
              id: va.id,
              name: va.name?.userPreferred || va.name?.full || null,
              image: va.image?.large || null,
              language: va.languageV2 || 'Unknown'
            })) || []
          })) || animeData.characters;

          animeData.studios = anilistDetails.studios?.edges
            ?.filter(edge => edge.node.isAnimationStudio)
            .map(edge => ({id: edge.node.id, name: edge.node.name, isAnimationStudio: edge.node.isAnimationStudio })) || animeData.studios;

          animeData.averageScore = anilistDetails.averageScore ?? animeData.averageScore;
          animeData.popularity = anilistDetails.popularity ?? animeData.popularity;
          animeData.season = anilistDetails.season ?? animeData.season;
          // Ensure seasonYear is only updated if anilistDetails.seasonYear is a valid number
          if (typeof anilistDetails.seasonYear === 'number') {
            animeData.seasonYear = anilistDetails.seasonYear;
          }
          animeData.format = anilistDetails.format ?? animeData.format;
          animeData.duration = anilistDetails.duration ?? animeData.duration;
          animeData.episodesCount = anilistDetails.episodes ?? animeData.episodesCount;
          
          if (anilistDetails.startDate?.year) {
            animeData.airedFrom = `${anilistDetails.startDate.year}-${String(anilistDetails.startDate.month || 1).padStart(2, '0')}-${String(anilistDetails.startDate.day || 1).padStart(2, '0')}`;
          }
          if (anilistDetails.endDate?.year) {
            animeData.airedTo = `${anilistDetails.endDate.year}-${String(anilistDetails.endDate.month || 1).padStart(2, '0')}-${String(anilistDetails.endDate.day || 1).padStart(2, '0')}`;
          }
          if(anilistDetails.trailer?.site === 'youtube' && anilistDetails.trailer?.id) {
            animeData.trailerUrl = `https://www.youtube.com/watch?v=${anilistDetails.trailer.id}`;
          }
        }
      }
      return animeData;
    }
    return undefined;
  } catch (error) {
     const firestoreError = handleFirestoreError(error, `getAnimeById (id: ${animeId})`);
    if (firestoreError.code === 'failed-precondition' && firestoreError.message.includes("index")) {
        console.error(`Firestore query for getAnimeById (id: ${animeId}) failed due to missing index. This is unusual for a direct document fetch. Check Firestore logs.`);
    }
    throw firestoreError;
  }
};


export async function getUniqueGenres(): Promise<string[]> {
  try {
    const querySnapshot = await getDocs(query(animesCollection, limit(500))); // Sample a larger set to find genres
    const genresSet = new Set<string>();
    querySnapshot.docs.forEach(doc => {
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

    await updateDoc(animeRef, { episodes: episodes, updatedAt: serverTimestamp() });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeEpisode (animeId: ${animeId}, episodeId: ${episodeId})`);
  }
}

const MAX_IDS_PER_QUERY = 30; // Firestore 'in' query limit is 30
export async function getAnimesByIds(ids: string[]): Promise<Anime[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(ids)); // Remove duplicate IDs
  const allFetchedAnimes: Anime[] = [];
  
  try {
    for (let i = 0; i < uniqueIds.length; i += MAX_IDS_PER_QUERY) {
      const batchIds = uniqueIds.slice(i, i + MAX_IDS_PER_QUERY);
      if (batchIds.length === 0) continue;

      const q = query(animesCollection, where(documentId(), 'in', batchIds));
      const querySnapshot = await getDocs(q);
      
      const animesFromBatch = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
      allFetchedAnimes.push(...animesFromBatch);
    }
    // Re-order to match original IDs order if necessary, though Firestore doesn't guarantee order for 'in' queries.
    // For simplicity, we'll return them as fetched. If order is critical, manual re-sorting might be needed.
    return allFetchedAnimes;

  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByIds (ids: ${ids.join(',')})`);
  }
}

export async function searchAnimes(searchTerm: string): Promise<Anime[]> {
    if (!searchTerm || searchTerm.trim() === "") {
        return [];
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    try {
        // Firestore doesn't support native full-text search well for partial matches across multiple fields easily.
        // A common approach for basic search is to query for exact matches on indexed fields or use array-contains for genres.
        // For more advanced search, consider Algolia, Elasticsearch, or Typesense.

        // Basic implementation: Search by title (case-insensitive prefix) and genre
        // This requires an index on 'title' (ascending) for range queries, or you fetch all and filter client-side (not recommended for large datasets).
        // Let's try a broader approach first, fetch a larger set and filter.
        
        // Fetching a broader set and filtering. This is not ideal for performance on very large datasets.
        // A proper search solution would involve a dedicated search service or more complex Firestore data structuring.
        const allAnimesList = await getAllAnimes({ count: 300 }); // Fetch a reasonable number of anime

        const results = allAnimesList.filter(anime => {
            const titleMatch = anime.title.toLowerCase().includes(lowerCaseSearchTerm);
            const genreMatch = anime.genre.some(g => g.toLowerCase().includes(lowerCaseSearchTerm));
            const idMatch = anime.id.toLowerCase().includes(lowerCaseSearchTerm);
            // Add more fields to search if needed, e.g., synopsis, year
            // const yearMatch = anime.year.toString().includes(searchTerm);
            return titleMatch || genreMatch || idMatch;
        });
        
        // Sort results by relevance (e.g., title matches first, then genre)
        results.sort((a, b) => {
            const aTitleMatch = a.title.toLowerCase().startsWith(lowerCaseSearchTerm);
            const bTitleMatch = b.title.toLowerCase().startsWith(lowerCaseSearchTerm);
            if (aTitleMatch && !bTitleMatch) return -1;
            if (!aTitleMatch && bTitleMatch) return 1;
            return 0; // Keep original order or add more sorting criteria
        });

        return results.slice(0, 50); // Limit results

    } catch (error) {
        throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
    }
}

export async function updateAnimeIsFeatured(animeId: string, isFeatured: boolean): Promise<void> {
  const docRef = doc(animesCollection, animeId);
  try {
    await updateDoc(docRef, { isFeatured: isFeatured, updatedAt: serverTimestamp() });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeIsFeatured (id: ${animeId})`);
  }
}

export async function clearAllAnimeData(): Promise<void> {
  // Be very careful with this function. It will delete all documents in the 'animes' collection.
  // This is intended for testing/resetting purposes only.
  console.warn("Attempting to delete all anime data. This is a destructive operation.");
  try {
    const querySnapshot = await getDocs(animesCollection);
    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log("All anime data successfully deleted.");
  } catch (error) {
    throw handleFirestoreError(error, 'clearAllAnimeData');
  }
}
