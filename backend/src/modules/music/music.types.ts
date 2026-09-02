export interface YaazhSong {
  id: string;
  title: string;
  artist: string;
  artists?: string[];
  album: string;
  artworkUrl: string | null;
  audioUrl: string | null;
  duration: number;
  language?: string;
  year?: number;
  source: string;
  sourceId: string;
}

export interface MusicSearchResult {
  query: string;
  page: number;
  limit: number;
  songs: YaazhSong[];
  hasNextPage: boolean;
}

export interface MusicSearchResponse {
  success: boolean;
  query: string;
  page: number;
  limit: number;
  songs: YaazhSong[];
  pagination: {
    page: number;
    limit: number;
    hasNextPage: boolean;
  };
}