// src/app/page.tsx
import HomeClient from '@/components/home/HomeClientContent';
import RecommendationsSection from '@/components/anime/recommendations-section';
import HomePageGenreSection from '@/components/home/HomePageGenreSection';
import type { ReactNode } from 'react';
import { getAllAnimes, getFeaturedAnimes } from '@/services/animeService';
import type { Anime } from '@/types/anime';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';
import { FirestoreError } from 'firebase/firestore';


export default async function HomePageWrapper() {
  let allAnimeData: Anime[] = [];
  let featuredAnimesData: Anime[] = [];
  let fetchError: string | null = null;

  try {
    const [allAnimesRaw, featuredAnimesRawInitial] = await Promise.all([
      getAllAnimes({ count: 100, filters: { sortBy: 'updatedAt', sortOrder: 'desc' } }),
      // Fetch featured animes, default sort by updatedAt initially to be more resilient to missing popularity index
      getFeaturedAnimes({ count: 10 }) 
    ]);

    allAnimeData = allAnimesRaw.map(a => convertAnimeTimestampsForClient(a));
    let tempFeaturedAnimes = featuredAnimesRawInitial.map(a => convertAnimeTimestampsForClient(a));
    
    // Now, sort the fetched featured animes by popularity client-side for the hero
    if (tempFeaturedAnimes.length > 0) {
        tempFeaturedAnimes.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }
    featuredAnimesData = tempFeaturedAnimes.slice(0,5); // Take top 5 most popular from featured

    // If no animes are explicitly featured, pick the most popular overall as a fallback for the hero section
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
    // Ensure data is empty on error
    allAnimeData = [];
    featuredAnimesData = [];
  }
  
  const homePageGenreSection = <HomePageGenreSection />;
  const recommendationsSection = <RecommendationsSection allAnimesCache={allAnimeData} />;


  return (
    <HomeClient 
      homePageGenreSectionComponent={homePageGenreSection} 
      recommendationsSectionComponent={recommendationsSection}
      initialAllAnimeData={allAnimeData}
      initialFeaturedAnimes={featuredAnimesData}
      fetchError={fetchError}
    />
  );
}