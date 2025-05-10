// src/app/page.tsx
import HomeClient from '@/components/home/HomeClientContent';
import RecommendationsSection from '@/components/anime/recommendations-section';
import HomePageGenreSection from '@/components/home/HomePageGenreSection'; // New import
import type { ReactNode } from 'react';

export interface HomeClientProps {
  homePageGenreSectionComponent: ReactNode; // Updated prop name
  recommendationsSectionComponent: ReactNode;
}

export default function HomePageWrapper() {
  // This Server Component will be rendered on the server and passed to HomeClient
  const homePageGenreSection = <HomePageGenreSection />; // Use new component
  const recommendationsSection = <RecommendationsSection />;

  // HomeClient will contain the parts that need 'use client'
  return <HomeClient homePageGenreSectionComponent={homePageGenreSection} recommendationsSectionComponent={recommendationsSection} />;
}
