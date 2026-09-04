import React from 'react';
import BannerCard from './BannerCard';

/**
 * Presentational wrapper for inline banners placed inside song lists. The
 * banner object is provided by the parent's display-list builder.
 */
const InlineBanner = ({ banner, onOpenScreen }) => (
  <BannerCard banner={banner} variant="inline" onOpenScreen={onOpenScreen} />
);

export default React.memo(InlineBanner);
