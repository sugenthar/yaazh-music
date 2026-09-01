const STORAGE_KEYS = {
  LIKED_SONGS: 'yaazh_liked_songs',
  PLAYLISTS: 'yaazh_playlists',
  CURRENT_SONG: 'yaazh_current_song',
  REPEAT_MODE: 'yaazh_repeat_mode',
  SHUFFLE: 'yaazh_shuffle',
  AUTH_TOKEN: 'auth_token',
  USER: 'yaazh_user',
};

class StorageService {
  constructor() {
    this.storage = null;
  }

  async getStorage() {
    if (this.storage) return this.storage;
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      this.storage = AsyncStorage;
      return this.storage;
    } catch (e) {
      console.log('AsyncStorage not available, using in-memory fallback');
      this.storage = this.createMemoryStorage();
      return this.storage;
    }
  }

  createMemoryStorage() {
    const store = {};
    return {
      async getItem(key) {
        return store[key] || null;
      },
      async setItem(key, value) {
        store[key] = value;
      },
      async removeItem(key) {
        delete store[key];
      },
    };
  }

  async get(key) {
    const storage = await this.getStorage();
    const value = await storage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async set(key, value) {
    const storage = await this.getStorage();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await storage.setItem(key, serialized);
  }

  async remove(key) {
    const storage = await this.getStorage();
    await storage.removeItem(key);
  }

  async getLikedSongs() {
    return (await this.get(STORAGE_KEYS.LIKED_SONGS)) || [];
  }

  async setLikedSongs(songs) {
    await this.set(STORAGE_KEYS.LIKED_SONGS, songs);
  }

  async getPlaylists() {
    return (await this.get(STORAGE_KEYS.PLAYLISTS)) || [];
  }

  async setPlaylists(playlists) {
    await this.set(STORAGE_KEYS.PLAYLISTS, playlists);
  }

  async getCurrentSong() {
    return await this.get(STORAGE_KEYS.CURRENT_SONG);
  }

  async setCurrentSong(song) {
    await this.set(STORAGE_KEYS.CURRENT_SONG, song);
  }

  async getRepeatMode() {
    return (await this.get(STORAGE_KEYS.REPEAT_MODE)) || 'off';
  }

  async getShuffle() {
    return (await this.get(STORAGE_KEYS.SHUFFLE)) || false;
  }
}

export default new StorageService();
