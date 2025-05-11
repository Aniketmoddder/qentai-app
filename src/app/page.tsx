
// src/app/page.tsx
import HomeClient from '@/components/home/HomeClientContent';
import RecommendationsSection from '@/components/anime/recommendations-section';
import HomePageGenreSection from '@/components/home/HomePageGenreSection';
import type { ReactNode } from 'react';
import { getAllAnimes, getFeaturedAnimes } from '@/services/animeService';
import type { Anime } from '@/types/anime';
import { convertAnimeTimestampsForClient } from '@/lib/animeUtils';

export interface HomeClientProps {
  homePageGenreSectionComponent: ReactNode;
  recommendationsSectionComponent: ReactNode;
  initialAllAnimeData?: Anime[];
  initialFeaturedAnimes?: Anime[];
  fetchError?: string | null; // Added to pass potential server-side fetch errors
}

export default async function HomePageWrapper() {
  let allAnimeData: Anime[] = [];
  let featuredAnimesData: Anime[] = [];
  let fetchError: string | null = null;

  try {
    const [allAnimesRaw, featuredAnimesRaw] = await Promise.all([
      getAllAnimes({ count: 100, filters: { sortBy: 'updatedAt', sortOrder: 'desc' } }),
      getFeaturedAnimes({ count: 5, filters: { sortBy: 'popularity', sortOrder: 'desc' } })
    ]);

    allAnimeData = allAnimesRaw.map(a => convertAnimeTimestampsForClient(a) as Anime);
    featuredAnimesData = featuredAnimesRaw.map(a => convertAnimeTimestampsForClient(a) as Anime);
    
    if (featuredAnimesData.length === 0 && allAnimeData.length > 0) {
      featuredAnimesData = [...allAnimeData]
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 1);
    }
  } catch (error) {
    console.error("HomePageWrapper: Failed to fetch initial anime data:", error);
    if (error instanceof Error) {
      fetchError = `Error fetching data: ${error.message}. This might be due to missing Firestore indexes. Please check the Firebase console for index creation links in logs.`;
    } else {
      fetchError = "An unknown error occurred while fetching anime data. Please ensure Firebase services are correctly configured and reachable.";
    }
    // Ensure arrays are empty on error so client knows data isn't just 'not there'
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
      fetchError={fetchError} // Pass the error state
    />
  );
}
