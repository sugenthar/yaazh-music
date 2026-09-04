export const INSERT_INTERVAL = 10;

const BANNER_TAG = '__banner';

export const isBannerItem = (item) => Boolean(item && item[BANNER_TAG]);

const getBanner = (item) => (isBannerItem(item) ? item[BANNER_TAG] : null);

/**
 * Inserts inline banners after every `INSERT_INTERVAL` displayed songs,
 * computed against the COMPLETE displayed sequence (across pagination).
 * - Never inserts before song 1.
 * - Never invents songs: each banner replaces no song, it is appended.
 * - Rotates banners so longer lists cycle through all available banners.
 * - Returns the input unchanged when there are no songs or no banners.
 */
export const buildDisplayList = (items, banners) => {
  if (!Array.isArray(items) || items.length === 0) return items || [];
  if (!Array.isArray(banners) || banners.length === 0) return items;

  const result = [];
  items.forEach((item, index) => {
    result.push(item);
    const numSongs = index + 1;
    if (numSongs % INSERT_INTERVAL === 0) {
      const slot = Math.floor(numSongs / INSERT_INTERVAL) - 1;
      const banner = banners[slot % banners.length];
      if (banner) {
        result.push({
          [BANNER_TAG]: banner,
          __key: `banner-${String(banner.id)}-${numSongs}`,
        });
      }
    }
  });
  return result;
};

/**
 * Extracts the underlying song from a display-list item, returning null for
 * banner placeholders.
 */
export const itemSong = (item) => (isBannerItem(item) ? null : item);

export const itemKey = (item) =>
  isBannerItem(item) ? item.__key : String(item && item.id);

export { getBanner };
