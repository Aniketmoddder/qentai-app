
import type { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'member' | 'moderator'; // Example roles
  status: 'active' | 'banned' | 'pending'; // Example statuses
  createdAt?: Timestamp | string; // Firestore Timestamp or ISO string
  lastLoginAt?: Timestamp | string; // Firestore Timestamp or ISO string
}
