import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import SongsService from '../services/songs';

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

  const fetchSongs = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await SongsService.getSongsFromApi();
      setSongs(data);
      setError(null);
    } catch (e) {
      console.log('Error fetching songs:', e);
      setError(e.message);
      const fallback = await SongsService.fetchSongsFromGitHub();
      setSongs(fallback);
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
    try {
      const response = await SongsService.fetchMoods();
      if (response) setMoods(response);
    } catch (e) {
      console.log('Error fetching moods:', e);
    }
  }, []);

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