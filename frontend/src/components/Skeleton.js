import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

const SkeletonBlock = ({ width, height, borderRadius = radius.sm, style }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.7] });

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.skeleton, opacity }, style]}
    />
  );
};

const SongSkeleton = () => (
  <View style={songStyles.row}>
    <SkeletonBlock width={52} height={52} borderRadius={radius.sm} />
    <View style={songStyles.info}>
      <SkeletonBlock width="70%" height={14} borderRadius={4} />
      <SkeletonBlock width="45%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  </View>
);

const songStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  info: { flex: 1, marginLeft: 12 },
});

const ArtworkSkeleton = ({ size = 120 }) => (
  <SkeletonBlock width={size} height={size} borderRadius={radius.md} />
);

const SectionSkeleton = () => (
  <View style={sectionStyles.section}>
    <SkeletonBlock width={120} height={20} borderRadius={4} />
    <View style={sectionStyles.row}>
      <SkeletonBlock width={148} height={180} borderRadius={radius.lg} />
      <SkeletonBlock width={148} height={180} borderRadius={radius.lg} />
    </View>
  </View>
);

const sectionStyles = StyleSheet.create({
  section: { marginBottom: 32, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 14, marginTop: 14 },
});

export { SongSkeleton, ArtworkSkeleton, SectionSkeleton };
export default SkeletonBlock;
