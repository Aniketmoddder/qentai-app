// src/app/page.tsx
import HomeClient from '@/components/home/HomeClientContent';
import type { Anime } from '@/types/anime';
import { getAllAnimes, getFeaturedAnimes } from '@/services/animeService';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';
import { FirestoreError } from 'firebase/firestore';


export default async function HomePageWrapper() {
  let allAnimeData: Anime[] = [];
  let featuredAnimesData: Anime[] = [];
  let fetchError: string | null = null;

  try {
    const [allAnimesRaw, featuredAnimesRawInitial] = await Promise.all([
      getAllAnimes({ count: 100, filters: { sortBy: 'updatedAt', sortOrder: 'desc' } }),
      getFeaturedAnimes({ count: 10, sortBy: 'popularity', sortOrder: 'desc' }) 
    ]);

    allAnimeData = allAnimesRaw.map(a => convertAnimeTimestampsForClient(a));
    let tempFeaturedAnimes = featuredAnimesRawInitial.map(a => convertAnimeTimestampsForClient(a));
    
    if (tempFeaturedAnimes.length > 0) {
        // Already sorted by popularity from service
        featuredAnimesData = tempFeaturedAnimes.slice(0,5); 
    }

    if (featuredAnimesData.length === 0 && allAnimeData.length > 0) {
      featuredAnimesData = [...allAnimeData]
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 1); 
    }

  } catch (error) {
    console.error("HomePageWrapper: Failed to fetch initial anime data:", error);
     if (error instanceof FirestoreError && error.code === 'failed-precondition' && error.message.includes("index")) {
        fetchError = `DATABASE SETUP REQUIRED: A Firestore index is missing for optimal performance. Please check the Firebase console for a link to create the missing index. Details: ${error.message}`;
    } else if (error instanceof Error) {
      fetchError = `Error fetching data: ${error.message}.`;
    } else {
      fetchError = "An unknown error occurred while fetching anime data. Please ensure Firebase services are correctly configured and reachable.";
    }
    allAnimeData = [];
    featuredAnimesData = [];
  }
  
  return (
    <HomeClient 
      initialAllAnimeData={allAnimeData}
      initialFeaturedAnimes={featuredAnimesData}
      fetchError={fetchError}
    />
  );
}