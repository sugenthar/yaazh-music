import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

const getShapeStyle = (shape, size) => {
  switch (shape) {
    case 'circle':
      return { width: size, height: size, borderRadius: size / 2 };
    case 'square':
      return { width: size, height: size, borderRadius: size * 0.08 };
    case 'blob':
      return {
        width: size,
        height: size,
        borderTopLeftRadius: size * 0.42,
        borderTopRightRadius: size * 0.16,
        borderBottomLeftRadius: size * 0.1,
        borderBottomRightRadius: size * 0.38,
      };
    case 'rounded':
    default:
      return { width: size, height: size, borderRadius: size * 0.22 };
  }
};

/**
 * Base artwork presentation. Provides the organic/editorial treatment used
 * across the app: warm gradient overlay, subtle contour rings and optional
 * floating contour decorations. Wrap in an Animated.View externally if a
 * scale animation is required.
 */
const Artwork = ({
  uri,
  size = 120,
  shape = 'rounded',
  overlay = true,
  ornament = false,
  ring = false,
  style,
}) => {
  const shapeStyle = getShapeStyle(shape, size);

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      {ornament && (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.contourRing,
              {
                width: size + 18,
                height: size + 18,
                borderRadius: (size + 18) / 2,
                left: -9,
                top: -9,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.contourSquircle,
              {
                width: size + 34,
                height: size + 34,
                borderRadius: (size + 34) * 0.3,
                left: -17,
                top: -17,
                transform: [{ rotate: '-6deg' }],
              },
            ]}
          />
        </>
      )}

      <View style={[shapeStyle, styles.imageWrap]}>
        <Image source={{ uri }} style={styles.image} />
        {overlay && (
          <LinearGradient
            colors={['rgba(17,17,15,0)', 'rgba(17,17,15,0.28)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}
      </View>

      {ring && <View pointerEvents="none" style={[styles.ringCap, getShapeStyle('circle', size), { left: 0, top: 0 }]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contourRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    opacity: 0.5,
  },
  contourSquircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.warmGlowStrong,
    opacity: 0.7,
  },
  ringCap: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.warmGlowStrong,
  },
});

export default Artwork;