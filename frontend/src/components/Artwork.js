import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

const getShapeStyle = (shape, size) => {
  switch (shape) {
    case 'circle':
      return { width: size, height: size, borderRadius: size / 2 };
    case 'square':
      return { width: size, height: size, borderRadius: size * 0.06 };
    case 'blob':
      return {
        width: size,
        height: size,
        borderTopLeftRadius: size * 0.38,
        borderTopRightRadius: size * 0.14,
        borderBottomLeftRadius: size * 0.08,
        borderBottomRightRadius: size * 0.34,
      };
    case 'rounded':
    default:
      return { width: size, height: size, borderRadius: radius.md };
  }
};

const Artwork = ({
  uri,
  size = 120,
  shape = 'rounded',
  overlay = false,
  style,
}) => {
  const shapeStyle = getShapeStyle(shape, size);

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      <View style={[shapeStyle, styles.imageWrap]}>
        {uri ? (
          <>
            <Image source={{ uri }} style={styles.image} />
            {overlay && (
              <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none" />
            )}
          </>
        ) : (
          <View style={styles.placeholder}>
            <View style={[styles.placeholderDisc, { width: size * 0.5 }]} />
            <View style={[styles.placeholderCenter, { width: size * 0.18 }]} />
          </View>
        )}
      </View>
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
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  placeholderDisc: {
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.elevated,
  },
  placeholderCenter: {
    position: 'absolute',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
  },
});

export default React.memo(Artwork);
