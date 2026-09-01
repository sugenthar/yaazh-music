class QueueManager {
  constructor(songs = []) {
    this.queue = songs;
    this.currentIndex = -1;
  }

  setQueue(songs) {
    this.queue = songs;
  }

  setCurrentSong(song) {
    this.currentIndex = this.queue.findIndex(s => s.id === song?.id);
  }

  getCurrent() {
    return this.currentIndex >= 0 ? this.queue[this.currentIndex] : null;
  }

  getQueue() {
    return this.queue;
  }

  getNext({ shuffle = false, repeatMode = 'off' } = {}) {
    if (this.queue.length === 0) return null;

    if (repeatMode === 'one') {
      return this.getCurrent() || this.queue[0];
    }

    let nextIndex;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * this.queue.length);
      if (nextIndex === this.currentIndex && this.queue.length > 1) {
        nextIndex = (nextIndex + 1) % this.queue.length;
      }
    } else {
      nextIndex = this.currentIndex + 1;
      if (nextIndex >= this.queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return null;
        }
      }
    }
    return this.queue[nextIndex];
  }

  getPrevious() {
    if (this.queue.length === 0) return null;
    let prevIndex = this.currentIndex <= 0 ? this.queue.length - 1 : this.currentIndex - 1;
    return this.queue[prevIndex];
  }

  hasNext({ repeatMode = 'off' } = {}) {
    if (this.queue.length === 0) return false;
    if (repeatMode === 'all' || repeatMode === 'one') return true;
    return this.currentIndex < this.queue.length - 1;
  }
}

export default QueueManager;