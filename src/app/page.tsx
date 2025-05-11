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
  fetchError?: string | null; 
}

export default async function HomePageWrapper() {
  let allAnimeData: Anime[] = [];
  let featuredAnimesData: Anime[] = [];
  let fetchError: string | null = null;

  try {
    const [allAnimesRaw, featuredAnimesRaw] = await Promise.all([
      getAllAnimes({ count: 100, filters: { sortBy: 'updatedAt', sortOrder: 'desc' } }),
      getFeaturedAnimes({ count: 5, sortByPopularity: true }) // Use sortByPopularity flag
    ]);

    allAnimeData = allAnimesRaw.map(a => convertAnimeTimestampsForClient(a));
    featuredAnimesData = featuredAnimesRaw.map(a => convertAnimeTimestampsForClient(a));
    
    // If no animes are explicitly featured, pick the most popular overall as a fallback for the hero section
    if (featuredAnimesData.length === 0 && allAnimeData.length > 0) {
      featuredAnimesData = [...allAnimeData]
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0)) // Sort by popularity
        .slice(0, 1); // Take the top one
    }

  } catch (error) {
    console.error("HomePageWrapper: Failed to fetch initial anime data:", error);
    if (error instanceof Error) {
      fetchError = `Error fetching data: ${error.message}. This might be due to missing Firestore indexes. Please check the Firebase console for index creation links in logs.`;
    } else {
      fetchError = "An unknown error occurred while fetching anime data. Please ensure Firebase services are correctly configured and reachable.";
    }
    allAnimeData = [];
    featuredAnimesData = [];
  }
  
  const homePageGenreSection = <HomePageGenreSection />;
  const recommendationsSection = <RecommendationsSection />;

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

