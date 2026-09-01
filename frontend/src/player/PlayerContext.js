import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import QueueManager from './QueueManager';
import StorageService from '../services/storage';
import SongsService from '../services/songs';

const PlayerContext = createContext(null);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [songs, setSongs] = useState([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');

  const queueManagerRef = useRef(new QueueManager([]));
  const playerReplacement = useAudioPlayer();
  const player = playerReplacement;
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    queueManagerRef.current.setQueue(songs);
    if (currentSong) {
      queueManagerRef.current.setCurrentSong(currentSong);
    }
  }, [songs, currentSong]);

  useEffect(() => {
    StorageService.getRepeatMode().then(setRepeatMode);
    StorageService.getShuffle().then(setIsShuffle);
    StorageService.getCurrentSong().then(savedSong => {
      if (savedSong) {
        setCurrentSong(savedSong);
      }
    });
  }, []);

  useEffect(() => {
    StorageService.set('yaazh_repeat_mode', repeatMode);
  }, [repeatMode]);

  useEffect(() => {
    StorageService.set('yaazh_shuffle', isShuffle);
  }, [isShuffle]);

  useEffect(() => {
    if (currentSong) {
      StorageService.setCurrentSong(currentSong);
    }
  }, [currentSong]);

  const isPlaying = status?.playing ?? status?.isPlaying ?? false;
  const positionMs = ((status?.currentTime ?? 0) * 1000);
  const durationMs = ((status?.duration ?? 0) * 1000);
  const progress = status?.duration > 0 ? (status?.currentTime ?? 0) / status?.duration : 0;
  const isLoading = status?.loading ?? false;

  const playSong = useCallback(
    (song) => {
      if (!song) return;
      const isSameSong = currentSong?.id === song.id;

      if (isSameSong) {
        if (isPlaying) {
          player.pause();
        } else {
          if ((status?.currentTime ?? 0) >= (status?.duration || 0)) {
            player.seekTo(0);
          }
          player.play();
        }
        return;
      }

      setCurrentSong(song);
      SongsService.addToHistory(song.id);
      player.replace({
        uri: song.url,
        metadata: {
          title: song.title,
          artist: song.artist,
          artwork: song.artwork,
        },
      });
      player.play();
    },
    [currentSong, isPlaying, player, status]
  );

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    if (isPlaying) {
      player.pause();
    } else {
      if ((status?.currentTime ?? 0) >= (status?.duration || 0)) {
        player.seekTo(0);
      }
      player.play();
    }
  }, [currentSong, isPlaying, player, status]);

  const playNext = useCallback(() => {
    const nextSong = queueManagerRef.current.getNext({ shuffle: isShuffle, repeatMode });
    if (nextSong) {
      playSong(nextSong);
    } else {
      player.pause();
      player.seekTo(0);
    }
  }, [isShuffle, repeatMode, playSong, player]);

  useEffect(() => {
    if (status?.didJustFinish) {
      playNext();
    }
  }, [status?.didJustFinish, playNext]);

  const playPrevious = useCallback(() => {
    const prevSong = queueManagerRef.current.getPrevious();
    if (prevSong) {
      playSong(prevSong);
    }
  }, [playSong]);

  const seekTo = useCallback(
    (time) => {
      if (player) player.seekTo(time);
    },
    [player]
  );

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => !prev);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const seekByTap = useCallback(
    (tapX, barWidth) => {
      const seekProgress = tapX / barWidth;
      const seekTime = seekProgress * (status?.duration || 0);
      if (player) player.seekTo(seekTime);
    },
    [player, status]
  );

  const value = {
    currentSong,
    isPlaying,
    positionMs,
    durationMs,
    progress,
    isLoading,
    isShuffle,
    repeatMode,
    songs,
    playSong,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    seekByTap,
    toggleShuffle,
    cycleRepeat,
    setSongs,
    setIsShuffle,
    setRepeatMode,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export default PlayerProvider;