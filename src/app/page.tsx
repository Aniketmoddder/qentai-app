
// src/app/page.tsx
import HomeClient from '@/components/home/HomeClientContent';
import RecommendationsSection from '@/components/anime/recommendations-section';
import HomePageGenreSection from '@/components/home/HomePageGenreSection';
import type { ReactNode } from 'react';
import { getAllAnimes } from '@/services/animeService'; // Import for server-side fetching
import type { Anime } from '@/types/anime';

export interface HomeClientProps {
  homePageGenreSectionComponent: ReactNode;
  recommendationsSectionComponent: ReactNode;
  initialAllAnimeData?: Anime[]; // For HomeClientContent to potentially use elsewhere or pass further
  initialFeaturedAnimes?: Anime[]; // For HomeClientContent hero section
}

export default async function HomePageWrapper() {
  // Fetch data on the server
  let allAnimeData: Anime[] = [];
  let featuredAnimesData: Anime[] = [];
  let fetchError: string | null = null;

  try {
    // Fetch a reasonable number of animes for client-side filtering/display in carousels
    // and for the recommendation engine's catalog.
    // The `getAllAnimes` function now handles fallback queries if specific index is missing.
    allAnimeData = await getAllAnimes({ count: 100, filters: { sortBy: 'updatedAt', sortOrder: 'desc' } }); 
    featuredAnimesData = allAnimeData.filter(a => a.isFeatured).slice(0,5); // Get featured from allAnimeData
    if (featuredAnimesData.length === 0 && allAnimeData.length > 0) { // Fallback if no animes are explicitly featured
        featuredAnimesData = allAnimeData.sort((a,b) => (b.popularity || 0) - (a.popularity || 0)).slice(0,1);
    }


  } catch (error) {
    console.error("HomePageWrapper: Failed to fetch initial anime data:", error);
    if (error instanceof Error) {
      fetchError = error.message;
    } else {
      fetchError = "An unknown error occurred while fetching anime data.";
    }
    // Data will be empty, HomeClientContent can handle this
  }
  
  const homePageGenreSection = <HomePageGenreSection />;
  // Pass fetched allAnimeData to RecommendationsSection
  const recommendationsSection = <RecommendationsSection allAnimesCache={allAnimeData} />;

  return (
    <HomeClient 
      homePageGenreSectionComponent={homePageGenreSection} 
      recommendationsSectionComponent={recommendationsSection}
      initialAllAnimeData={allAnimeData} // Pass all animes
      initialFeaturedAnimes={featuredAnimesData} // Pass featured animes
    />
  );
}

    