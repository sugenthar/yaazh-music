import { YaazhSong } from "../music.types";
import { MusicProvider, ProviderSearchResult, ProviderHealth } from "./music-provider.interface";

const DEMO_SONGS: YaazhSong[] = [
  {
    id: "demo-1",
    sourceId: "demo-1",
    source: "demo",
    title: "Vaathi Coming",
    artist: "Anirudh Ravichander",
    artists: ["Anirudh Ravichander"],
    album: "Master",
    artworkUrl: null,
    audioUrl: null,
    duration: 210,
    language: "Tamil",
    year: 2020,
  },
  {
    id: "demo-2",
    sourceId: "demo-2",
    source: "demo",
    title: "Naan Pogiren",
    artist: "Shankar Mahadevan",
    artists: ["Shankar Mahadevan"],
    album: "Tamizhan",
    artworkUrl: null,
    audioUrl: null,
    duration: 245,
    language: "Tamil",
    year: 2010,
  },
  {
    id: "demo-3",
    sourceId: "demo-3",
    source: "demo",
    title: "Mental Manadhil",
    artist: "A.R. Rahman",
    artists: ["A.R. Rahman"],
    album: "OK Kanmani",
    artworkUrl: null,
    audioUrl: null,
    duration: 280,
    language: "Tamil",
    year: 2015,
  },
  {
    id: "demo-4",
    sourceId: "demo-4",
    source: "demo",
    title: "Kannalane",
    artist: "A.R. Rahman",
    artists: ["A.R. Rahman"],
    album: "Bombay",
    artworkUrl: null,
    audioUrl: null,
    duration: 302,
    language: "Tamil",
    year: 1995,
  },
  {
    id: "demo-5",
    sourceId: "demo-5",
    source: "demo",
    title: "Chaiyya Chaiyya",
    artist: "A.R. Rahman",
    artists: ["A.R. Rahman"],
    album: "Dil Se",
    artworkUrl: null,
    audioUrl: null,
    duration: 370,
    language: "Hindi",
    year: 1998,
  },
  {
    id: "demo-6",
    sourceId: "demo-6",
    source: "demo",
    title: "Ennodu Nee Irundhaal",
    artist: "Sid Sriram",
    artists: ["Sid Sriram"],
    album: "I",
    artworkUrl: null,
    audioUrl: null,
    duration: 315,
    language: "Tamil",
    year: 2015,
  },
  {
    id: "demo-7",
    sourceId: "demo-7",
    source: "demo",
    title: "Pacha Manasila",
    artist: "Harris Jayaraj",
    artists: ["Harris Jayaraj"],
    album: "Neethane Enthan Ponvasantham",
    artworkUrl: null,
    audioUrl: null,
    duration: 268,
    language: "Tamil",
    year: 2012,
  },
  {
    id: "demo-8",
    sourceId: "demo-8",
    source: "demo",
    title: "Aaromale",
    artist: "Alphons Joseph",
    artists: ["Alphons Joseph"],
    album: "Vinnaithaandi Varuvaayaa",
    artworkUrl: null,
    audioUrl: null,
    duration: 295,
    language: "Tamil",
    year: 2010,
  },
  {
    id: "demo-9",
    sourceId: "demo-9",
    source: "demo",
    title: "Roja Kaadhal Vandhaale",
    artist: "A.R. Rahman",
    artists: ["A.R. Rahman"],
    album: "Roja",
    artworkUrl: null,
    audioUrl: null,
    duration: 288,
    language: "Tamil",
    year: 1992,
  },
  {
    id: "demo-10",
    sourceId: "demo-10",
    source: "demo",
    title: "Oru Paathi Kaadhal",
    artist: "Yuvan Shankar Raja",
    artists: ["Yuvan Shankar Raja"],
    album: "Pyaar Prema Kaadhal",
    artworkUrl: null,
    audioUrl: null,
    duration: 232,
    language: "Tamil",
    year: 2018,
  },
];

export class DemoProvider implements MusicProvider {
  readonly name = "demo";
  readonly priority = 3;

  async search(query: string, page: number, limit: number): Promise<ProviderSearchResult> {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? DEMO_SONGS.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            s.album.toLowerCase().includes(q) ||
            (s.language && s.language.toLowerCase().includes(q))
        )
      : DEMO_SONGS;

    const start = (page - 1) * limit;
    const slice = filtered.slice(start, start + limit);

    return {
      songs: slice,
      hasNextPage: start + slice.length < filtered.length,
    };
  }

  async getById(songId: string): Promise<YaazhSong | null> {
    const id = songId.replace(/^demo-/, "");
    return DEMO_SONGS.find((s) => s.sourceId === id || s.id === songId) || null;
  }

  async health(): Promise<ProviderHealth> {
    return { status: "available", latencyMs: 0 };
  }

  isAvailable(): boolean {
    return true;
  }
}
