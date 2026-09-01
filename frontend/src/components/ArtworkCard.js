import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Artwork from './Artwork';
import ScalePress from './ScalePress';
import { colors, typography, spacing, radius, shadows } from '../theme';

/**
 * Editorial song/album card used in horizontal shelves.
 * Rounded card, layered artwork, minimal metadata.
 */
const ArtworkCard = ({ song, isPlaying, onPlay, onMenu, width = 148, zone }) => {
  return (
    <View style={[styles.card, { width }]}>
      <ScalePress onPress={onPlay} activeScale={0.97}>
        <View style={styles.artworkWrap}>
          <Artwork uri={song.artwork} size={width} shape="blob" ornament />
          <View pointerEvents="none" style={styles.zoneBadge}>
            <Text style={styles.zoneText}>{zone}</Text>
          </View>
          {isPlaying && (
            <View style={styles.playingBadge}>
              <Ionicons name="volume-high" size={11} color={colors.background} />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{formatDuration(song.duration)}</Text>
            {onMenu && (
              <TouchableOpacity
                onPress={onMenu}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={`Options for ${song.title}`}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScalePress>
    </View>
  );
};

const formatDuration = (duration) => {
  if (!duration) return '—';
  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

const styles = StyleSheet.create({
  card: {
    marginRight: spacing.lg,
  },
  artworkWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoneText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.caps,
    textTransform: 'uppercase',
  },
  playingBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  info: {
    marginTop: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    letterSpacing: typography.letterSpacing.wide,
  },
});

export default ArtworkCard;