import api, { normalizeError } from './api';
import { STRINGS } from '../constants/strings';

export const MAX_LIMIT = 20;

const stringOr = (value) => (value == null ? '' : String(value));

export const normalizeYaazhSong = (song) => {
  if (!song) return null;
  return {
    id: stringOr(song.id),
    title: stringOr(song.title),
    artist: stringOr(song.artist),
    artists: Array.isArray(song.artists) ? song.artists.map(stringOr) : [],
    album: stringOr(song.album),
    artwork: stringOr(song.artworkUrl || song.artwork),
    url: stringOr(song.audioUrl || song.url),
    duration: Number(song.duration) || 0,
    language: song.language ? stringOr(song.language) : undefined,
    year: song.year ? Number(song.year) : undefined,
    source: song.source ? stringOr(song.source) : 'audius',
    sourceId: song.sourceId ? stringOr(song.sourceId) : undefined,
  };
};

export const normalizeSongs = (list) =>
  Array.isArray(list) ? list.map(normalizeYaazhSong).filter(Boolean) : [];

const clampLimit = (limit) => {
  const parsed = parseInt(limit, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return MAX_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const clampPage = (page) => {
  const parsed = parseInt(page, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

export async function searchSongs(query, page = 1, limit = MAX_LIMIT, options = {}) {
  const safeLimit = clampLimit(limit);
  const safePage = clampPage(page);
  const response = await api.get(
    '/api/music/search',
    {
      q: query,
      page: safePage,
      limit: safeLimit,
    },
    options
  );
  const data = (response && response.data) || {};
  return {
    songs: normalizeSongs(data.songs),
    page: (data.pagination && data.pagination.page) || safePage,
    limit: (data.pagination && data.pagination.limit) || safeLimit,
    hasNextPage: Boolean(data.pagination && data.pagination.hasNextPage),
  };
}

export async function getDefaultSongs(page = 1, limit = MAX_LIMIT, options = {}) {
  const safeLimit = clampLimit(limit);
  const safePage = clampPage(page);
  const response = await api.get('/api/songs', { page: safePage, limit: safeLimit }, options);
  return normalizeSongs((response && response.data && response.data.songs) || []);
}

export const toUserMessage = (error) => {
  const normalized = normalizeError(error);
  if (!normalized.code && !normalized.status && !normalized.message) {
    return STRINGS.search.error;
  }
  if (normalized.code === 'NETWORK_ERROR' || normalized.code === 'TIMEOUT') {
    return STRINGS.errors.musicService;
  }
  if (normalized.code === 'MUSIC_PROVIDER_UNAVAILABLE' || normalized.status === 503) {
    return STRINGS.errors.musicService;
  }
  if (normalized.code === 'INVALID_RESPONSE' || normalized.status === 500) {
    return STRINGS.errors.serverError;
  }
  return STRINGS.search.error;
};

export default {
  searchSongs,
  getDefaultSongs,
  normalizeYaazhSong,
  normalizeSongs,
  toUserMessage,
  MAX_LIMIT,
};