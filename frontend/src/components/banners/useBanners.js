import { useEffect, useState } from 'react';
import { getInlineBanners } from '../../services/bannerApi';

const EMPTY = [];

/**
 * Loads inline banners once. Renders empty (not an error) if the banner API is
 * unavailable so callers never break. Returns a stable array.
 */
export const useInlineBanners = () => {
  const [banners, setBanners] = useState(EMPTY);

  useEffect(() => {
    let cancelled = false;
    getInlineBanners()
      .then((items) => {
        if (!cancelled) setBanners(Array.isArray(items) ? items : EMPTY);
      })
      .catch(() => {
        if (!cancelled) setBanners(EMPTY);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return banners;
};

export default useInlineBanners;
