import type { Anime, Episode } from '@/types/anime';

// Common episodes, can be used by multiple anime series
const commonEpisodes: Episode[] = [
  { id: 'ep1-common', title: 'The Journey Unfolds', episodeNumber: 1, url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4', duration: '24min', thumbnail: 'https://picsum.photos/seed/ep1commonthumb/320/180' },
  { id: 'ep2-common', title: 'Secrets Revealed', episodeNumber: 2, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', duration: '23min', thumbnail: 'https://picsum.photos/seed/ep2commonthumb/320/180' },
  { id: 'ep3-common', title: 'The Final Confrontation', episodeNumber: 3, url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4', duration: '25min', thumbnail: 'https://picsum.photos/seed/ep3commonthumb/320/180' },
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
      { id: 'sl-e1', title: 'The Weakest Hunter', episodeNumber: 1, url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', duration: '24min', thumbnail: `https://picsum.photos/seed/sl-e1-thumb/320/180` },
      { id: 'sl-e2', title: 'The Reawakening', episodeNumber: 2, url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', duration: '23min', thumbnail: `https://picsum.photos/seed/sl-e2-thumb/320/180` },
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
    episodes: commonEpisodes.map((ep, i) => ({...ep, id: `aot-e${i+1}`, title: `Titan Episode ${ep.episodeNumber}: ${ep.title.split(': ')[1]}`, url: ep.url.includes('google') ? 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4' : ep.url })),
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
    episodes: [{ id: 'yn-e1', title: 'Full Movie', episodeNumber: 1, url: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4', duration: '1h 46min', thumbnail: 'https://picsum.photos/seed/yournamemoviethumb/320/180' }],
  },
];
