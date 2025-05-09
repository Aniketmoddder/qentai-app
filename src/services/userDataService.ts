
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import type { Anime } from '@/types/anime'; // For potential future use if storing more data

// --- Favorites ---

export const addToFavorites = async (userId: string, animeId: string): Promise<void> => {
  const favRef = doc(db, 'users', userId, 'favorites', animeId);
  await setDoc(favRef, { animeId, addedAt: serverTimestamp() });
};

export const removeFromFavorites = async (userId: string, animeId: string): Promise<void> => {
  const favRef = doc(db, 'users', userId, 'favorites', animeId);
  await deleteDoc(favRef);
};

export const isFavorite = async (userId: string, animeId: string): Promise<boolean> => {
  if (!userId || !animeId) return false;
  const favRef = doc(db, 'users', userId, 'favorites', animeId);
  const docSnap = await getDoc(favRef);
  return docSnap.exists();
};

export const getUserFavoriteIds = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  const favCollectionRef = collection(db, 'users', userId, 'favorites');
  const q = query(favCollectionRef, orderBy('addedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data().animeId as string);
};

// --- Wishlist ---

export const addToWishlist = async (userId: string, animeId: string): Promise<void> => {
  const wishRef = doc(db, 'users', userId, 'wishlist', animeId);
  await setDoc(wishRef, { animeId, addedAt: serverTimestamp() });
};

export const removeFromWishlist = async (userId: string, animeId: string): Promise<void> => {
  const wishRef = doc(db, 'users', userId, 'wishlist', animeId);
  await deleteDoc(wishRef);
};

export const isInWishlist = async (userId: string, animeId: string): Promise<boolean> => {
  if (!userId || !animeId) return false;
  const wishRef = doc(db, 'users', userId, 'wishlist', animeId);
  const docSnap = await getDoc(wishRef);
  return docSnap.exists();
};

export const getUserWishlistIds = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  const wishCollectionRef = collection(db, 'users', userId, 'wishlist');
  const q = query(wishCollectionRef, orderBy('addedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data().animeId as string);
};
