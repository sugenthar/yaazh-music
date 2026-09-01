import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Artwork from './Artwork';
import { colors, shadows } from '../theme';

/**
 * Large hero artwork with organic masking and layered contour frames —
 * used in the full-screen player and authentication screens.
 */
const ArtworkHero = ({ uri, size, shape = 'blob', animatedScale, style }) => {
  const blobRadius = {
    borderTopLeftRadius: size * 0.42,
    borderTopRightRadius: size * 0.18,
    borderBottomLeftRadius: size * 0.1,
    borderBottomRightRadius: size * 0.38,
  };

  const artwork = <Artwork uri={uri} size={size} shape={shape} ornament overlay />;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <View
        pointerEvents="none"
        style={[styles.outerContour, { width: size + 38, height: size + 38, borderRadius: size * 0.3 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.outerBlob, { width: size + 22, height: size + 22, ...blobRadius }]}
      />
      <View style={styles.shadowWrap}>
        {animatedScale ? (
          <Animated.View style={[{ transform: [{ scale: animatedScale }] }]}>{artwork}</Animated.View>
        ) : (
          artwork
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerContour: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    opacity: 0.35,
  },
  outerBlob: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.warmGlowStrong,
    opacity: 0.6,
  },
  shadowWrap: {
    ...shadows.floating,
  },
});

export default ArtworkHero;