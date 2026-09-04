/**
 * Yaazh Music – System media session adapter.
 *
 * Bridges the single source of truth (PlayerContext -> AudioPlayer) to the
 * operating system media notification / lock-screen controls via expo-audio's
 * native lock-screen API (`setActiveForLockScreen`, `updateLockScreenMetadata`,
 * `clearLockScreenControls`).
 *
 * This module contains NO business logic (no playlists, auth, songs API, or
 * backend access). It is a thin presentation adapter: it receives the current
 * player + song and mirrors that state to the OS. There is deliberately NO
 * duplicate "notification state" maintained here — the only source of truth is
 * the player passed in by PlayerContext.
 *
 * Platform notes (expo-audio ~1.1.1 / SDK 54):
 * - Android: activation starts a foreground MediaSessionService that shows the
 *   media notification with title/artist/album/artwork and play/pause controls.
 *   The native service wires play/pause directly to the ExoPlayer, so outcomes
 *   are reflected back into JS via `useAudioPlayerStatus` automatically.
 *   Next/Previous track commands are NOT exposed by the native media session in
 *   this expo-audio version.
 * - iOS: activation drives MPNowPlayingInfoCenter + MPRemoteCommandCenter
 *   (lock screen / Control Center / headphones). Play/pause/seek are wired
 *   natively and reflected back via status events.
 */
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

// OS media-session control configuration. Seek forward/backward are the only
// extra controls the native expo-audio session can expose beyond play/pause;
// next/previous track commands are not provided natively in this version.
const lockScreenOptions = {
  showSeekBackward: true,
  showSeekForward: true,
};

const log = (...args) => {
  if (IS_DEV) {
    console.log('[Yaazh][MediaSession]', ...args);
  }
};

/**
 * Build metadata for the native lock screen from a normalized Yaazh song.
 *
 * expo-audio expects `{ title, artist, albumTitle, artworkUrl }`. Missing
 * album/artwork are tolerated by the native side (it simply omits those fields
 * from the notification). We deliberately pass `undefined` so the native layer
 * skips them gracefully rather than rendering broken image/empty text.
 */
const toMediaMetadata = (song) => {
  if (!song) return undefined;
  const title = song.title || song.name || undefined;
  const artist = song.artist || song.artists?.join?.(' & ') || undefined;
  const albumTitle = song.album || undefined;
  const artworkUrl = song.artwork || undefined;
  return { title, artist, albumTitle, artworkUrl };
};

/**
 * MediaSession enables the OS media notification and keeps its metadata aligned
 * with the active player. Callers (PlayerContext) invoke `sync` whenever the
 * current song or playback state changes.
 */
class MediaSession {
  constructor() {
    this.player = null;
    this.songId = null;
    this.lastMetadata = null;
    this.isActive = false;
  }

  /**
   * Point the adapter at the single audio player owned by PlayerContext.
   * Registering once avoids duplicate listeners / native registrations.
   */
  setPlayer(player) {
    if (this.player === player) return;
    this.player = player || null;
    if (!this.player) {
      this.clear();
    }
  }

  /**
   * Activate the OS media session for the current player (if not yet active)
   * and push the latest song metadata. Does nothing before a player exists.
   */
  sync({ song, isPlaying, forceMetadata = false } = {}) {
    if (!this.player || !song) {
      if (song === null || song === undefined) {
        this.clear();
      }
      return;
    }

    const active = Boolean(this.player.setActiveForLockScreen);
    if (!active) {
      if (IS_DEV) log('lock screen controls unavailable on this platform/runtime');
      return;
    }

    const metadata = toMediaMetadata(song);

    if (!this.isActive) {
      try {
        this.player.setActiveForLockScreen(true, metadata, lockScreenOptions);
        this.isActive = true;
        this.songId = song.id;
        this.lastMetadata = metadata;
        log('activated for', song.id);
      } catch (e) {
        log('activate failed', e);
      }
      return;
    }

    const songChanged = this.songId !== song.id;
    if (songChanged || forceMetadata || !this.lastMetadata) {
      try {
        this.player.updateLockScreenMetadata(metadata);
        this.songId = song.id;
        this.lastMetadata = metadata;
        log('metadata updated for', song.id, '(playing:', !!isPlaying, ')');
      } catch (e) {
        log('metadata update failed', e);
      }
    }
  }

  /**
   * Removes this player from the OS media controls and clears now-playing info.
   * Safe to call repeatedly; no-op when the session is already inactive.
   */
  clear() {
    if (!this.player || !this.isActive) return;
    try {
      this.player.clearLockScreenControls?.();
    } catch (e) {
      log('clear failed', e);
    }
    this.isActive = false;
    this.songId = null;
    this.lastMetadata = null;
    log('cleared');
  }

  /**
   * Releases references. Call on app teardown/unmount to avoid leaks.
   */
  dispose() {
    this.clear();
    this.player = null;
  }
}

export const mediaSession = new MediaSession();
export default mediaSession;
