import React, { useCallback } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import ScalePress from '../ScalePress';
import { resolveBannerImage } from './bannerAssets';

const SAFE_URL_SCHEMES = ['http:', 'https:'];

const isValidUrl = (target) => {
  try {
    const parsed = new URL(target);
    return SAFE_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
};

const BannerCard = ({ banner, variant = 'featured', onOpenScreen }) => {
  const handlePress = useCallback(() => {
    if (!banner) return;
    const { actionType, actionTarget } = banner;
    if (actionType === 'url' && actionTarget && isValidUrl(actionTarget)) {
      Linking.openURL(actionTarget).catch(() => {});
      return;
    }
    if (actionType === 'screen' && actionTarget && typeof onOpenScreen === 'function') {
      onOpenScreen(actionTarget);
    }
  }, [banner, onOpenScreen]);

  const isFeatured = variant === 'featured';
  const imageSource = resolveBannerImage(banner);
  const interactive = banner && banner.actionType !== 'none';

  return (
    <ScalePress
      onPress={handlePress}
      disabled={!interactive}
      style={[styles.wrap, !isFeatured && styles.inlineWrap]}
      accessibilityRole={interactive ? 'button' : 'image'}
      accessibilityLabel={banner ? banner.title : undefined}
    >
      <View style={[styles.card, !isFeatured && styles.inlineCard]}>
        <View style={[styles.imageFrame, !isFeatured && styles.inlineFrame]}>
          <Image
            source={imageSource}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        {(banner && (banner.title || banner.subtitle)) ? (
          <View style={[styles.textOverlay, !isFeatured && styles.inlineText]}>
            {banner.title ? (
              <Text
                numberOfLines={isFeatured ? 2 : 1}
                style={[styles.title, !isFeatured && styles.inlineTitle]}
              >
                {banner.title}
              </Text>
            ) : null}
            {banner.subtitle ? (
              <Text numberOfLines={1} style={[styles.subtitle, !isFeatured && styles.inlineSubtitle]}>
                {banner.subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScalePress>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  inlineWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  card: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  inlineCard: {
    borderRadius: radius.md,
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 21 / 9,
    backgroundColor: colors.card,
  },
  inlineFrame: {
    aspectRatio: 3.5 / 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(5,5,5,0.55)',
  },
  inlineText: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.sizes.subtitle,
    lineHeight: typography.lineHeights.subtitle,
    color: colors.textPrimary,
  },
  inlineTitle: {
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.body,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inlineSubtitle: {
    marginTop: 0,
  },
});

export default React.memo(BannerCard);
