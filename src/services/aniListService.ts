'use server';
import type { AniListMediaData, AniListGraphQLResponse, AniListMedia } from '@/types/anilist';

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

const ANILIST_MEDIA_QUERY = `
query Media($id: Int, $type: MediaType) {
  Media(id: $id, type: $type) {
    id
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
    seasonYear
    format
    characters(sort: [ROLE, RELEVANCE, ID], perPage: 25) { # Fetch more characters
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
        role # Role of the character in the media
        voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) { # Prioritize Japanese VAs
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
          type: 'ANIME', // Assuming we are only fetching ANIME type media
        },
      }),
      next: { revalidate: 3600 * 24 } // Cache for 24 hours
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

// Potential function to search AniList by title (more complex, needs careful implementation)
// export async function searchAniListByTitle(title: string): Promise<AniListMedia[] | null> { ... }