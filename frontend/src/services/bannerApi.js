import api from './api';
import StorageService from './storage';

const BANNER_CACHE_TTL_MS = 5 * 60 * 1000;

const stringOr = (value) => (value == null ? '' : String(value));

const VALID_ACTION_TYPES = ['screen', 'url', 'none'];

export const normalizeBanner = (banner) => {
  if (!banner || typeof banner !== 'object') return null;
  const action = banner.action && typeof banner.action === 'object' ? banner.action : {};
  const actionType = VALID_ACTION_TYPES.includes(action.type) ? action.type : 'none';
  return {
    id: stringOr(banner.id),
    type: stringOr(banner.type),
    title: stringOr(banner.title),
    subtitle: banner.subtitle ? String(banner.subtitle) : '',
    actionType,
    actionTarget: action.target ? stringOr(action.target) : '',
    imageKey: banner.imageKey ? stringOr(banner.imageKey) : '',
    imageUrl: banner.imageUrl ? stringOr(banner.imageUrl) : '',
  };
};

export const normalizeBanners = (list) =>
  Array.isArray(list) ? list.map(normalizeBanner).filter(Boolean) : [];

const fetchInlineBanners = async () => {
  const response = await api.get('/api/banners/inline');
  const data = (response && response.data) || {};
  return normalizeBanners(data.banners);
};

/**
 * Returns inline banners. Uses a short-lived local cache first, then the
 * network. If the network fails, falls back to the cached copy when it exists.
 * Throws only when there is neither a cached nor a network copy (callers then
 * render nothing).
 */
export async function getInlineBanners(options = {}) {
  try {
    const cached = await StorageService.getInlineBanners(BANNER_CACHE_TTL_MS);
    if (cached) return cached;
  } catch {
    // fall through to network
  }

  const banners = await fetchInlineBanners(options);
  try {
    await StorageService.setInlineBanners(banners);
  } catch {
    // cache is best-effort
  }
  return banners;
}

export default {
  getInlineBanners,
  normalizeBanner,
  normalizeBanners,
};
