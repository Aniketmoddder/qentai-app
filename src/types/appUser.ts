import type { Timestamp } from 'firebase/firestore';

export type AppUserRole = 'owner' | 'admin' | 'member'; // Removed 'moderator'

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: AppUserRole;
  status: 'active' | 'banned' | 'pending'; // Example statuses
  createdAt?: Timestamp | string; // Firestore Timestamp or ISO string
  lastLoginAt?: Timestamp | string; // Firestore Timestamp or ISO string
  updatedAt?: Timestamp | string; // Added updatedAt field
}
