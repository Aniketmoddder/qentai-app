'use server';

import type { AniListMediaData, AniListMedia } from '@/types/anilist';

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

const ANILIST_MEDIA_QUERY = `
query Media($id: Int, $type: MediaType, $idMal: Int, $search: String, $title: String) {
  Media(id: $id, idMal: $idMal, search: $search, type: $type, title: $title, sort: [POPULARITY_DESC, SCORE_DESC]) {
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
    studios(sort: IS_MAIN_DESC) {
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
            medium
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
            medium
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

export async function fetchAniListMediaDetails(
  identifier: { id: number } | { title: string; type?: 'ANIME' | 'MANGA' }
): Promise<AniListMedia | null> {
  let variables: { id?: number; title?: string; type?: 'ANIME' | 'MANGA' } = {};
  if ('id' in identifier) {
    variables.id = identifier.id;
    variables.type = 'ANIME'; // Assume ANIME if only ID is provided
  } else {
    variables.title = identifier.title;
    variables.type = identifier.type || 'ANIME';
  }
  
  try {
    const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: ANILIST_MEDIA_QUERY,
        variables: variables,
      }),
      next: { revalidate: 3600 * 6 } // Cache for 6 hours
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`AniList API Error for identifier ${JSON.stringify(identifier)}: ${response.status} ${response.statusText}`, errorBody);
      return null;
    }

    const result: AniListGraphQLResponse<AniListMediaData> = await response.json();

    if (result.errors) {
      console.error(`AniList GraphQL Error for identifier ${JSON.stringify(identifier)}:`, result.errors);
      return null;
    }
    
    return result.data?.Media || null;
  } catch (error) {
    console.error(`Network error fetching from AniList for identifier ${JSON.stringify(identifier)}:`, error);
    return null;
  }
}

// Helper to search AniList by title (can be used for linking TMDB entries to AniList IDs)
export async function searchAniListByTitle(title: string, type: 'ANIME' | 'MANGA' = 'ANIME'): Promise<AniListMedia[]> {
  try {
    const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query ($search: String, $type: MediaType, $page: Int, $perPage: Int) {
            Page (page: $page, perPage: $perPage) {
              pageInfo {
                total
                currentPage
                lastPage
                hasNextPage
                perPage
              }
              media (search: $search, type: $type, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
                id
                title {
                  romaji
                  english
                  userPreferred
                }
                format
                status
                seasonYear
                coverImage {
                  medium
                }
              }
            }
          }
        `,
        variables: {
          search: title,
          type: type,
          page: 1,
          perPage: 5 // Fetch a few results to choose from
        },
      }),
      next: { revalidate: 3600 * 6 } 
    });

    if (!response.ok) {
      console.error(`AniList Search API Error for title "${title}": ${response.status} ${response.statusText}`);
      return [];
    }

    const result: AniListGraphQLResponse<{ Page: { media: AniListMedia[] } }> = await response.json();

    if (result.errors) {
      console.error(`AniList Search GraphQL Error for title "${title}":`, result.errors);
      return [];
    }
    
    return result.data?.Page?.media || [];
  } catch (error) {
    console.error(`Network error searching AniList for title "${title}":`, error);
    return [];
  }
}


// Helper interface for GraphQL response structure
interface AniListGraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}
