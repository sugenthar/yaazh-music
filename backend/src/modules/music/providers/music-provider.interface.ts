import { YaazhSong } from "../music.types";

export interface ProviderSearchResult {
  songs: YaazhSong[];
  hasNextPage: boolean;
}

export interface ProviderHealth {
  status: "available" | "unavailable";
  latencyMs: number;
}

export interface MusicProvider {
  readonly name: string;
  readonly priority: number;
  search(query: string, page: number, limit: number): Promise<ProviderSearchResult>;
  getById(songId: string): Promise<YaazhSong | null>;
  health(): Promise<ProviderHealth>;
  isAvailable(): boolean;
}
