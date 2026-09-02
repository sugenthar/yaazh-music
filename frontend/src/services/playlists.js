import api from './api';
import { normalizeYaazhSong } from './musicApi';

const normalizePlaylistSongs = (songs) =>
  Array.isArray(songs) ? songs.map(normalizeYaazhSong).filter(Boolean) : [];

class PlaylistsService {
  async getPlaylists() {
    try {
      const response = await api.get('/api/playlists');
      return (response.data.playlists || []).map((p) => ({
        ...p,
        songs: normalizePlaylistSongs(p.songs),
      }));
    } catch (e) {
      console.log('Get playlists failed:', e);
      return [];
    }
  }

  async getPlaylist(id) {
    try {
      const response = await api.get(`/api/playlists/${id}`);
      const playlist = response.data.playlist || null;
      if (!playlist) return null;
      return {
        ...playlist,
        songs: normalizePlaylistSongs(playlist.songs),
      };
    } catch (e) {
      console.log('Get playlist failed:', e);
      return null;
    }
  }

  async createPlaylist(name, description = '') {
    try {
      const response = await api.post('/api/playlists', { name, description });
      return response.data.playlist || null;
    } catch (e) {
      console.log('Create playlist failed:', e);
      return null;
    }
  }

  async updatePlaylist(id, updates) {
    try {
      const response = await api.patch(`/api/playlists/${id}`, updates);
      return response.data.playlist || null;
    } catch (e) {
      console.log('Update playlist failed:', e);
      return null;
    }
  }

  async deletePlaylist(id) {
    try {
      await api.delete(`/api/playlists/${id}`);
      return true;
    } catch (e) {
      console.log('Delete playlist failed:', e);
      return false;
    }
  }

  async addSongToPlaylist(playlistId, song) {
    try {
      const songId = typeof song === 'string' ? song : song?.id;
      if (!songId) return false;
      const snapshot = typeof song === 'string' ? null : song;
      const response = await api.post(`/api/playlists/${playlistId}/songs`, {
        songId,
        ...(snapshot ? { song: snapshot } : {}),
      });
      return response.data;
    } catch (e) {
      console.log('Add song to playlist failed:', e);
      return false;
    }
  }

  async removeSongFromPlaylist(playlistId, songId) {
    try {
      await api.delete(`/api/playlists/${playlistId}/songs/${songId}`);
      return true;
    } catch (e) {
      console.log('Remove song from playlist failed:', e);
      return false;
    }
  }
}

export default new PlaylistsService();
