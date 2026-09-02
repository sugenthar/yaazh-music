import api from './api';
import musicApi from './musicApi';

const GITHUB_SONGS_URL = 'https://raw.githubusercontent.com/sugenthar/songsData/main/songs/song.json';

class SongsService {
  constructor() {
    this.cache = null;
    this.lastFetch = null;
    this.CACHE_DURATION = 5 * 60 * 1000;
  }

  async fetchSongsFromGitHub() {
    try {
      const response = await fetch(GITHUB_SONGS_URL);
      const json = await response.json();
      if (json.songs && json.songs.length > 0) {
        this.cache = json.songs;
        this.lastFetch = Date.now();
      }
      return this.cache || [];
    } catch (e) {
      console.log('GitHub fetch failed:', e);
      return this.cache || [];
    }
  }

  async getSongs() {
    if (this.cache && this.lastFetch && (Date.now() - this.lastFetch < this.CACHE_DURATION)) {
      return this.cache;
    }
    return this.fetchSongsFromGitHub();
  }

  async getSongsFromApi() {
    try {
      return await musicApi.getDefaultSongs(1, 20);
    } catch (e) {
      console.log('API fetch failed, falling back to GitHub:', e);
      const fallback = await this.fetchSongsFromGitHub();
      if (!fallback || fallback.length === 0) {
        throw Object.assign(new Error('Music service is temporarily unavailable.'), {
          code: 'MUSIC_PROVIDER_UNAVAILABLE',
          status: 503,
        });
      }
      return fallback;
    }
  }

  async searchSongs(query, page = 1, limit = 20) {
    if (!query) return [];
    const result = await musicApi.searchSongs(query, page, limit);
    return result.songs;
  }

  async getSongById(id) {
    const songs = await this.getSongs();
    return songs.find(song => song.id === id);
  }

  async addLike(songId) {
    try {
      const response = await api.post(`/api/likes/${songId}`);
      return response.data;
    } catch (e) {
      console.log('Like API failed:', e);
      return null;
    }
  }

  async removeLike(songId) {
    try {
      await api.delete(`/api/likes/${songId}`);
      return true;
    } catch (e) {
      console.log('Unlike API failed:', e);
      return false;
    }
  }

  async getLikedSongs() {
    try {
      const response = await api.get('/api/library');
      return response.data.likedSongs || [];
    } catch (e) {
      console.log('Liked songs fetch failed:', e);
      return [];
    }
  }

  async addToHistory(songId) {
    try {
      await api.post('/api/history', { songId });
      return true;
    } catch (e) {
      console.log('History API failed:', e);
      return false;
    }
  }

  async getHistory() {
    try {
      const response = await api.get('/api/history');
      return response.data.history || [];
    } catch (e) {
      console.log('History fetch failed:', e);
      return [];
    }
  }

  async fetchMoods() {
    try {
      const response = await api.get('/api/moods');
      return response.data.moods || [];
    } catch (e) {
      console.log('Moods fetch failed:', e);
      return [];
    }
  }

  async createMood(mood) {
    try {
      const response = await api.post('/api/moods', mood);
      return response.data.mood || null;
    } catch (e) {
      console.log('Create mood failed:', e);
      return null;
    }
  }
}

export default new SongsService();
