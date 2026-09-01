import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Artwork from './Artwork';
import ArtworkCard from './ArtworkCard';
import ScalePress from './ScalePress';
import { colors, typography, radius, spacing } from '../theme';

/**
 * Song presentation. `row` for lists, `card` for horizontal shelves,
 * `genre` for editorial category tiles.
 */
const SongCard = ({ song, variant = 'row', isPlaying, onPlay, onMenu }) => {

  if (variant === 'genre') {
    return (
      <ScalePress onPress={onPlay} style={styles.genreCard}>
        <Artwork uri={song.artwork} size={genreSize} shape="blob" overlay />
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
          <Artwork uri={song.artwork} size={52} shape="rounded" overlay={false} />
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, isPlaying && styles.rowTitleActive]} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.rowArtist} numberOfLines={1}>
              {song.artist}
            </Text>
          </View>
          {onPlay && (
            <View style={styles.rowPlay}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={colors.textOnAccent} />
            </View>
          )}
        </View>
      </ScalePress>
      {onMenu && (
        <TouchableOpacity
          onPress={onMenu}
          style={styles.menuBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Options for ${song.title}`}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const genreSize = 160;

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
    fontSize: typography.sizes.section,
    fontFamily: typography.fontFamily.display,
    letterSpacing: typography.letterSpacing.tight,
  },
  genreMeta: {
    color: colors.accent,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.caps,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
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
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
  },
  rowPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  menuBtn: {
    padding: spacing.sm,
    paddingLeft: spacing.lg,
  },
});

export default SongCard;