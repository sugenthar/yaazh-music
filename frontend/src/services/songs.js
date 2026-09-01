import api from './api';

const GITHUB_SONGS_URL = 'https://raw.githubusercontent.com/sugenthar/songsData/main/songs/song.json';

const DEMO_SONGS = [
  {
    id: '1',
    title: 'Badass - Leo',
    artist: 'Anirudh Ravichander',
    artwork: 'https://upload.wikimedia.org/wikipedia/en/7/77/Leo_film_poster.jpg',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 220,
  },
  {
    id: '2',
    title: 'Hukum - Jailer',
    artist: 'Anirudh Ravichander',
    artwork: 'https://upload.wikimedia.org/wikipedia/en/3/30/Jailer_2023_Tamil_film_poster.jpg',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 210,
  },
];

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
        return json.songs;
      }
      return DEMO_SONGS;
    } catch (e) {
      console.log('GitHub fetch failed, using fallback:', e);
      return this.cache || DEMO_SONGS;
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
      const response = await api.get('/api/songs');
      return response.data.songs || [];
    } catch (e) {
      console.log('API fetch failed, falling back to GitHub:', e);
      return this.fetchSongsFromGitHub();
    }
  }

  async searchSongs(query) {
    if (!query) return [];
    const songs = await this.getSongs();
    return songs.filter(song =>
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase())
    );
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
