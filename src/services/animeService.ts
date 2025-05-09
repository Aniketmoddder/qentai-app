
'use server';
import { db } from '@/lib/firebase';
import type { Anime, Episode } from '@/types/anime';
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
} from 'firebase/firestore';

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

export const addAnimeToFirestore = async (animeData: Omit<Anime, 'id'>): Promise<string> => {
  try {
    const animeDocRef = doc(animesCollection); // Creates a reference with a new ID
    
    const newAnime: Anime = {
      ...animeData,
      id: animeDocRef.id, // Use the auto-generated ID
      episodes: animeData.episodes || [], // Ensure episodes is an array, even if empty
      tmdbId: animeData.tmdbId || undefined, // Ensure tmdbId can be undefined
    };

    await setDoc(animeDocRef, newAnime);
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
      return { id: docSnap.id, ...docSnap.data() } as Anime;
    }
    return undefined;
  } catch (error) {
    throw handleFirestoreError(error, `getAnimeById (id: ${id})`);
  }
};

export const getAllAnimes = async (count: number = 20): Promise<Anime[]> => {
  try {
    const q = query(animesCollection, orderBy('title', 'asc'), limit(count)); 
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
    throw handleFirestoreError(error, 'getAllAnimes');
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    const searchTermLower = searchTerm.toLowerCase();
    // Firestore is case-sensitive for array-contains, so this simple search might not be very effective.
    // A more robust search would involve a dedicated search service (Algolia, Typesense) or more complex data structuring.
    
    // Fetch all and filter client-side (not ideal for large datasets but simple for now)
    const allAnime = await getAllAnimes(200); // Fetch a larger set for local filtering
    
    return allAnime.filter(anime => 
      anime.title.toLowerCase().includes(searchTermLower) ||
      (anime.genre && anime.genre.some(g => g.toLowerCase().includes(searchTermLower))) ||
      (anime.year && anime.year.toString().includes(searchTermLower))
    );
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
  }
};

export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Anime>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    await updateDoc(docRef, dataToUpdate);
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

    const animeData = animeSnap.data() as Anime;
    const episodes = animeData.episodes || [];
    
    const episodeIndex = episodes.findIndex(ep => ep.id === episodeId);

    if (episodeIndex === -1) {
      // If episode doesn't exist, add it (useful for manual additions if IDs are managed carefully)
      // Or throw error: throw new Error(`Episode with ID ${episodeId} not found in anime ${animeId}.`);
      // For now, let's assume we are only updating existing episodes via this function for simplicity.
      // Adding new episodes should go through a different flow or ensure the episode has a new unique ID.
       console.warn(`Episode with ID ${episodeId} not found in anime ${animeId}. Cannot update.`);
       // If you want to add if not found:
       // episodes.push({ id: episodeId, ...updatedEpisodeData } as Episode);
       return; // Or handle as an error
    } else {
      // Update existing episode
      episodes[episodeIndex] = { ...episodes[episodeIndex], ...updatedEpisodeData };
    }
    
    await updateDoc(animeRef, { episodes: episodes });
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

// Helper to add a season to a TV show (manual context)
export const addSeasonToAnime = async (animeId: string, seasonNumber: number, seasonTitle?: string): Promise<void> => {
    // This function would typically update the anime document by adding a new season structure
    // or by preparing for episodes to be added under this season.
    // For the current structure where episodes directly contain seasonNumber, this might involve
    // ensuring the anime document is ready or pre-filling some season metadata if your Anime type had a Season[] array.
    // For now, episodes are added with seasonNumber directly.
    console.log(`Placeholder: Add season ${seasonNumber} (${seasonTitle}) to anime ${animeId}`);
    // Example: Fetch anime, add season metadata if needed, update anime.
    // const animeRef = doc(animesCollection, animeId);
    // const animeSnap = await getDoc(animeRef);
    // if(animeSnap.exists()){
    //    const animeData = animeSnap.data();
    //    const updatedSeasons = [...(animeData.seasons || []), { seasonNumber, title: seasonTitle, episodes: [] }];
    //    await updateDoc(animeRef, { seasons: updatedSeasons });
    // }
};

// Helper to add an episode to a TV show's season (manual context)
export const addEpisodeToSeason = async (animeId: string, episodeData: Episode): Promise<void> => {
    try {
        const animeRef = doc(animesCollection, animeId);
        const animeSnap = await getDoc(animeRef);

        if (!animeSnap.exists()) {
            throw new Error(`Anime with ID ${animeId} not found.`);
        }
        const anime = animeSnap.data() as Anime;
        const newEpisode: Episode = {
            ...episodeData,
            id: episodeData.id || `${animeId}-s${episodeData.seasonNumber}e${episodeData.episodeNumber}-${Date.now()}` // Generate unique ID
        };
        const updatedEpisodes = [...(anime.episodes || []), newEpisode];
        await updateDoc(animeRef, { episodes: updatedEpisodes });
    } catch (error) {
        throw handleFirestoreError(error, `addEpisodeToSeason (animeId: ${animeId})`);
    }
};
