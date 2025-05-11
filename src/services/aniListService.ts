'use server';

import type { AniListMediaData, AniListMedia } from '@/types/anilist';

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

const ANILIST_MEDIA_QUERY = `
query Media($id: Int, $type: MediaType, $idMal: Int, $search: String) {
  Media(id: $id, idMal: $idMal, search: $search, type: $type, sort: POPULARITY_DESC) {
    id
    idMal
    title {
      romaji
      english
      native
      userPreferred
    }
    bannerImage
    coverImage {
      extraLarge
      large
      medium
      color
    }
    description(asHtml: false)
    genres
    status
    averageScore # 0-100 scale
    popularity
    season
    seasonYear
    format
    duration # episode duration
    countryOfOrigin
    source(version: 2) # manga, light novel, original etc.
    studios {
      edges {
        isMain
        node {
          id
          name
          isAnimationStudio
        }
      }
    }
    episodes # total episodes
    trailer {
      id # youtube id
      site
      thumbnail
    }
    characters(sort: [ROLE, RELEVANCE, ID], perPage: 25) {
      edges {
        node {
          id
          name {
            full
            native
            userPreferred
          }
          image {
            large
          }
        }
        role
        voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
          id
          name {
            full
            native
            userPreferred
          }
          image {
            large
          }
          languageV2
        }
      }
    }
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
  }
}
`;

export async function fetchAniListMediaDetails(aniListId: number): Promise<AniListMedia | null> {
  try {
    const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: ANILIST_MEDIA_QUERY,
        variables: {
          id: aniListId,
          type: 'ANIME', 
        },
      }),
      next: { revalidate: 3600 * 6 } // Cache for 6 hours
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`AniList API Error for ID ${aniListId}: ${response.status} ${response.statusText}`, errorBody);
      return null;
    }

    const result: AniListGraphQLResponse<AniListMediaData> = await response.json();

    if (result.errors) {
      console.error(`AniList GraphQL Error for ID ${aniListId}:`, result.errors);
      return null;
    }
    
    return result.data?.Media || null;
  } catch (error) {
    console.error(`Network error fetching from AniList for ID ${aniListId}:`, error);
    return null;
  }
}

// Helper interface for GraphQL response structure
interface AniListGraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}
