import type { Anime, AnimeRecommendation, Episode } from '@/types/anime';

const placeholderEpisodes: Episode[] = [
  { id: 'ep1', title: 'Episode 1: The Beginning', episodeNumber: 1, url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4', duration: '24min' },
  { id: 'ep2', title: 'Episode 2: The Challenge', episodeNumber: 2, url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4', duration: '23min' },
  { id: 'ep3', title: 'Episode 3: The Climax', episodeNumber: 3, url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4', duration: '25min' },
];

export const mockAnimeData: Anime[] = [
  {
    id: '7',
    title: 'Solo Leveling',
    coverImage: 'https://picsum.photos/seed/sololeveling/300/450',
    bannerImage: 'https://picsum.photos/seed/sololeveling-banner/1200/400',
    year: 2024,
    genre: ['Action', 'Fantasy', 'Adventure'],
    status: 'Ongoing',
    synopsis: 'In a world where hunters with magical abilities battle deadly monsters to protect humanity, a notoriously weak hunter Jinwoo Sung finds himself in a relentless struggle for survival.',
    averageRating: 4.8,
    type: 'TV',
    episodes: [
      { id: 'sl-e1', title: 'The Weakest Hunter', episodeNumber: 1, url: 'https://playertest.longtailvideo.com/adaptive/wowzaid3/playlist.m3u8', duration: '24min', thumbnail: `https://picsum.photos/seed/sl-e1-thumb/320/180` },
      { id: 'sl-e2', title: 'The Reawakening', episodeNumber: 2, url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4', duration: '23min', thumbnail: `https://picsum.photos/seed/sl-e2-thumb/320/180` },
      { id: 'sl-e3', title: 'The First Dungeon', episodeNumber: 3, url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4', duration: '25min', thumbnail: `https://picsum.photos/seed/sl-e3-thumb/320/180` },
    ],
  },
  {
    id: '1',
    title: 'Attack on Titan',
    coverImage: 'https://picsum.photos/seed/aot/300/450',
    bannerImage: 'https://picsum.photos/seed/aot-banner/1200/400',
    year: 2013,
    genre: ['Action', 'Dark Fantasy', 'Post-apocalyptic'],
    status: 'Completed',
    synopsis: 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.',
    averageRating: 4.8,
    type: 'TV',
    episodes: placeholderEpisodes.map((ep, i) => ({...ep, id: `aot-e${i+1}`, title: `AoT ${ep.title}`})),
  },
  {
    id: '6',
    title: 'Your Name. (Kimi no Na wa.)',
    coverImage: 'https://picsum.photos/seed/yourname/300/450',
    bannerImage: 'https://picsum.photos/seed/yourname-banner/1200/400',
    year: 2016,
    genre: ['Romance', 'Fantasy', 'Drama'],
    status: 'Completed',
    synopsis: 'Two strangers find themselves linked in a bizarre way. When a connection forms, will distance be the only thing to keep them apart?',
    averageRating: 4.9,
    type: 'Movie',
    episodes: [{ id: 'yn-e1', title: 'Movie', episodeNumber: 1, url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4', duration: '1h 46min' }],
  },
];

export const mockRecommendations: AnimeRecommendation[] = [
  {
    id: '1', // Corresponds to Attack on Titan
    title: 'Vinland Saga',
    coverImage: 'https://picsum.photos/seed/vinland/300/450',
    reason: 'Since you liked Attack on Titan, you might enjoy its historical themes and intense action.',
  },
   { // Adding a recommendation that could match Solo Leveling or Your Name if needed
    id: 'random-rec', 
    title: 'Death Note',
    coverImage: 'https://picsum.photos/seed/deathnote/300/450',
    reason: 'A thrilling psychological anime with strategic elements.',
  },
];
