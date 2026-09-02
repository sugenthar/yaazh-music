import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SongsService from '../services/songs';
import PlaylistsService from '../services/playlists';
import StorageService from '../services/storage';
import { useAuth } from './AuthContext';

console.log('[Yaazh][BOOT] LibraryContext module evaluated');

const LibraryContext = createContext(null);

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

export const LibraryProvider = ({ children }) => {
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('[Yaazh][BOOT] LibraryProvider mounted');
  }, []);

  const loadLikedSongs = useCallback(async () => {
    const stored = await StorageService.getLikedSongs();
    if (stored && stored.length > 0) {
      setLikedSongs(stored);
    }
    if (!isAuthenticated) return;
    const apiLiked = await SongsService.getLikedSongs();
    if (apiLiked.length > 0) {
      setLikedSongs(apiLiked.map(l => l.songId || l.id || l));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadLikedSongs();
  }, [loadLikedSongs]);

  const toggleLike = useCallback(async (songId) => {
    setLikedSongs(prev => {
      const isLiked = prev.includes(songId);
      const updated = isLiked ? prev.filter(id => id !== songId) : [...prev, songId];
      StorageService.setLikedSongs(updated);
      if (isAuthenticated) {
        if (isLiked) {
          SongsService.removeLike(songId);
        } else {
          SongsService.addLike(songId);
        }
      }
      return updated;
    });
  }, [isAuthenticated]);

  const isSongLiked = useCallback((songId) => likedSongs.includes(songId), [likedSongs]);

  const loadPlaylists = useCallback(async () => {
    const stored = await StorageService.getPlaylists();
    if (stored.length > 0) {
      setPlaylists(stored);
    }
    if (!isAuthenticated) return;
    const apiPlaylists = await PlaylistsService.getPlaylists();
    if (apiPlaylists.length > 0) {
      setPlaylists(apiPlaylists);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const createPlaylist = useCallback(async (name, description = '') => {
    let created = null;
    if (isAuthenticated) {
      created = await PlaylistsService.createPlaylist(name, description);
    }
    if (!created) {
      created = {
        id: `local-${Date.now()}`,
        name,
        description,
        songs: [],
        songCount: 0,
        local: true,
      };
    }
    setPlaylists(prev => {
      const updated = [created, ...prev];
      StorageService.setPlaylists(updated);
      return updated;
    });
    return created;
  }, [isAuthenticated]);

  const addSongToPlaylist = useCallback(async (playlist, song) => {
    let success = false;
    if (!playlist.local && isAuthenticated) {
      success = await PlaylistsService.addSongToPlaylist(playlist.id, song);
    }
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id !== playlist.id) return p;
        const alreadyIn = (p.songs || []).some(s => String(s.id) === String(song.id));
        const songs = alreadyIn ? p.songs : [...(p.songs || []), song];
        return { ...p, songs, songCount: songs.length };
      });
      StorageService.setPlaylists(updated);
      return updated;
    });
    return success || playlist.local;
  }, [isAuthenticated]);

  const removeSongFromPlaylist = useCallback(async (playlist, songId) => {
    if (!playlist.local && isAuthenticated) {
      await PlaylistsService.removeSongFromPlaylist(playlist.id, songId);
    }
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id !== playlist.id) return p;
        const songs = (p.songs || []).filter(s => String(s.id) !== String(songId));
        return { ...p, songs, songCount: songs.length };
      });
      StorageService.setPlaylists(updated);
      return updated;
    });
  }, [isAuthenticated]);

  const deletePlaylist = useCallback(async (id) => {
    setPlaylists(prev => {
      const target = prev.find(p => p.id === id);
      if (target && !target.local && isAuthenticated) {
        PlaylistsService.deletePlaylist(id);
      }
      const updated = prev.filter(p => p.id !== id);
      StorageService.setPlaylists(updated);
      return updated;
    });
  }, [isAuthenticated]);

  const value = {
    likedSongs,
    playlists,
    isLoading,
    error,
    toggleLike,
    isSongLiked,
    setPlaylists,
    loadLikedSongs,
    loadPlaylists,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    deletePlaylist,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export default LibraryProvider;