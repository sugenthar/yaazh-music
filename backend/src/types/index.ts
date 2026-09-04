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

export type BannerType = "featured" | "inline";
export type BannerActionType = "screen" | "url" | "none";

export interface Banner {
  id: number;
  type: BannerType;
  title: string;
  subtitle: string | null;
  action_type: BannerActionType;
  action_target: string | null;
  image_key: string | null;
  image_url: string | null;
  enabled: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BannerInput {
  type: BannerType;
  title: string;
  subtitle?: string | null;
  actionType?: BannerActionType;
  actionTarget?: string | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  enabled?: number;
  position?: number;
}

export interface PublicBanner {
  id: number;
  type: BannerType;
  title: string;
  subtitle: string | null;
  action: {
    type: BannerActionType;
    target: string | null;
  };
  imageKey: string | null;
  imageUrl: string | null;
}