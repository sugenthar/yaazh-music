const LOCAL_IMAGES = {
  yaazh_music_banner: require('../../../assets/yaazh_music_banner.png'),
  yaazh_logo: require('../../../assets/yaazh_logo.jpeg'),
};

/**
 * Maps a backend-provided imageKey to a bundled local asset, falling back to
 * a remote URL, then to the logo. Banner content itself always comes from the
 * API; this only resolves how it is displayed.
 */
export const resolveBannerImage = (banner) => {
  if (!banner) return LOCAL_IMAGES.yaazh_logo;
  const key = banner.imageKey || '';
  if (key && LOCAL_IMAGES[key]) {
    return LOCAL_IMAGES[key];
  }
  if (banner.imageUrl) {
    return { uri: banner.imageUrl };
  }
  return LOCAL_IMAGES.yaazh_logo;
};
