
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

export const addAnimeToFirestore = async (animeData: Omit<Anime, 'id' | 'episodes'> & { episodes?: Episode[] }): Promise<string> => {
  try {
    // Firestore will auto-generate an ID for the new document
    const animeDocRef = doc(animesCollection); // Creates a reference with a new ID
    
    const newAnime: Anime = {
      ...animeData,
      id: animeDocRef.id, // Use the auto-generated ID
      episodes: animeData.episodes || [], // Ensure episodes is an array
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
    const q = query(animesCollection, orderBy('year', 'desc'), limit(count)); // Example query
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
  } catch (error) {
    throw handleFirestoreError(error, 'getAllAnimes');
  }
};


export const searchAnimes = async (searchTerm: string): Promise<Anime[]> => {
  if (!searchTerm.trim()) return [];
  try {
    // Firestore doesn't support native full-text search on parts of strings easily.
    // This is a very basic "startsWith" search on the title.
    // For robust search, consider a third-party service like Algolia or Typesense.
    const searchTermLower = searchTerm.toLowerCase();
    const q = query(
      animesCollection,
      where('title_lowercase', '>=', searchTermLower), // You'd need to store a lowercase version of title
      where('title_lowercase', '<=', searchTermLower + '\uf8ff'),
      limit(10)
    );
    // Fallback: fetch all and filter client-side (not recommended for large datasets)
    // This is a simplified example. Proper search requires more setup.
    const allAnime = await getAllAnimes(100); // Fetch a larger set for local filtering
    return allAnime.filter(anime => 
      anime.title.toLowerCase().includes(searchTermLower) ||
      anime.genre.some(g => g.toLowerCase().includes(searchTermLower))
    );
  } catch (error) {
    throw handleFirestoreError(error, `searchAnimes (term: ${searchTerm})`);
  }
};


// Example update function (you'll need more specific ones)
export const updateAnimeInFirestore = async (id: string, dataToUpdate: Partial<Anime>): Promise<void> => {
  try {
    const docRef = doc(animesCollection, id);
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    throw handleFirestoreError(error, `updateAnimeInFirestore (id: ${id})`);
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
