import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import QueueManager from './QueueManager';
import StorageService from '../services/storage';
import SongsService from '../services/songs';
import { useAuth } from '../store/AuthContext';
import { STRINGS } from '../constants/strings';

console.log('[Yaazh][BOOT] PlayerContext module evaluated');

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
  const [playbackError, setPlaybackError] = useState(null);

  const renderLoggedRef = useRef(false);
  if (!renderLoggedRef.current) {
    renderLoggedRef.current = true;
    console.log('[Yaazh][BOOT] PlayerProvider first render');
  }

  const hasAudio = (song) => Boolean(song && typeof song.url === 'string' && song.url.length > 0);

  const queueManagerRef = useRef(new QueueManager([]));
  const playerReplacement = useAudioPlayer();
  const player = playerReplacement;
  const status = useAudioPlayerStatus(player);
  const { isAuthenticated } = useAuth();

  // Only ever resume a track that we deliberately asked to start, and never
  // more than once per replace. Guards against overlapping play() calls when
  // the user rapidly switches songs and against auto-play on mount.
  const loadGenerationRef = useRef(0);
  const pendingPlayRef = useRef(null);

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

  const playSong = useCallback(
    (song) => {
      if (!song) return;
      if (!hasAudio(song)) {
        setPlaybackError(STRINGS.player.audioUnavailable);
        return;
      }
      const isSameSong = currentSong?.id === song.id;

      if (isSameSong) {
        setPlaybackError(null);
        if (pendingPlayRef.current?.id === song.id) {
          return;
        }
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
      setPlaybackError(null);
      if (isAuthenticated) {
        SongsService.addToHistory(song.id);
      }
      const generation = loadGenerationRef.current + 1;
      loadGenerationRef.current = generation;
      pendingPlayRef.current = { id: song.id, generation };
      try {
        player.pause();
        player.replace({
          uri: song.url,
          metadata: {
            title: song.title,
            artist: song.artist,
            artwork: song.artwork,
          },
        });
      } catch (e) {
        console.log('Failed to start playback:', e);
        pendingPlayRef.current = null;
        setPlaybackError(STRINGS.player.loadFailed);
      }
    },
    [currentSong, isPlaying, player, status, isAuthenticated]
  );

  useEffect(() => {
    const pending = pendingPlayRef.current;
    if (
      status?.isLoaded &&
      pending &&
      pending.id === currentSong?.id &&
      pending.generation === loadGenerationRef.current &&
      !isPlaying &&
      !playbackError
    ) {
      pendingPlayRef.current = null;
      player.play();
    }
  }, [status?.isLoaded, currentSong?.id, isPlaying, playbackError, player]);

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    if (!hasAudio(currentSong)) {
      setPlaybackError(STRINGS.player.audioUnavailable);
      return;
    }
    setPlaybackError(null);
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
    const maxTries = (songs?.length || 0) + 1;
    let tries = 0;
    let nextSong = queueManagerRef.current.getNext({ shuffle: isShuffle, repeatMode });
    while (nextSong && !hasAudio(nextSong) && tries < maxTries) {
      tries += 1;
      nextSong = queueManagerRef.current.getNext({ shuffle: isShuffle, repeatMode });
    }
    if (nextSong) {
      playSong(nextSong);
    } else {
      player.pause();
      player.seekTo(0);
    }
  }, [songs, isShuffle, repeatMode, playSong, player]);

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

  const clearPlaybackError = useCallback(() => {
    setPlaybackError(null);
  }, []);

  const value = {
    currentSong,
    isPlaying,
    positionMs,
    durationMs,
    progress,
    isShuffle,
    repeatMode,
    songs,
    playbackError,
    clearPlaybackError,
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