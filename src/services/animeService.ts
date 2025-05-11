'use server';
import { db } from '@/lib/firebase';
import type { Anime, Episode, Character, VoiceActor, CharacterEdge, AniListStudioConnection, AniListStudioEdge } from '@/types/anime';
import type { AniListMedia } from '@/types/anilist';
import { fetchAniListMediaDetails, mapAniListStatusToAppStatus, mapAniListFormatToAppType } from './aniListService';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  Timestamp,
  FirestoreError,
  serverTimestamp,
  writeBatch,
  QueryConstraint,
  documentId,
} from 'firebase/firestore';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';

const animesCollection = collection(db, 'animes');

interface QueryFilters {
  type?: Anime['type'];
  genre?: string;
  sortBy?: 'averageRating' | 'year' | 'title' | 'createdAt' | 'updatedAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
}


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

// Helper function to transform AniList character data to our app's Character type
function transformAniListCharacters(aniListMedia: AniListMedia): Character[] {
  if (!aniListMedia.characters?.edges) {
    return [];
  }
  return aniListMedia.characters.edges.map((edge: CharacterEdge) => {
    const voiceActors: VoiceActor[] = (edge.voiceActors || []).map(vaNode => ({
      id: vaNode.id,
      name: vaNode.name?.userPreferred || vaNode.name?.full || null,
      image: vaNode.image?.large || null,
      language: vaNode.languageV2 || undefined,
    }));

    return {
      id: edge.node.id,
      name: edge.node.name?.userPreferred || edge.node.name?.full || null,
      image: edge.node.image?.large || null,
      role: edge.role || undefined,
      voiceActors: voiceActors.length > 0 ? voiceActors : undefined,
    };
  }).filter(char => char.name && char.image); // Ensure character has a name and image
}

const formatDate = (dateObj?: { year?: number | null, month?: number | null, day?: number | null }): string | undefined => {
  if (!dateObj || dateObj.year == null) return undefined;
  const year = dateObj.year;
  const month = dateObj.month ? String(dateObj.month).padStart(2, '0') : '01'; // Default to January if month missing
  const day = dateObj.day ? String(dateObj.day).padStart(2, '0') : '01';   // Default to 1st if day missing
  return `${year}-${month}-${day}`;
};


export const addAnimeToFirestore = async (animeData: Omit<Anime, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const animeDocRef = doc(animesCollection); 
    
    const newAnimeDataForDb = { 
      ...animeData,
      episodes: animeData.episodes || [], 
      tmdbId: animeData.tmdbId,
      aniListId: animeData.aniListId || null, 
      isFeatured: animeData.isFeatured || false, 
      trailerUrl: (animeData.trailerUrl === '' || animeData.trailerUrl === undefined || animeData.trailerUrl === null) ? null : animeData.trailerUrl,
      popularity: animeData.popularity || 0, // Ensure popularity has a default
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(), 
      id: animeDocRef.id 
    };

    const cleanedAnimeData: { [key: string]: any } = { ...newAnimeDataForDb };
    Object.keys(cleanedAnimeData).forEach(key => {
      if (cleanedAnimeData[key] === undefined) {
         delete cleanedAnimeData[key]; 
      }
    });
    
    await setDoc(animeDocRef, cleanedAnimeData);
    return animeDocRef.id;
  } catch (error) {
    throw handleFirestoreError(error, 'addAnimeToFirestore');
  }
};


export const getAnimeById = async (id: string): Promise<Anime | undefined> => {
  try {
    const docRef = doc(animesCollection, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let animeData = convertAnimeTimestampsForClient(docSnap.data() as Anime); 

      if (animeData.aniListId) {
        const aniListData = await fetchAniListMediaDetails(animeData.aniListId);
        if (aniListData) {
          animeData.title = aniListData.title?.userPreferred || aniListData.title?.english || aniListData.title?.romaji || animeData.title;
          animeData.bannerImage = aniListData.bannerImage || animeData.bannerImage;
          animeData.coverImage = aniListData.coverImage?.extraLarge || aniListData.coverImage?.large || animeData.coverImage;
          animeData.synopsis = aniListData.description || animeData.synopsis;
          if (aniListData.genres && aniListData.genres.length > 0) {
            animeData.genre = [...new Set([...animeData.genre, ...aniListData.genres])];
          }
          if (aniListData.averageScore) {
            // animeData.averageScore = aniListData.averageScore; // Keep AniList's 0-100 scale
            animeData.averageRating = parseFloat((aniListData.averageScore / 10).toFixed(1)); // Also provide 0-10 scale for consistency
          }
          if (aniListData.trailer?.site === 'youtube' && aniListData.trailer?.id) {
            animeData.trailerUrl = `https://www.youtube.com/watch?v=${aniListData.trailer.id}`;
          }
          
          animeData.characters = transformAniListCharacters(aniListData);
          animeData.sourceAdmin = animeData.sourceAdmin === 'tmdb' ? 'tmdb_anilist' : (animeData.sourceAdmin || 'anilist');

          // Map new fields
          animeData.season = aniListData.season || undefined;
          animeData.seasonYear = aniListData.seasonYear || animeData.year; // Fallback to existing year if seasonYear is null
          animeData.countryOfOrigin = aniListData.countryOfOrigin || undefined;
          animeData.studios = aniListData.studios?.edges?.map(edge => edge.node).filter(studio => studio.isAnimationStudio) || undefined;
          animeData.source = aniListData.source || undefined;
          animeData.popularity = aniListData.popularity || animeData.popularity || 0;
          animeData.format = aniListData.format || undefined;
          animeData.duration = aniListData.duration || undefined; // Episode duration
          animeData.episodesCount = aniListData.episodes || animeData.episodes?.length || undefined;
          animeData.status = mapAniListStatusToAppStatus(aniListData.status) || animeData.status;
          animeData.type = mapAniListFormatToAppType(aniListData.format) || animeData.type;

          animeData.airedFrom = formatDate(aniListData.startDate);
          animeData.airedTo = formatDate(aniListData.endDate);
        }
      }
      return animeData;
    }
    return undefined;
  } catch (error) {
    throw handleFirestoreError(error, `getAnimeById (id: ${id})`);
  }
};

export const getAllAnimes = async ({
  count = 20, 
  filters = {},
}: {
  count?: number;
  filters?: QueryFilters;
} = {}): Promise<Anime[]> => {
  try {
    const queryConstraints: QueryConstraint[] = [];

    if (filters.type) {
      queryConstraints.push(where('type', '==', filters.type));
    }
    if (filters.genre) {
      queryConstraints.push(where('genre', 'array-contains', filters.genre));
    }
    if (typeof filters.featured === 'boolean') {
      queryConstraints.push(where('isFeatured', '==', filters.featured));
    }

    const sortBy = filters.sortBy;
    const sortOrder = filters.sortOrder || (sortBy === 'title' ? 'asc' : 'desc'); 

    if (sortBy) {
      queryConstraints.push(orderBy(sortBy, sortOrder));
    } else {
      // Default sorting logic if no explicit sortBy is provided
      if (filters.featured === true) {
        // No default orderBy when filtering by 'isFeatured' to avoid complex index requirements.
        // Results will be unordered unless a 'sortBy' is explicitly provided.
        // If ordered featured items are needed, provide 'sortBy' and ensure the composite index exists.
        // e.g., (isFeatured ASC, title ASC) or (isFeatured ASC, popularity DESC).
        // Consider adding orderBy('updatedAt', 'desc') or another field if a default order is strictly needed,
        // but be prepared to create the corresponding index.
      } else if (filters.genre || filters.type) {
        // For genre/type filters, default to 'popularity' DESC.
        // This might require an index like (genre ASC, popularity DESC) or (type ASC, popularity DESC)
        queryConstraints.push(orderBy('popularity', 'desc'));
      } else {
        // General browsing, default to 'updatedAt' DESC. (Requires 'updatedAt' field to exist and be indexed)
        queryConstraints.push(orderBy('updatedAt', 'desc'));
      }
    }
    
    const effectiveCount = count === -1 ? 500 : (count > 0 ? count : 20);
    // Allow count === 0 to return an empty array without hitting Firestore if needed,
    // but this should be handled carefully to avoid unexpected empty results.
    // For this implementation, count === 0 will proceed with limit(0) which Firestore might reject.
    // Changed to skip query if effectiveCount is 0 and initial count wasn't -1.
    if (effectiveCount === 0 && count !== -1) {
        return [];
    }
    if (effectiveCount > 0) { // Only add limit if > 0
        queryConstraints.push(limit(effectiveCount));
    }
    
    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime));
    return animes;

  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      let filterDetails = JSON.stringify(filters);
      let sortDetails = filters.sortBy ? `${filters.sortBy} ${filters.sortOrder || (filters.sortBy === 'title' ? 'asc' : 'desc')}` : "default/implicit sort";
      
      // Refine sortDetails based on actual logic
      if (!filters.sortBy) {
        if (filters.featured === true) {
          sortDetails = "isFeatured filter (no explicit sort)";
        } else if (filters.genre || filters.type) {
          sortDetails = "popularity (desc) due to genre/type filter";
        } else {
          sortDetails = "updatedAt (desc) as general default";
        }
      }

      console.warn(`Firestore query in getAllAnimes requires a composite index. 
        Query Filters: ${filterDetails}. Effective Sort: ${sortDetails}.
        This usually means you are filtering by one field AND sorting by another, or using a specific filter without a corresponding sort's index. 
        Firebase error: ${error.message}. 
        Please create the required composite index in your Firebase console. 
        The error message from Firebase often provides a direct link to create the missing index.`);
    }
    throw handleFirestoreError(error, 'getAllAnimes with filters: ' + JSON.stringify(filters));
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const searchTermLower = searchTerm.toLowerCase();
    // Fetch a larger initial set for client-side filtering if backend search isn't set up.
    // This is not ideal for large datasets. Consider a dedicated search service (e.g., Algolia, Elasticsearch) for production.
    const allAnime = await getAllAnimes({ count: 200, filters: {} }); 
    
    return allAnime.filter(anime => 
      anime.title.toLowerCase().includes(searchTermLower) ||
      (anime.genre && anime.genre.some(g => g.toLowerCase().includes(searchTermLower))) ||
      (anime.year && anime.year.toString().includes(searchTermLower))
    ).slice(0, 50); // Limit client-side results
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
  }
};

export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Omit<Anime, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    const updatePayload: { [key: string]: any } = { ...dataToUpdate, updatedAt: serverTimestamp() };

    if (updatePayload.hasOwnProperty('trailerUrl')) {
      updatePayload.trailerUrl = (updatePayload.trailerUrl === '' || updatePayload.trailerUrl === undefined || updatePayload.trailerUrl === null) ? null : updatePayload.trailerUrl;
    }
    
    if (updatePayload.hasOwnProperty('bannerImage') && (updatePayload.bannerImage === '' || updatePayload.bannerImage === undefined || updatePayload.bannerImage === null) ) {
        updatePayload.bannerImage = null; 
    }
    
    if (updatePayload.isFeatured === undefined) {
        const currentDoc = await getDoc(docRef);
        if (currentDoc.exists()) {
            const currentData = currentDoc.data() as Anime;
            updatePayload.isFeatured = currentData.isFeatured || false; 
        } else {
            updatePayload.isFeatured = false; 
        }
    }
        
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined && key !== 'trailerUrl' && key !== 'bannerImage' && key !== 'aniListId') { 
         delete updatePayload[key]; 
      }
    });

    await updateDoc(docRef, updatePayload);
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeInFirestore (id: ${id})`);
  }
};

export const updateAnimeEpisode = async (animeId: string, episodeId: string, updatedEpisodeData: Partial<Episode>): Promise<void> => {
  try {
    const animeRef = doc(animesCollection, animeId);
    const animeSnap = await getDoc(animeRef);

    if (!animeSnap.exists()) {
      throw new Error(`Anime with ID ${animeId} not found.`);
    }

    const animeData = convertAnimeTimestampsForClient(animeSnap.data() as Anime) as Anime;
    let episodes = [...(animeData.episodes || [])]; 
    
    const episodeIndex = episodes.findIndex(ep => ep.id === episodeId);

    if (episodeIndex === -1) {
       if (animeData.type === 'Movie' && episodes.length === 1 && updatedEpisodeData.url) {
         episodes[0] = { ...episodes[0], ...updatedEpisodeData }; 
       } else {
         console.warn(`Episode with ID ${episodeId} not found in anime ${animeId}. Cannot update.`);
         throw new Error(`Episode with ID ${episodeId} not found for update in anime ${animeId}.`);
       }
    } else {
      episodes[episodeIndex] = { ...episodes[episodeIndex], ...updatedEpisodeData };
    }
    
    await updateDoc(animeRef, { episodes: episodes, updatedAt: serverTimestamp() });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeEpisode (animeId: ${animeId}, episodeId: ${episodeId})`);
  }
};


export const deleteAnimeFromFirestore = async (id: string): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    throw handleFirestoreError(error, `deleteAnimeFromFirestore (id: ${id})`);
  }
};


export const addEpisodeToSeason = async (animeId: string, episodeData: Episode): Promise<void> => {
    try {
        const animeRef = doc(animesCollection, animeId);
        const animeSnap = await getDoc(animeRef);

        if (!animeSnap.exists()) {
            throw new Error(`Anime with ID ${animeId} not found.`);
        }
        const anime = convertAnimeTimestampsForClient(animeSnap.data() as Anime) as Anime;
        
        const newEpisodeId = episodeData.id || 
                             `${animeId}-s${episodeData.seasonNumber || 1}e${episodeData.episodeNumber}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-');

        const newEpisode: Episode = {
            ...episodeData,
            id: newEpisodeId
        };
        const updatedEpisodes = [...(anime.episodes || []), newEpisode];
        await updateDoc(animeRef, { episodes: updatedEpisodes, updatedAt: serverTimestamp() });
    } catch (error) {
        throw handleFirestoreError(error, `addEpisodeToSeason (animeId: ${animeId})`);
    }
};

const staticAvailableGenres = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Fantasy', 'Historical', 'Horror', 'Isekai', 'Josei', 'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire', 'Game', 'Demons', 'Ecchi', 'Harem'];


export const getUniqueGenres = async (): Promise<string[]> => {
  try {
    const snapshot = await getDocs(query(animesCollection, limit(300))); 
    const allGenres = new Set<string>();
    snapshot.docs.forEach(doc => {
      const anime = doc.data() as Partial<Anime>; 
      if (anime.genre && Array.isArray(anime.genre)) { 
        anime.genre.forEach(g => {
          if (typeof g === 'string' && g.trim() !== '') { 
            allGenres.add(g.trim());
          }
        });
      }
    });
    staticAvailableGenres.forEach(g => allGenres.add(g));
    return Array.from(allGenres).sort();
  } catch (error) {
    console.warn("Failed to dynamically fetch genres, falling back to static list with additions:", error);
    return [...new Set(staticAvailableGenres)].sort();
  }
};

export const updateAnimeIsFeatured = async (animeId: string, isFeatured: boolean): Promise<void> => {
  try {
    const animeRef = doc(animesCollection, animeId);
    await updateDoc(animeRef, { isFeatured, updatedAt: serverTimestamp() });
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeIsFeatured (id: ${animeId})`);
  }
};

export const getAnimesByIds = async (ids: string[]): Promise<Anime[]> => {
  if (!ids || ids.length === 0) {
    return [];
  }
  try {
    const MAX_IDS_PER_QUERY = 30; 
    const animePromises: Promise<Anime[]>[] = [];

    for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
      const batchIds = ids.slice(i, i + MAX_IDS_PER_QUERY);
      const q = query(animesCollection, where(documentId(), 'in', batchIds));
      animePromises.push(
        getDocs(q).then(snapshot => snapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime)))
      );
    }
    
    const results = await Promise.all(animePromises);
    return results.flat(); 
  } catch (error) {
    throw handleFirestoreError(error, `getAnimesByIds (ids: ${ids.join(',')})`);
  }
};


export const getFeaturedAnimes = async (options: { count?: number; sortByTitle?: boolean } = {}): Promise<Anime[]> => {
  const { count = 5, sortByTitle = false } = options;
  try {
    const effectiveCount = count > 0 ? count : 5;
    if (effectiveCount === 0) return [];

    const queryConstraints: QueryConstraint[] = [
        where('isFeatured', '==', true),
    ];

    if (sortByTitle) {
        queryConstraints.push(orderBy('title', 'asc'));
        // IMPORTANT: This query (isFeatured == true, orderBy('title', 'asc'))
        // will require a composite index in Firestore: (animes collection: isFeatured ASC, title ASC)
    } else {
        // Defaulting to updatedAt for featured items.
        // IMPORTANT: This query (isFeatured == true, orderBy('updatedAt', 'desc'))
        // will likely require a composite index in Firestore.
        // Please create it: (animes collection: isFeatured ASC, updatedAt DESC)
         queryConstraints.push(orderBy('updatedAt', 'desc'));
    }

    queryConstraints.push(limit(effectiveCount));

    const q = query(animesCollection, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    const animes = querySnapshot.docs.map(doc => convertAnimeTimestampsForClient(doc.data() as Anime));
    return animes;
  } catch (error) {
    if (error instanceof FirestoreError && error.code === 'failed-precondition') {
      const sortField = sortByTitle ? 'title' : 'updatedAt';
      const sortDirection = sortByTitle ? 'ASC' : 'DESC';
      console.warn(`Firestore query in getFeaturedAnimes requires an index. 
        Query involves 'isFeatured == true' and sorting by '${sortField}' (${sortDirection}).
        Original error: ${error.message}. 
        Please create the required composite index (e.g., isFeatured ASC, ${sortField} ${sortDirection}) in your Firebase console.`);
    }
    throw handleFirestoreError(error, `getFeaturedAnimes`);
  }
};
