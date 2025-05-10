// NO 'use client' at the top of this file
import HomeClientContent from '@/components/home/HomeClientContent';
import GenreList from '@/components/anime/genre-list';
import RecommendationsSection from '@/components/anime/recommendations-section';
import type { ReactNode } from 'react';


// Props for the HomeClientContent component
export interface HomeContentProps {
  genreListComponent: ReactNode;
  recommendationsSectionComponent: ReactNode;
}

export default function HomePage() { // This is the main Server Component for the page
  const genreList = <GenreList />; // Instantiated in Server Component context
  // RecommendationsSection is a client component, it can be passed directly.
  // It will be rendered by the client component HomeClientContent.
  const recommendationsSection = <RecommendationsSection />;

  // HomeClientContent will contain the parts that need 'use client'
  return (
    <HomeClientContent
      genreListComponent={genreList}
      recommendationsSectionComponent={recommendationsSection}
    />
  );
}
