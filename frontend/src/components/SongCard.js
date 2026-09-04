import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Artwork from './Artwork';
import ArtworkCard from './ArtworkCard';
import ScalePress from './ScalePress';
import { colors, typography, radius, spacing } from '../theme';

const SongCard = ({ song, variant = 'row', isPlaying, onPlay, onMenu }) => {
  if (variant === 'genre') {
    return (
      <ScalePress onPress={onPlay} style={styles.genreCard}>
        <Artwork uri={song.artwork} size={160} shape="rounded" />
        <View style={styles.genreOverlay}>
          <Text style={styles.genreTitle}>{song.title}</Text>
          <Text style={styles.genreMeta}>EXPLORE</Text>
        </View>
      </ScalePress>
    );
  }

  if (variant === 'card') {
    return <ArtworkCard song={song} isPlaying={isPlaying} onPlay={onPlay} onMenu={onMenu} />;
  }

  return (
    <View style={styles.row}>
      <ScalePress onPress={onPlay} style={styles.rowPress}>
        <View style={styles.rowInner}>
          <Artwork uri={song.artwork} size={48} shape="sm" />
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, isPlaying && styles.rowTitleActive]} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.rowArtist} numberOfLines={1}>{song.artist}</Text>
          </View>
          {isPlaying ? (
            <View style={styles.nowPlaying}>
              <Ionicons name="volume-high" size={14} color={colors.accent} />
            </View>
          ) : onPlay ? (
            <View style={styles.playIndicator}>
              <Ionicons name="play" size={14} color={colors.textMuted} />
            </View>
          ) : null}
        </View>
      </ScalePress>
      {onMenu ? (
        <TouchableOpacity
          onPress={onMenu}
          style={styles.menuBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Options for ${song.title}`}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  genreCard: {
    width: '48%',
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  genreOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
  },
  genreTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.subtitle,
    fontFamily: typography.fontFamily.semibold,
  },
  genreMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.caps,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    minHeight: 56,
  },
  rowPress: {
    flex: 1,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  rowTitleActive: {
    color: colors.accent,
  },
  rowArtist: {
    color: colors.textMuted,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
  },
  nowPlaying: {
    marginLeft: spacing.md,
  },
  playIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  menuBtn: {
    padding: spacing.sm,
    paddingLeft: spacing.lg,
  },
});

export default React.memo(SongCard);
