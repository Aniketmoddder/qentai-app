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
  FirestoreError,
  setDoc 
} from 'firebase/firestore';
import type { Anime, Episode } from '@/types/anime';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';
import { slugify } from '@/lib/stringUtils';
import { fetchAniListMediaDetails } from './aniListService';

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
  if (filters.featured !== undefined) {
    queryConstraints.push(where('isFeatured', '==', filters.featured));
  }

  let effectiveSortBy = filters.sortBy;
  let effectiveSortOrder = filters.sortOrder || 'desc';

  if (!effectiveSortBy) {
    if (filters.featured) {
      effectiveSortBy = 'updatedAt';
      effectiveSortOrder = 'desc';
    } else if (filters.genre || filters.type) {
      effectiveSortBy = 'popularity';
      effectiveSortOrder = 'desc';
    } else {
      effectiveSortBy = 'updatedAt';
      effectiveSortOrder = 'desc';
    }
  }
  
  if (effectiveSortBy) {
    queryConstraints.push(orderBy(effectiveSortBy, effectiveSortOrder));
  }
  
  if (effectiveSortBy !== 'title') {
     queryConstraints.push(orderBy('title', 'asc'));
  }

  if (count > 0) {
    queryConstraints.push(limit(count));
  } else if (count === -1) {
    // No limit, fetch all
  } else {
     queryConstraints.push(limit(20)); // Default limit if count is 0 or not specified positively
  }


  q = query(animesCollection, ...queryConstraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
  } catch (error) {
     const firestoreError = handleFirestoreError(error, `getAllAnimes with filters: ${JSON.stringify(filters)}, count: ${count}`);
    if (firestoreError.code === 'failed-precondition' && firestoreError.message.includes("index")) {
        console.error("Query for getAllAnimes requires a composite index. Please create it in Firebase console. Query details:", queryConstraints.map(qc => (qc as any)._field ? `${(qc as any)._field.toString()} ${(qc as any)._op} ...` : qc.type));
        try {
            const fallbackQueryConstraints = [orderBy('updatedAt', 'desc'), limit(count > 0 ? count : 5)];
            const fallbackQuery = query(animesCollection, ...fallbackQueryConstraints);
            const fallbackSnapshot = await getDocs(fallbackQuery);
            console.warn("Falling back to simpler query due to missing index.");
            return fallbackSnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
        } catch (fallbackError) {
            console.error("Fallback query also failed:", fallbackError);
            throw firestoreError;
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
   const effectiveSortBy = filters.sortBy || 'popularity'; 
   const effectiveSortOrder = filters.sortOrder || 'desc';

  try {
    const q = query(
      animesCollection,
      where('isFeatured', '==', true),
      orderBy(effectiveSortBy, effectiveSortOrder),
      orderBy('title', 'asc'), 
      limit(count > 0 ? count : 5)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
  } catch (error) {
    const firestoreError = handleFirestoreError(error, `getFeaturedAnimes with sort: ${effectiveSortBy} ${effectiveSortOrder}`);
     if (firestoreError.code === 'failed-precondition' && firestoreError.message.includes("index")) {
        console.error("Query for getFeaturedAnimes requires a composite index: isFeatured (true) + " + effectiveSortBy + " (" + effectiveSortOrder + ") + title (asc). Please create it in Firebase console.");
        try {
            const fallbackQuery = query(animesCollection, where('isFeatured', '==', true), orderBy('title', 'asc'), limit(count > 0 ? count : 5));
            const fallbackSnapshot = await getDocs(fallbackQuery);
            console.warn("Falling back to simpler query for getFeaturedAnimes due to missing index (isFeatured == true, title ASC).");
            return fallbackSnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
        } catch (fallbackError) {
            console.error("Fallback query for getFeaturedAnimes also failed:", fallbackError);
             throw firestoreError;
        }
    }
    throw firestoreError;
  }
}

export async function addAnimeToFirestore(animeData: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const animeIdSlug = slugify(animeData.title);
  const docRef = doc(animesCollection, animeIdSlug);

  try {
    const docSnap = await getDoc(docRef);
    const dataToStore = {
      ...animeData,
      trailerUrl: animeData.trailerUrl || null, // Ensure empty string is stored as null
      id: animeIdSlug,
      updatedAt: serverTimestamp(),
    };
    if (docSnap.exists()) {
      console.warn(`Anime with slug ${animeIdSlug} already exists. Updating it.`);
      await updateDoc(docRef, dataToStore);
    } else {
      await setDoc(docRef, {
        ...dataToStore,
        createdAt: serverTimestamp(),
      });
    }
    return animeIdSlug;
  } catch (error) {
    throw handleFirestoreError(error, `addAnimeToFirestore (slug: ${animeIdSlug})`);
  }
}

export async function updateAnimeInFirestore(animeId: string, animeData: Partial<Omit<Anime, 'id' | 'createdAt' | 'episodes'>>): Promise<void> {
  const docRef = doc(animesCollection, animeId);
  const updateData: { [key: string]: any } = {
    ...animeData,
    updatedAt: serverTimestamp(),
  };

  if (animeData.hasOwnProperty('trailerUrl')) {
    updateData.trailerUrl = animeData.trailerUrl || null;
  }
  
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined && key !== 'trailerUrl') {
      delete updateData[key];
    }
  });

  try {
    await updateDoc(docRef, updateData);
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeInFirestore (id: ${animeId})`);
  }
}

export async function deleteAnimeFromFirestore(animeId: string): Promise<void> {
  const docRef = doc(animesCollection, animeId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    throw handleFirestoreError(error, `deleteAnimeFromFirestore (id: ${animeId})`);
  }
}

export async function getAnimeById(animeId: string): Promise<Anime | undefined> {
  if (!animeId) return undefined;
  const docRef = doc(animesCollection, animeId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let animeData = convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime;
      
      if (animeData.aniListId && (!animeData.characters || !animeData.studios || animeData.characters.length === 0 || animeData.studios.length === 0 )) {
        const anilistDetails = await fetchAniListMediaDetails(animeData.aniListId);
        if (anilistDetails) {
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

          animeData.averageRating = anilistDetails.averageScore ? parseFloat((anilistDetails.averageScore / 10).toFixed(1)) : animeData.averageRating;
          animeData.popularity = anilistDetails.popularity ?? animeData.popularity;
          animeData.season = anilistDetails.season ?? animeData.season;
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
}

export async function getUniqueGenres(): Promise<string[]> {
  try {
    // Fetch a larger sample or all documents if feasible to get all unique genres.
    // For very large collections, consider a separate 'genres' collection or a more optimized aggregation.
    const q = query(animesCollection, limit(500)); // Adjust limit as needed or remove for all if performance allows
    const querySnapshot = await getDocs(q);
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
    
    episodes[episodeIndex] = { ...episodes[episodeIndex], ...episodeData };

    await updateDoc(animeRef, { episodes: episodes, updatedAt: serverTimestamp() });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeEpisode (animeId: ${animeId}, episodeId: ${episodeId})`);
  }
}

const MAX_IDS_PER_QUERY = 30;
export async function getAnimesByIds(ids: string[]): Promise<Anime[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(ids)); 
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
        const allAnimesList = await getAllAnimes({ count: -1 }); // Fetch all to filter client-side

        const results = allAnimesList.filter(anime => {
            const titleMatch = anime.title.toLowerCase().includes(lowerCaseSearchTerm);
            const genreMatch = anime.genre.some(g => g.toLowerCase().includes(lowerCaseSearchTerm));
            const idMatch = anime.id.toLowerCase().includes(lowerCaseSearchTerm);
            return titleMatch || genreMatch || idMatch;
        });
        
        results.sort((a, b) => {
            const aTitleMatch = a.title.toLowerCase().startsWith(lowerCaseSearchTerm);
            const bTitleMatch = b.title.toLowerCase().startsWith(lowerCaseSearchTerm);
            if (aTitleMatch && !bTitleMatch) return -1;
            if (!aTitleMatch && bTitleMatch) return 1;
            // Further sort by popularity or rating if no direct start match
            return (b.popularity || 0) - (a.popularity || 0) || (b.averageRating || 0) - (a.averageRating || 0);
        });

        return results.slice(0, 50);

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
