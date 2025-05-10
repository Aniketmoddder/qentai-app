// src/app/page.tsx
import HomeClient from '@/components/home/HomeClientContent'; // Renamed component
import GenreList from '@/components/anime/genre-list';
import RecommendationsSection from '@/components/anime/recommendations-section';
import type { ReactNode } from 'react';

// Props for the HomeClient component
export interface HomeClientProps { // Renamed interface
  genreListComponent: ReactNode;
  recommendationsSectionComponent: ReactNode;
}

export default function HomePageWrapper() { // Renamed component to avoid conflict if page.tsx is also considered HomePage
  // These Server Components will be rendered on the server and passed to HomeClient
  const genreList = <GenreList />; 
  const recommendationsSection = <RecommendationsSection />;

  // HomeClient will contain the parts that need 'use client'
  return <HomeClient genreListComponent={genreList} recommendationsSectionComponent={recommendationsSection} />;
}
