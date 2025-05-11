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

  const primarySortField = sortBy || 
                           (featured ? 'popularity' : 
                           (genre ? 'popularity' : 
                           (type ? 'popularity' : 'updatedAt')));
  const primarySortOrder = sortOrder;

  queryConstraints.push(orderBy(primarySortField, primarySortOrder));

  // Add secondary sort by title for consistency, ONLY IF the primary sort is NOT title.
  // This helps avoid some complex index requirements when filters are also applied.
  if (primarySortField !== 'title') {
    // If primary sort is 'asc', secondary title sort should also be 'asc' for intuitive ordering.
    // If primary sort is 'desc', secondary title sort 'asc' still makes sense for A-Z tie-breaking.
    queryConstraints.push(orderBy('title', 'asc'));
  }


  if (count > 0) {
    queryConstraints.push(limit(count));
  } else if (count === -1) { 
    queryConstraints.push(limit(500)); 
  }


  try {
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
        console.warn(`Firestore query requires an index. Firestore error: ${error.message}. Query: filters=${JSON.stringify(filters)}, sortBy=${primarySortField}, sortOrder=${primarySortOrder}, secondarySort=title ASC.`);
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
      
      if (animeData.aniListId && (!animeData.characters || !animeData.bannerImage || !animeData.averageScore)) {
        const aniListDetails = await fetchAniListMediaDetails(animeData.aniListId);
        if (aniListDetails) {
          const updatedDetails: Partial<Anime> = {
            bannerImage: aniListDetails.bannerImage || animeData.bannerImage, 
            coverImage: aniListDetails.coverImage?.extraLarge || aniListDetails.coverImage?.large || animeData.coverImage,
            averageScore: aniListDetails.averageScore || animeData.averageScore,
            synopsis: aniListDetails.description || animeData.synopsis, 
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
      episodes: animeData.episodes || [],
      trailerUrl: animeData.trailerUrl === '' ? undefined : animeData.trailerUrl,
      bannerImage: animeData.bannerImage === '' ? undefined : animeData.bannerImage,
      aniListId: animeData.aniListId ? Number(animeData.aniListId) : undefined,
      averageRating: animeData.averageRating === null || animeData.averageRating === undefined ? undefined : Number(animeData.averageRating),
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

export async function getFeaturedAnimes(
  options: {
    count?: number;
    filters?: { sortBy?: 'updatedAt' | 'popularity'; sortOrder?: 'asc' | 'desc' };
  } = { count: 5, filters: {} }
): Promise<Anime[]> {
  const { count = 5, filters = {} } = options;
  const { sortBy = 'updatedAt', sortOrder = 'desc' } = filters; 

  const queryConstraints: QueryConstraint[] = [
    where('isFeatured', '==', true),
    orderBy(sortBy, sortOrder), 
    // Removed secondary sort by 'title' to avoid complex index requirements for featured items.
    // Firestore's default document ID sorting will act as a tie-breaker.
  ];

  if (count > 0) {
    queryConstraints.push(limit(count));
  }

  try {
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);
  } catch (error) {
     if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Firestore query for featured animes (isFeatured: true, orderBy: ${sortBy} ${sortOrder}) might require a simpler index (e.g., on 'isFeatured' and '${sortBy}' ${sortOrder}). Original error: ${error.message}`);
    }
    throw handleFirestoreError(error, `getFeaturedAnimes with options: ${JSON.stringify(options)}`);
  }
}


export async function searchAnimes(searchText: string, count: number = 20): Promise<Anime[]> {
  if (!searchText.trim()) return [];
  
  const lowerSearchText = searchText.toLowerCase();
  try {
    const q = query(animesCollection, orderBy('updatedAt', 'desc'), limit(200));
    const querySnapshot = await getDocs(q);
    const allFetchedAnimes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime) as Anime);

    const filteredResults = allFetchedAnimes.filter(anime => {
      const titleMatch = anime.title.toLowerCase().includes(lowerSearchText);
      const genreMatch = anime.genre.some(g => g.toLowerCase().includes(lowerSearchText));
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
    const fetchedAnimes: Anime[] = [];
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

export async function getAnimeByAniListId(aniListId: number): Promise<Anime | null> {
  if (!aniListId) return null;
  try {
    const q = query(animesCollection, where("aniListId", "==", aniListId), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const animeDoc = querySnapshot.docs[0];
      return convertAnimeTimestampsForClient(animeDoc.data() as Anime) as Anime;
    }
    return null;
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      console.warn(`Firestore query in getAnimeByAniListId requires an index on 'aniListId'. Please create this index. Original error: ${error.message}`);
    }
    throw handleFirestoreError(error, `getAnimeByAniListId (aniListId: ${aniListId})`);
  }
}
