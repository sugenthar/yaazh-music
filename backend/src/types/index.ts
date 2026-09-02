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

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
}

export interface PlaylistSong {
  playlist_id: number;
  song_id: string;
  song_json: string | null;
  added_at: string;
}

export interface Like {
  id: number;
  user_id: number;
  song_id: string;
  song_json: string | null;
  created_at: string;
}

export interface HistoryEntry {
  id: number;
  user_id: number;
  song_id: string;
  song_json: string | null;
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