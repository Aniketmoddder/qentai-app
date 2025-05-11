'use server'; 

import { db } from '@/lib/firebase';
import type { Anime, Episode } from '@/types/anime';
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
  documentId,
  QueryConstraint,
  FirestoreError,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { fetchAniListMediaDetails } from './aniListService'; 
import { convertAnimeTimestampsForClient, mapAniListStatusToAppStatus, mapAniListFormatToAppType } from '@/lib/animeUtils';
import { slugify } from '@/lib/stringUtils';

const animesCollection = collection(db, 'animes');

const handleFirestoreError = (error: unknown, context: string, queryDetails?: string): FirestoreError => {
  console.error(`Firestore Error in ${context}:`, error, queryDetails ? `Query: ${queryDetails}` : '');
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
      sortBy?: 'averageRating' | 'year' | 'title' | 'createdAt' | 'updatedAt' | 'popularity';
      sortOrder?: 'asc' | 'desc';
      featured?: boolean;
    };
  } = {}
): Promise<Anime[]> {
  const currentOptions = { count: 20, filters: {}, ...options };
  // Ensure filters is an object, even if options.filters is undefined
  const currentFilters = { sortOrder: 'desc', ...(currentOptions.filters || {}) }; 
  const { count } = currentOptions;
  const { genre, type, sortBy: userSortBy, sortOrder, featured } = currentFilters;

  const queryConstraints: QueryConstraint[] = [];

  if (genre) {
    queryConstraints.push(where('genre', 'array-contains', genre));
  }
  if (type) {
    queryConstraints.push(where('type', '==', type));
  }
  if (featured !== undefined) {
    queryConstraints.push(where('isFeatured', '==', featured));
  }

  let sortBy = userSortBy;
  let effectiveSortOrder = sortOrder || 'desc'; 

  if (!sortBy) { 
    if (featured) {
      sortBy = 'title'; 
      effectiveSortOrder = 'asc';
    } else if (genre || type) {
      sortBy = 'popularity';
      effectiveSortOrder = 'desc';
    } else { 
      sortBy = 'updatedAt';
      effectiveSortOrder = 'desc';
    }
  }
  
  queryConstraints.push(orderBy(sortBy, effectiveSortOrder));
  
  // To avoid needing too many composite indexes, only add secondary sort if it's a general browse.
  // If specific filters (genre, type, featured) are applied, rely on the primary sort.
  if (sortBy !== 'title' && !genre && !type && featured === undefined) {
    queryConstraints.push(orderBy('title', 'asc'));
  }
  
  if (count > 0) {
    queryConstraints.push(limit(count));
  } else if (count === -1) { 
    queryConstraints.push(limit(500)); 
  }

  const queryDebugString = `Collection: animes, Constraints: ${JSON.stringify(queryConstraints.map(c => c.type))}`;
  // console.log("getAllAnimes query:", queryDebugString, "Full constraints:", JSON.stringify(queryConstraints, null, 2));


  try {
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient({ id: docSnap.id, ...docSnap.data() } as Anime));
  } catch (error) {
    const context = `getAllAnimes with options: ${JSON.stringify(options)}`;
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
        console.warn(`Firestore query in ${context} requires an index. Firestore error: ${error.message}. Query details: filters=${JSON.stringify(currentFilters)}, primarySort=${sortBy} ${effectiveSortOrder}.`);
    }
    throw handleFirestoreError(error, context, queryDebugString);
  }
}


export async function getAnimeById(id: string): Promise<Anime | undefined> {
  const docRef = doc(db, 'animes', id);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let animeData = convertAnimeTimestampsForClient({ id: docSnap.id, ...docSnap.data() } as Anime);
      
      if (animeData.aniListId && (!animeData.characters || !animeData.bannerImage || !animeData.averageScore || !animeData.studios || !animeData.airedFrom)) {
        const aniListDetails = await fetchAniListMediaDetails(animeData.aniListId);
        if (aniListDetails) {
          const updatedDetails: Partial<Anime> = {
            bannerImage: aniListDetails.bannerImage || animeData.bannerImage, 
            coverImage: aniListDetails.coverImage?.extraLarge || aniListDetails.coverImage?.large || animeData.coverImage,
            averageScore: aniListDetails.averageScore ? aniListDetails.averageScore / 10 : animeData.averageScore, 
            averageRating: aniListDetails.averageScore ? aniListDetails.averageScore / 10 : animeData.averageRating,
            synopsis: aniListDetails.description || animeData.synopsis, 
            genre: aniListDetails.genres || animeData.genre,
            status: mapAniListStatusToAppStatus(aniListDetails.status) || animeData.status,
            type: mapAniListFormatToAppType(aniListDetails.format) || animeData.type,
            season: aniListDetails.season || animeData.season,
            seasonYear: aniListDetails.seasonYear || animeData.seasonYear,
            countryOfOrigin: aniListDetails.countryOfOrigin || animeData.countryOfOrigin,
            studios: aniListDetails.studios?.edges.filter(edge => edge.node.isAnimationStudio).map(edge => edge.node) || animeData.studios,
            source: aniListDetails.source || animeData.source,
            popularity: aniListDetails.popularity || animeData.popularity,
            format: aniListDetails.format || animeData.format,
            duration: aniListDetails.duration || animeData.duration,
            airedFrom: aniListDetails.startDate && aniListDetails.startDate.year && aniListDetails.startDate.month && aniListDetails.startDate.day ? new Date(aniListDetails.startDate.year, aniListDetails.startDate.month -1, aniListDetails.startDate.day).toISOString() : animeData.airedFrom,
            airedTo: aniListDetails.endDate && aniListDetails.endDate.year && aniListDetails.endDate.month && aniListDetails.endDate.day ? new Date(aniListDetails.endDate.year, aniListDetails.endDate.month -1, aniListDetails.endDate.day).toISOString() : animeData.airedTo,
            episodesCount: aniListDetails.episodes || animeData.episodesCount,
            trailerUrl: aniListDetails.trailer?.site === 'youtube' && aniListDetails.trailer.id ? `https://www.youtube.com/watch?v=${aniListDetails.trailer.id}` : animeData.trailerUrl,
            characters: aniListDetails.characters?.edges?.map(edge => ({
              id: edge.node.id,
              name: edge.node.name?.userPreferred || edge.node.name?.full || null,
              role: edge.role || 'SUPPORTING',
              image: edge.node.image?.large || null,
              voiceActors: edge.voiceActors?.map(va => ({
                id: va.id,
                name: va.name?.userPreferred || va.name?.full || null,
                image: va.image?.large || null,
                language: va.languageV2 || undefined
              })) || []
            })) || animeData.characters,
          };
          
          updateAnimeInFirestore(id, updatedDetails).catch(err => console.error("Error auto-updating anime with AniList data:", err));
          animeData = { ...animeData, ...updatedDetails };
        }
      }
      return animeData;
    }
    return undefined;
  } catch (error) {
    throw handleFirestoreError(error, `getAnimeById (id: ${id})`);
  }
}

export async function addAnimeToFirestore(animeData: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const generatedId = slugify(animeData.title);
  if (!generatedId) {
    throw new Error("Failed to generate ID from title. Title might be empty or invalid.");
  }

  const docRef = doc(db, 'animes', generatedId);

  const docSnap = await getDoc(docRef);
  
  try {
    const dataWithTimestamps = {
      ...animeData,
      createdAt: docSnap.exists() && docSnap.data().createdAt ? docSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      episodes: animeData.episodes || [],
      trailerUrl: animeData.trailerUrl === '' ? undefined : animeData.trailerUrl,
      bannerImage: animeData.bannerImage === '' ? undefined : animeData.bannerImage,
      aniListId: animeData.aniListId ? Number(animeData.aniListId) : undefined,
      averageRating: animeData.averageRating === null || animeData.averageRating === undefined ? undefined : Number(animeData.averageRating),
      averageScore: animeData.averageScore === null || animeData.averageScore === undefined ? undefined : Number(animeData.averageScore),
      popularity: animeData.popularity === null || animeData.popularity === undefined ? undefined : Number(animeData.popularity),
    };
    await setDoc(docRef, dataWithTimestamps, { merge: true }); 
    return generatedId;
  } catch (error) {
    throw handleFirestoreError(error, `addAnimeToFirestore (id: ${generatedId})`);
  }
}

export async function updateAnimeInFirestore(id: string, animeData: Partial<Omit<Anime, 'id' | 'createdAt'>>): Promise<void> {
  const docRef = doc(db, 'animes', id);
  try {
    const dataToUpdate: { [key: string]: any } = {
      ...animeData,
      updatedAt: serverTimestamp(),
    };

    if (animeData.hasOwnProperty('trailerUrl')) {
      dataToUpdate.trailerUrl = animeData.trailerUrl === '' || animeData.trailerUrl === null ? undefined : animeData.trailerUrl;
    }
    if (animeData.hasOwnProperty('bannerImage')) {
      dataToUpdate.bannerImage = animeData.bannerImage === '' || animeData.bannerImage === null ? undefined : animeData.bannerImage;
    }
     if (animeData.hasOwnProperty('aniListId')) {
      dataToUpdate.aniListId = animeData.aniListId ? Number(animeData.aniListId) : undefined;
    }
    if (animeData.hasOwnProperty('averageRating')) {
      dataToUpdate.averageRating = animeData.averageRating === null || animeData.averageRating === undefined ? undefined : Number(animeData.averageRating);
    }
    if (animeData.hasOwnProperty('averageScore')) {
      dataToUpdate.averageScore = animeData.averageScore === null || animeData.averageScore === undefined ? undefined : Number(animeData.averageScore);
    }
     if (animeData.hasOwnProperty('popularity')) {
      dataToUpdate.popularity = animeData.popularity === null || animeData.popularity === undefined ? undefined : Number(animeData.popularity);
    }


    Object.keys(dataToUpdate).forEach(key => {
      if (dataToUpdate[key] === undefined && !['trailerUrl', 'bannerImage', 'aniListId', 'averageRating', 'averageScore', 'popularity'].includes(key)) {
        delete dataToUpdate[key];
      }
    });
    
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeInFirestore (id: ${id})`);
  }
}

export async function deleteAnimeFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, 'animes', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    throw handleFirestoreError(error, `deleteAnimeFromFirestore (id: ${id})`);
  }
}

export async function updateAnimeEpisode(animeId: string, episodeId: string, episodeData: Partial<Episode>): Promise<void> {
  const animeRef = doc(db, 'animes', animeId);
  try {
    const animeSnap = await getDoc(animeRef);
    if (animeSnap.exists()) {
      const anime = animeSnap.data() as Anime;
      const episodes = anime.episodes ? [...anime.episodes] : [];
      const episodeIndex = episodes.findIndex(ep => ep.id === episodeId);

      if (episodeIndex > -1) {
        const updatedEpisodeSpecificData = {
          ...episodeData,
          url: episodeData.url === '' || episodeData.url === null ? undefined : episodeData.url,
          thumbnail: episodeData.thumbnail === '' || episodeData.thumbnail === null ? undefined : episodeData.thumbnail,
          overview: episodeData.overview === '' || episodeData.overview === null ? undefined : episodeData.overview,
          duration: episodeData.duration === '' || episodeData.duration === null ? undefined : episodeData.duration,
        };

        episodes[episodeIndex] = { ...episodes[episodeIndex], ...updatedEpisodeSpecificData };
        await updateDoc(animeRef, { episodes: episodes, updatedAt: serverTimestamp() });
      } else {
        throw new Error(`Episode with ID ${episodeId} not found in anime ${animeId}.`);
      }
    } else {
      throw new Error(`Anime with ID ${animeId} not found.`);
    }
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeEpisode (animeId: ${animeId}, episodeId: ${episodeId})`);
  }
}

export async function getUniqueGenres(): Promise<string[]> {
  try {
    const querySnapshot = await getDocs(query(animesCollection, limit(500))); 
    const genresSet = new Set<string>();
    querySnapshot.docs.forEach(docSnap => {
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

export async function getFeaturedAnimes(
  options: {
    count?: number;
    filters?: { sortBy?: 'updatedAt' | 'popularity' | 'title'; sortOrder?: 'asc' | 'desc' };
  } = { count: 5, filters: {} }
): Promise<Anime[]> {
  const { count = 5, filters = {} } = options;
  // Default to sorting by title ASC if no specific sort is provided for featured, to align with common index errors
  const { sortBy = 'title', sortOrder = 'asc' } = filters; 

  const queryConstraints: QueryConstraint[] = [
    where('isFeatured', '==', true),
    orderBy(sortBy, sortOrder), 
  ];

  if (count > 0) {
    queryConstraints.push(limit(count));
  }

  const queryDebugString = `Collection: animes, Constraints: ${JSON.stringify(queryConstraints.map(c => (c as any)._f || (c as any).type || 'unknown_constraint'))}`;
  // console.log("getFeaturedAnimes query:", queryDebugString, "Full constraints:", JSON.stringify(queryConstraints, null, 2));

  try {
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient({ id: docSnap.id, ...docSnap.data() } as Anime));
  } catch (error) {
     const context = `getFeaturedAnimes with options: ${JSON.stringify(options)}`;
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Firestore query for featured animes (isFeatured: true, orderBy: ${sortBy} ${sortOrder}) might require a composite index. Check Firebase console. Original error: ${error.message}`);
    }
    throw handleFirestoreError(error, context, queryDebugString);
  }
}


export async function searchAnimes(searchText: string, count: number = 20): Promise<Anime[]> {
  if (!searchText.trim()) return [];
  
  const lowerSearchText = searchText.toLowerCase();
  // This is a client-side search simulation after fetching a larger dataset.
  // Not ideal for very large datasets but avoids complex indexing for full-text search.
  try {
    // Fetch a reasonable number of recently updated animes to search through
    const q = query(animesCollection, orderBy('updatedAt', 'desc'), limit(200)); 
    const querySnapshot = await getDocs(q);
    const allFetchedAnimes = querySnapshot.docs.map(docSnap => convertAnimeTimestampsForClient({ id: docSnap.id, ...docSnap.data() } as Anime));

    const filteredResults = allFetchedAnimes.filter(anime => {
      const titleMatch = anime.title.toLowerCase().includes(lowerSearchText);
      const genreMatch = anime.genre.some(g => g.toLowerCase().includes(lowerSearchText));
      // Add more fields to search if needed, e.g., synopsis
      return titleMatch || genreMatch;
    });

    return filteredResults.slice(0, count);
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (searchText: ${searchText})`);
  }
}


const MAX_IDS_PER_QUERY = 30; 

export async function getAnimesByIds(ids: string[]): Promise<Anime[]> {
  if (!ids || ids.length === 0) {
    return [];
  }
  try {
    const fetchedAnimesMap = new Map<string, Anime>();
    
    // Firestore 'in' queries are limited to 30 items in the array.
    for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
      const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
      if (batchIds.length > 0) {
        // Ensure documentId() is correctly used for querying by ID.
        const q = query(animesCollection, where(documentId(), 'in', batchIds));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
           // Ensure data is correctly cast and processed
           fetchedAnimesMap.set(docSnap.id, convertAnimeTimestampsForClient({ id: docSnap.id, ...docSnap.data() } as Anime));
        });
      }
    }
    // Preserve original order of IDs if needed, or just return the map's values
    return ids.map(id => fetchedAnimesMap.get(id)).filter(anime => anime !== undefined) as Anime[];

  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByIds (ids: ${ids.join(', ')})`);
  }
}

export async function updateAnimeIsFeatured(animeId: string, isFeatured: boolean): Promise<void> {
  const animeRef = doc(db, 'animes', animeId);
  try {
    await updateDoc(animeRef, {
      isFeatured: isFeatured,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeIsFeatured (animeId: ${animeId})`);
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

export async function getAnimeByAniListId(aniListId: number): Promise<Anime | null> {
  if (!aniListId) return null;
  try {
    const q = query(animesCollection, where("aniListId", "==", aniListId), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const animeDoc = querySnapshot.docs[0];
      return convertAnimeTimestampsForClient({ id: animeDoc.id, ...animeDoc.data()} as Anime);
    }
    return null;
  } catch (error) {
    const context = `getAnimeByAniListId (aniListId: ${aniListId})`;
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Firestore query in ${context} requires an index on 'aniListId'. Please create this index. Original error: ${error.message}`);
    }
    throw handleFirestoreError(error, context);
  }
}

    