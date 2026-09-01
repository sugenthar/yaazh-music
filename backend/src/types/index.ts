export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface Song {
  id: number;
  external_id: string | null;
  title: string;
  artist: string;
  artwork: string | null;
  url: string;
  duration: number | null;
  source: string;
}

export interface GitHubSong {
  id: string | number;
  title: string;
  artist: string;
  artwork?: string;
  url: string;
  duration?: number;
}

export interface Artist {
  id: number;
  name: string;
  external_id?: string | null;
}

export interface Album {
  id: number;
  title: string;
  artist_id: number | null;
  artwork?: string | null;
}

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
}

export interface PlaylistSong {
  playlist_id: number;
  song_id: number;
  added_at: string;
}

export interface Like {
  id: number;
  user_id: number;
  song_id: number;
  created_at: string;
}

export interface HistoryEntry {
  id: number;
  user_id: number;
  song_id: number;
  played_at: string;
}

export interface Mood {
  id: number;
  text: string;
  user_id: number | null;
  user_name: string | null;
  color: string | null;
  song_title: string | null;
  created_at: string;
}

export interface AuthPayload {
  user: PublicUser;
  token: string;
}