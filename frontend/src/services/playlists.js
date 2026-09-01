import api from './api';

class PlaylistsService {
  async getPlaylists() {
    try {
      const response = await api.get('/api/playlists');
      return response.data.playlists || [];
    } catch (e) {
      console.log('Get playlists failed:', e);
      return [];
    }
  }

  async getPlaylist(id) {
    try {
      const response = await api.get(`/api/playlists/${id}`);
      return response.data.playlist || null;
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

  async addSongToPlaylist(playlistId, songId) {
    try {
      const response = await api.post(`/api/playlists/${playlistId}/songs`, { songId });
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
