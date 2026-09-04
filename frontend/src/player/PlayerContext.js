import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import QueueManager from './QueueManager';
import StorageService from '../services/storage';
import SongsService from '../services/songs';
import { useAuth } from '../store/AuthContext';
import { STRINGS } from '../constants/strings';
import mediaSession from './MediaSession';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const logPlayer = (label, ...args) => {
  if (IS_DEV) {
    console.log(`[Yaazh][Player] ${label}`, ...args);
  }
};

logPlayer('module evaluated');

const PlayerContext = createContext(null);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

const SAVE_INTERVAL_MS = 5000;

const toMetadata = (song) =>
  song
    ? {
        title: song.title,
        artist: song.artist,
        albumTitle: song.album,
        artworkUrl: song.artwork,
      }
    : undefined;

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [songs, setSongs] = useState([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [playbackError, setPlaybackError] = useState(null);

  const renderLoggedRef = useRef(false);
  if (!renderLoggedRef.current) {
    renderLoggedRef.current = true;
    logPlayer('provider first render');
  }

  const hasAudio = (song) => Boolean(song && typeof song.url === 'string' && song.url.length > 0);

  const queueManagerRef = useRef(new QueueManager([]));
  // Single logical player owned here; no screen ever creates its own player.
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const { isAuthenticated } = useAuth();

  // Only ever resume a track that we deliberately asked to start, and never
  // more than once per replace. Guards against overlapping play() calls when
  // the user rapidly switches songs and against auto-play on mount.
  const loadGenerationRef = useRef(0);
  const pendingPlayRef = useRef(null);
  // Silent (no autoplay) restore bookkeeping: { songId, positionSec, generation }.
  const restoreRef = useRef(null);

  useEffect(() => {
    logPlayer('create');
    // Point the system media-session adapter at the single audio player so the
    // OS notification/lock-screen controls mirror exactly this player.
    mediaSession.setPlayer(player);
    // Required for real Android background playback: keeps the audio session
    // active (foreground media service) so audio survives Home/lock/app switch.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    })
      .then(() => logPlayer('audioMode', 'shouldPlayInBackground=true'))
      .catch((e) => logPlayer('audioMode failed', e));
    return () => {
      mediaSession.dispose();
    };
  }, [player]);

  // Lifecycle tracking ONLY for dev logging. Deliberately no pause()/play() —
  // the audio engine keeps the source of truth while backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      logPlayer('appstate', nextState);
    });
    return () => sub.remove();
  }, []);

  const isPlaying = Boolean(status?.playing ?? status?.isPlaying ?? false);
  const positionMs = ((status?.currentTime ?? 0) * 1000);
  const durationMs = ((status?.duration ?? 0) * 1000);
  const progress = status?.duration > 0 ? (status?.currentTime ?? 0) / status?.duration : 0;

  const seekToSeconds = useCallback(
    (seconds) => {
      try {
        const result = player.seekTo(seconds);
        if (result && typeof result.then === 'function') {
          result.catch(() => {});
        }
      } catch {
        /* ignore seek errors until the source is loaded */
      }
    },
    [player]
  );

  // --- persistence -------------------------------------------------------
  const saveStateRef = useRef(null);
  const persistPlayerState = () => {
    if (!currentSong) return;
    // Skip writes while a silent restore is still loading, so the saved
    // position is not clobbered by the preload's position 0.
    if (restoreRef.current) return;
    const snapshot = {
      song: currentSong,
      positionSec: Math.round(status?.currentTime ?? 0),
      isPlaying,
    };
    logPlayer('position save', snapshot.positionSec, 'isPlaying', isPlaying);
    StorageService.setPlayerState(snapshot).catch(() => {});
  };
  useEffect(() => {
    saveStateRef.current = persistPlayerState;
  });

  useEffect(() => {
    if (currentSong && !restoreRef.current) {
      saveStateRef.current?.();
    }
  }, [currentSong]);

  useEffect(() => {
    if (currentSong && !isPlaying) {
      saveStateRef.current?.();
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentSong) return;
    const id = setInterval(() => saveStateRef.current?.(), SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [currentSong]);

  // --- restore (never autoplay) -----------------------------------------
  useEffect(() => {
    logPlayer('restore begin');
    (async () => {
      try {
        const saved = await StorageService.getPlayerState();
        const storedSong = saved?.song || (await StorageService.getCurrentSong());
        if (!storedSong || !hasAudio(storedSong)) {
          logPlayer('restore: nothing to restore');
          return;
        }
        logPlayer('restore currentSong', storedSong.id, 'saved position', saved?.positionSec, 'wasPlaying', saved?.isPlaying);
        // currentSong restoration only. isPlaying stays false on launch:
        // "currentSong != isPlaying" is valid. Reopening never auto-play()s.
        setCurrentSong(storedSong);

        const generation = loadGenerationRef.current + 1;
        loadGenerationRef.current = generation;
        restoreRef.current = {
          songId: storedSong.id,
          positionSec: Math.max(0, Number(saved?.positionSec) || 0),
          generation,
        };
        try {
          player.pause();
          player.replace({
            uri: storedSong.url,
            metadata: toMetadata(storedSong),
          });
        } catch (e) {
          logPlayer('restore preload failed', e);
          restoreRef.current = null;
        }
      } catch (e) {
        logPlayer('restore error', e);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Silent seek after restored source finishes loading. No play() anywhere here.
  useEffect(() => {
    const r = restoreRef.current;
    if (!r) return;
    if (
      status?.isLoaded &&
      r.songId === currentSong?.id &&
      r.generation === loadGenerationRef.current &&
      !isPlaying
    ) {
      if (r.positionSec > 0) {
        logPlayer('restore seek', r.positionSec);
        seekToSeconds(r.positionSec);
      }
      restoreRef.current = null;
    }
  }, [status?.isLoaded, currentSong?.id, isPlaying, seekToSeconds]);

  useEffect(() => {
    queueManagerRef.current.setQueue(songs);
    if (currentSong) {
      queueManagerRef.current.setCurrentSong(currentSong);
    }
  }, [songs, currentSong]);

  useEffect(() => {
    StorageService.getRepeatMode().then(setRepeatMode);
    StorageService.getShuffle().then(setIsShuffle);
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

  // System media notification: reflect the active song on the lock screen /
  // notification. Runs whenever the current song changes (next/previous/queue
  // selection/auto-completion/home/search/library/mood) so metadata always
  // tracks the actual playing track. Clears the session when there is no song.
  useEffect(() => {
    if (currentSong) {
      mediaSession.sync({ song: currentSong, isPlaying });
    } else {
      mediaSession.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong]);

  // Keep the OS play/pause state and now-playing clock fresh on discrete
  // play/pause transitions. The adapter throttles actual native writes to
  // song changes, so this does not spam the system while a track plays.
  useEffect(() => {
    if (currentSong) {
      mediaSession.sync({ song: currentSong, isPlaying, forceMetadata: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentSong?.id]);

  // Shared load path used by user actions only. Sets the pending token so the
  // track plays exactly once when the engine reports isLoaded. A user action
  // supersedes any silent restore pending on another track.
  const startLoad = useCallback(
    (song) => {
      const generation = loadGenerationRef.current + 1;
      loadGenerationRef.current = generation;
      pendingPlayRef.current = { id: song.id, generation };
      if (restoreRef.current && restoreRef.current.songId !== song.id) {
        restoreRef.current = null;
      }
      try {
        player.pause();
        player.replace({
          uri: song.url,
          metadata: toMetadata(song),
        });
      } catch (e) {
        logPlayer('load failed', e);
        pendingPlayRef.current = null;
        setPlaybackError(STRINGS.player.loadFailed);
      }
    },
    [player]
  );

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
        if (!status?.isLoaded) {
          startLoad(song);
          return;
        }
        if (isPlaying) {
          logPlayer('pause', song.id);
          player.pause();
        } else {
          if ((status?.currentTime ?? 0) >= (status?.duration || 0)) {
            seekToSeconds(0);
          }
          logPlayer('play (same song)', song.id);
          player.play();
        }
        return;
      }

      setCurrentSong(song);
      setPlaybackError(null);
      if (isAuthenticated) {
        SongsService.addToHistory(song.id).catch(() => {});
      }
      logPlayer('load -> play', song.id);
      startLoad(song);
    },
    [currentSong, isPlaying, player, status?.isLoaded, status?.currentTime, status?.duration, isAuthenticated, startLoad, seekToSeconds]
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
      const r = restoreRef.current;
      if (r && r.songId === pending.id) {
        if (r.positionSec > 0) {
          seekToSeconds(r.positionSec);
        }
        restoreRef.current = null;
      }
      pendingPlayRef.current = null;
      logPlayer('play', pending.id);
      player.play();
    }
  }, [status?.isLoaded, currentSong?.id, isPlaying, playbackError, seekToSeconds, player]);

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    if (!hasAudio(currentSong)) {
      setPlaybackError(STRINGS.player.audioUnavailable);
      return;
    }
    setPlaybackError(null);
    if (isPlaying) {
      logPlayer('pause', currentSong.id);
      player.pause();
    } else {
      if (!status?.isLoaded) {
        // Restored metadata whose source is not loaded yet -> full load path.
        startLoad(currentSong);
        return;
      }
      if ((status?.currentTime ?? 0) >= (status?.duration || 0)) {
        seekToSeconds(0);
      }
      logPlayer('play', currentSong.id);
      player.play();
    }
  }, [currentSong, isPlaying, player, status?.isLoaded, status?.currentTime, status?.duration, startLoad, seekToSeconds]);

  const playNext = useCallback(() => {
    const maxTries = (songs?.length || 0) + 1;
    let tries = 0;
    let nextSong = queueManagerRef.current.getNext({ shuffle: isShuffle, repeatMode });
    while (nextSong && !hasAudio(nextSong) && tries < maxTries) {
      tries += 1;
      nextSong = queueManagerRef.current.getNext({ shuffle: isShuffle, repeatMode });
    }
    if (nextSong) {
      logPlayer('next', nextSong.id);
      playSong(nextSong);
    } else {
      player.pause();
      seekToSeconds(0);
    }
  }, [songs, isShuffle, repeatMode, playSong, seekToSeconds, player]);

  useEffect(() => {
    if (status?.didJustFinish) {
      logPlayer('didJustFinish');
      playNext();
    }
  }, [status?.didJustFinish, playNext]);

  const playPrevious = useCallback(() => {
    const prevSong = queueManagerRef.current.getPrevious();
    if (prevSong) {
      logPlayer('previous', prevSong.id);
      playSong(prevSong);
    }
  }, [playSong]);

  const seekTo = useCallback(
    (time) => {
      if (!player) return;
      logPlayer('seek', time);
      seekToSeconds(time);
      if (currentSong) {
        StorageService.setPlayerState({
          song: currentSong,
          positionSec: Math.max(0, Math.round(Number(time) || 0)),
          isPlaying,
        }).catch(() => {});
      }
    },
    [player, currentSong, isPlaying, seekToSeconds]
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
      if (player) seekTo(seekTime);
    },
    [player, status, seekTo]
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