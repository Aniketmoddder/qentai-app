'use server'; 

import { db } from '@/lib/firebase';
import type { Anime, Episode, Season } from '@/types/anime';
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
  documentId,
  QueryConstraint,
  FirestoreError,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { fetchAniListMediaDetails } from './aniListService'; 
import { convertAnimeTimestampsForClient, mapAniListStatusToAppStatus, mapAniListFormatToAppType } from '@/lib/animeUtils';


const animesCollection = collection(db, 'animes');

const handleFirestoreError = (error: unknown, context: string): FirestoreError => {
  console.error(`Firestore Error in ${context}:`, error);
  if (error instanceof FirestoreError) {
    return error;
  }
  const genericError = new FirestoreError('unknown', `An unknown error occurred in ${context}.`);
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    (genericError as any).message = error.message; // Type assertion for message property
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
      // No direct title search here, searchAnimes handles that
    };
  } = { count: 20, filters: {} }
): Promise<Anime[]> {
  const { count = 20, filters = {} } = options;
  const { genre, type, sortBy, sortOrder = 'desc', featured } = filters;

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

  if (sortBy) {
    queryConstraints.push(orderBy(sortBy, sortOrder));
  } else {
    // Default sorting logic if sortBy is not provided
    if (featured === true) {
        // For featured, a common sort might be by popularity or a manual order field if you add one.
        // If no specific featured sort, Firestore's default or by 'updatedAt' might be okay.
        queryConstraints.push(orderBy('popularity', 'desc')); // Example: sort featured by popularity
    } else if (genre) {
        // For genre pages, default to sorting by popularity or averageRating.
        queryConstraints.push(orderBy('popularity', 'desc')); 
    } else if (type) {
        // For type-specific pages, default to sorting by popularity or year.
        queryConstraints.push(orderBy('popularity', 'desc')); 
    } else {
        // Absolute default for "Browse All" or if no other filters specify sort
        queryConstraints.push(orderBy('updatedAt', 'desc'));
    }
  }
   // Always add a tie-breaker sort by title if not already sorting by title to ensure consistent pagination
  if (sortBy !== 'title') {
    queryConstraints.push(orderBy('title', 'asc'));
  }


  if (count > 0) {
    queryConstraints.push(limit(count));
  } else if (count === -1) { // Fetch all, up to Firestore limits or a reasonable max
    queryConstraints.push(limit(500)); // Example: Max 500 for "all"
  }


  try {
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
        console.warn(`Firestore query requires an index. Firestore error: ${error.message}. Please check the Firebase console for index creation suggestions based on your query: Filters used: ${JSON.stringify(filters)}, SortBy: ${sortBy}, SortOrder: ${sortOrder}`);
    }
    throw handleFirestoreError(error, `getAllAnimes with options: ${JSON.stringify(options)}`);
  }
}


export async function getAnimeById(id: string): Promise<Anime | undefined> {
  const docRef = doc(db, 'animes', id);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let animeData = convertAnimeTimestampsForClient(docSnap.data() as Anime) as Anime;
      
      // If AniList ID exists and basic AniList data might be missing, fetch/enrich it
      if (animeData.aniListId && (!animeData.characters || !animeData.bannerImage || !animeData.averageScore)) {
        const aniListDetails = await fetchAniListMediaDetails(animeData.aniListId);
        if (aniListDetails) {
          const updatedDetails: Partial<Anime> = {
            bannerImage: aniListDetails.bannerImage || animeData.bannerImage, // Prefer AniList if available
            coverImage: aniListDetails.coverImage?.extraLarge || aniListDetails.coverImage?.large || animeData.coverImage,
            averageScore: aniListDetails.averageScore || animeData.averageScore,
            synopsis: aniListDetails.description || animeData.synopsis, // Prefer AniList synopsis if available
            genre: aniListDetails.genres || animeData.genre,
            status: mapAniListStatusToAppStatus(aniListDetails.status) || animeData.status,
            type: mapAniListFormatToAppType(aniListDetails.format) || animeData.type,
            season: aniListDetails.season || animeData.season,
            seasonYear: aniListDetails.seasonYear || animeData.seasonYear,
            countryOfOrigin: aniListDetails.countryOfOrigin || animeData.countryOfOrigin,
            studios: aniListDetails.studios?.edges.map(edge => edge.node) || animeData.studios,
            source: aniListDetails.source || animeData.source,
            popularity: aniListDetails.popularity || animeData.popularity,
            format: aniListDetails.format || animeData.format,
            duration: aniListDetails.duration || animeData.duration,
            airedFrom: aniListDetails.startDate ? new Date(aniListDetails.startDate.year!, aniListDetails.startDate.month! -1, aniListDetails.startDate.day!).toISOString() : animeData.airedFrom,
            airedTo: aniListDetails.endDate ? new Date(aniListDetails.endDate.year!, aniListDetails.endDate.month! -1, aniListDetails.endDate.day!).toISOString() : animeData.airedTo,
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
          
          // Merge and update in Firestore (non-blocking for the current request)
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
  try {
    const dataWithTimestamps = {
      ...animeData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
       // Ensure episodes are at least an empty array if not provided
      episodes: animeData.episodes || [],
      // Ensure trailerUrl is undefined if empty string, otherwise use the value
      trailerUrl: animeData.trailerUrl === '' ? undefined : animeData.trailerUrl,
      // Ensure bannerImage is undefined if empty string
      bannerImage: animeData.bannerImage === '' ? undefined : animeData.bannerImage,
      // Ensure aniListId is number or undefined
      aniListId: animeData.aniListId ? Number(animeData.aniListId) : undefined,
    };
    const docRef = await addDoc(animesCollection, dataWithTimestamps);
    return docRef.id;
  } catch (error) {
    throw handleFirestoreError(error, 'addAnimeToFirestore');
  }
}

export async function updateAnimeInFirestore(id: string, animeData: Partial<Omit<Anime, 'id' | 'createdAt'>>): Promise<void> {
  const docRef = doc(db, 'animes', id);
  try {
    const dataToUpdate: { [key: string]: any } = {
      ...animeData,
      updatedAt: serverTimestamp(),
    };

    // Handle optional fields to ensure they are correctly set or removed
    if (animeData.hasOwnProperty('trailerUrl')) {
      dataToUpdate.trailerUrl = animeData.trailerUrl === '' ? undefined : animeData.trailerUrl;
    }
    if (animeData.hasOwnProperty('bannerImage')) {
      dataToUpdate.bannerImage = animeData.bannerImage === '' ? undefined : animeData.bannerImage;
    }
     if (animeData.hasOwnProperty('aniListId')) {
      dataToUpdate.aniListId = animeData.aniListId ? Number(animeData.aniListId) : undefined;
    }
    if (animeData.hasOwnProperty('averageRating')) {
      dataToUpdate.averageRating = animeData.averageRating === null || animeData.averageRating === undefined ? undefined : Number(animeData.averageRating);
    }


    // Remove undefined keys from the update payload to avoid Firestore errors, except for those intentionally set to undefined (like trailerUrl)
    Object.keys(dataToUpdate).forEach(key => {
      if (dataToUpdate[key] === undefined && !['trailerUrl', 'bannerImage', 'aniListId', 'averageRating'].includes(key)) {
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
        // Ensure URL is properly handled (set to undefined if empty string)
        const updatedEpisodeSpecificData = {
          ...episodeData,
          url: episodeData.url === '' ? undefined : episodeData.url,
          thumbnail: episodeData.thumbnail === '' ? undefined : episodeData.thumbnail,
          overview: episodeData.overview === '' ? undefined : episodeData.overview,
          duration: episodeData.duration === '' ? undefined : episodeData.duration,
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
    // This is inefficient for large datasets. Consider a separate 'genres' collection or aggregation.
    const querySnapshot = await getDocs(query(animesCollection, limit(500))); // Limit to avoid excessive reads
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

export async function getFeaturedAnimes(options: { count?: number; filters?: { sortBy?: 'updatedAt' | 'popularity'; sortOrder?: 'asc' | 'desc' } } = { count: 5, filters: {} }): Promise<Anime[]> {
  const { count = 5, filters = {} } = options;
  const { sortBy = 'updatedAt', sortOrder = 'desc' } = filters; // Default sort for featured

  const queryConstraints: QueryConstraint[] = [
    where('isFeatured', '==', true),
    orderBy(sortBy, sortOrder), // Example: sort featured by updatedAt or popularity
  ];
  
  // Add a secondary sort for consistency if not already sorting by title
  if (sortBy !== 'title') {
    queryConstraints.push(orderBy('title', 'asc'));
  }

  if (count > 0) {
    queryConstraints.push(limit(count));
  }


  try {
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Firestore query for featured animes requires an index. Details: ${error.message}. Query constraints: isFeatured == true, orderBy ${sortBy} ${sortOrder}, orderBy title asc.`);
    }
    throw handleFirestoreError(error, `getFeaturedAnimes with options: ${JSON.stringify(options)}`);
  }
}


// Basic text search across title and genres.
// For more advanced search, consider Algolia or Elasticsearch.
export async function searchAnimes(searchText: string, count: number = 20): Promise<Anime[]> {
  if (!searchText.trim()) return [];
  
  const lowerSearchText = searchText.toLowerCase();
  // This is a client-side filter after fetching a broader set. Not ideal for large datasets.
  // Firestore does not support direct text search or OR queries on different fields easily.
  try {
    // Fetch a larger initial set and filter locally.
    // This approach is NOT scalable and should be replaced with a proper search solution (e.g., Algolia, Typesense) for production.
    // For demonstration, we'll fetch a limited number of recent items and filter.
    const q = query(animesCollection, orderBy('updatedAt', 'desc'), limit(200));
    const querySnapshot = await getDocs(q);
    const allFetchedAnimes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);

    const filteredResults = allFetchedAnimes.filter(anime => {
      const titleMatch = anime.title.toLowerCase().includes(lowerSearchText);
      const genreMatch = anime.genre.some(g => g.toLowerCase().includes(lowerSearchText));
      // const synopsisMatch = anime.synopsis.toLowerCase().includes(lowerSearchText); // Optional: search synopsis
      return titleMatch || genreMatch;
    });

    return filteredResults.slice(0, count);
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (searchText: ${searchText})`);
  }
}


const MAX_IDS_PER_QUERY = 30; // Firestore 'in' query limit

export async function getAnimesByIds(ids: string[]): Promise<Anime[]> {
  if (!ids || ids.length === 0) {
    return [];
  }
  try {
    const fetchedAnimes: Anime[] = [];
    // Batch IDs because Firestore 'in' query has a limit (currently 30, was 10)
    for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
      const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
      if (batchIds.length > 0) {
        const q = query(animesCollection, where(documentId(), 'in', batchIds));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          fetchedAnimes.push(convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
        });
      }
    }
     // Re-order based on original IDs array if necessary, as Firestore doesn't guarantee order for 'in' queries
    return ids.map(id => fetchedAnimes.find(anime => anime.id === id)).filter(anime => anime !== undefined) as Anime[];

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
