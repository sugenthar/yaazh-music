import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Artwork from './Artwork';
import { colors, shadows } from '../theme';

const ArtworkHero = ({ uri, size, shape = 'rounded', animatedScale, style }) => {
  const artwork = <Artwork uri={uri} size={size} shape={shape} />;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      {animatedScale ? (
        <Animated.View style={[{ transform: [{ scale: animatedScale }] }]}>{artwork}</Animated.View>
      ) : (
        artwork
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(ArtworkHero);
