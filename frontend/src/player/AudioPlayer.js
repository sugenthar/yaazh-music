import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

class AudioPlayerManager {
  constructor() {
    this.player = null;
    this.status = null;
  }

  async initialize() {
    await setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }

  createPlayer(url) {
    if (this.player) {
      try {
        this.player.release?.();
      } catch (e) {
        console.log('Error releasing previous player:', e);
      }
    }
    this.player = useAudioPlayer(url || undefined);
    this.status = useAudioPlayerStatus(this.player);
    return this.player;
  }

  play() {
    if (this.player) this.player.play();
  }

  pause() {
    if (this.player) this.player.pause();
  }

  toggle() {
    if (!this.player) return;
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  isPlaying() {
    return this.status?.playing ?? this.status?.isPlaying ?? false;
  }

  seekTo(time) {
    if (this.player) this.player.seekTo(time);
  }

  replaceSource(uri, metadata = {}) {
    if (this.player) {
      this.player.replace({
        uri,
        metadata,
      });
    }
  }

  getStatus() {
    return this.status;
  }

  getPositionSeconds() {
    return this.status?.currentTime ?? 0;
  }

  getDurationSeconds() {
    return this.status?.duration ?? 0;
  }

  getProgress() {
    const duration = this.getDurationSeconds();
    if (duration > 0) {
      return this.getPositionSeconds() / duration;
    }
    return 0;
  }
}

export const audioPlayerManager = new AudioPlayerManager();
export default AudioPlayerManager;
