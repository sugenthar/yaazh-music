import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Artwork from './Artwork';
import ScalePress from './ScalePress';
import { colors, typography, radius, spacing } from '../theme';

const NAVBAR_HEIGHT = 64;

const BottomPlayer = ({ song, isPlaying, onTogglePlay, onPlayNext, progress = 0, onPress }) => {
  const insets = useSafeAreaInsets();
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(appear, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 0,
    }).start();
  }, [appear]);

  if (!song) return null;

  return (
    <Animated.View
      style={[
        styles.position,
        {
          bottom: NAVBAR_HEIGHT + insets.bottom + spacing.sm,
          opacity: appear,
          transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <ScalePress onPress={onPress} style={styles.press} activeScale={0.98}>
        <View style={styles.container}>
          <Artwork uri={song.artwork} size={48} shape="sm" />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
          </View>
          <View style={styles.controls}>
            <ScalePress onPress={onTogglePlay} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
              <View style={styles.playBtn}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={18}
                  color={colors.textOnAccent}
                  style={!isPlaying ? { marginLeft: 2 } : undefined}
                />
              </View>
            </ScalePress>
            <ScalePress onPress={onPlayNext} accessibilityLabel="Next track">
              <View style={styles.nextBtn}>
                <Ionicons name="play-forward" size={16} color={colors.textPrimary} />
              </View>
            </ScalePress>
          </View>
          <View style={[styles.progressTrack, { width: `${Math.min(progress * 100, 100)}%` }]} />
        </View>
      </ScalePress>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 90,
  },
  press: {
    borderRadius: radius.lg,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    paddingRight: spacing.md,
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.semibold,
  },
  artist: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  nextBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: colors.accent,
    borderTopRightRadius: 2,
  },
});

export default React.memo(BottomPlayer);
