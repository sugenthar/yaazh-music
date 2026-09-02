import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import SongsService from '../services/songs';
import { toUserMessage } from '../services/musicApi';
import { useAuth } from './AuthContext';

console.log('[Yaazh][BOOT] MusicContext module evaluated');

const MusicContext = createContext(null);

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

export const MusicProvider = ({ children }) => {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [moods, setMoods] = useState([]);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('[Yaazh][BOOT] MusicProvider mounted');
  }, []);

  const fetchSongs = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await SongsService.getSongsFromApi();
      setSongs(data || []);
      setError(null);
    } catch (e) {
      console.log('Error fetching songs:', e);
      setError(toUserMessage(e));
      setSongs([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSongs();
  }, [fetchSongs]);

  const loadMoods = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await SongsService.fetchMoods();
      if (response) setMoods(response);
    } catch (e) {
      console.log('Error fetching moods:', e);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadMoods();
  }, [loadMoods]);

  const value = {
    songs,
    isLoading,
    error,
    refreshing,
    moods,
    fetchSongs,
    onRefresh,
    setMoods,
  };

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
};

export default MusicProvider;