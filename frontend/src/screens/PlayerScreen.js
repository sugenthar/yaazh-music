import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  StyleSheet,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../player/PlayerContext';
import { useLibrary } from '../store/LibraryContext';
import { useMusic } from '../store/MusicContext';
import ArtworkHero from '../components/ArtworkHero';
import { getRepeatIcon } from '../player/playerUtils';
import { formatTime } from '../utils/helpers';
import { colors, typography, radius, spacing } from '../theme';
import { STRINGS } from '../constants/strings';

const { width } = Dimensions.get('window');

const PlayerScreen = ({ activeTab, visible = true, onClose, onOpenMenu }) => {
  const insets = useSafeAreaInsets();
  const {
    currentSong,
    isPlaying,
    positionMs,
    durationMs,
    progress,
    isShuffle,
    repeatMode,
    togglePlay,
    playNext,
    playPrevious,
    playSong,
    seekByTap,
    toggleShuffle,
    cycleRepeat,
    playbackError,
    clearPlaybackError,
  } = usePlayer();

  const { likedSongs, toggleLike } = useLibrary();
  const { songs } = useMusic();
  const [sheet, setSheet] = useState(null);

  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.stopAnimation();
    scale.setValue(1);
    if (isPlaying) {
      const loop = Animated.sequence([
        Animated.timing(scale, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]);
      Animated.loop(loop).start();
    }
    return () => scale.stopAnimation();
  }, [isPlaying, currentSong?.id]);

  useEffect(() => {
    setSheet(null);
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const isLiked = likedSongs.includes(currentSong.id);
  const heroSize = Math.min(width - 80, 320);

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <Ionicons name="chevron-down" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>{STRINGS.player.nowPlaying}</Text>
            <Text style={styles.headerLabel} numberOfLines={1}>{activeTab}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onOpenMenu(currentSong)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Options"
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.artworkContainer}>
          <ArtworkHero uri={currentSong.artwork} size={heroSize} animatedScale={scale} />
        </View>

        <View style={styles.songInfo}>
          <View style={styles.songInfoRow}>
            <View style={styles.songTitles}>
              <Text style={styles.songTitle} numberOfLines={1}>{currentSong.title}</Text>
              <Text style={styles.songArtist} numberOfLines={1}>{currentSong.artist}</Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleLike(currentSong.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
            >
              <View style={styles.likeBtn}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isLiked ? colors.accent : colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {playbackError ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText} numberOfLines={2}>{playbackError}</Text>
            <TouchableOpacity
              onPress={clearPlaybackError}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => {
            const tapX = e.nativeEvent.locationX;
            const barWidth = width - spacing.xl * 2;
            seekByTap(tapX, barWidth);
          }}
          style={styles.progressContainer}
          accessibilityRole="adjustable"
          accessibilityLabel="Seek"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.timeLabel}>{formatTime(positionMs / 1000)}</Text>
            <Text style={styles.timeLabel}>{formatTime(durationMs / 1000)}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={toggleShuffle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.player.shuffle}
            accessibilityState={{ selected: isShuffle }}
          >
            <Ionicons name="shuffle" size={22} color={isShuffle ? colors.accent : colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={playPrevious}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.player.previous}
          >
            <Ionicons name="play-skip-back" size={30} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.playButton} accessibilityRole="button" accessibilityLabel="Play or pause">
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={colors.textOnAccent} style={!isPlaying ? { marginLeft: 3 } : undefined} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={playNext}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.player.next}
          >
            <Ionicons name="play-skip-forward" size={30} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={cycleRepeat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.player.repeat}
            accessibilityState={{ selected: repeatMode !== 'off' }}
          >
            <Ionicons name={getRepeatIcon(repeatMode)} size={22} color={repeatMode === 'off' ? colors.textMuted : colors.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.sheetRow}>
          <TouchableOpacity
            style={[styles.sheetBtn, sheet === 'lyrics' && styles.sheetBtnActive]}
            onPress={() => setSheet(sheet === 'lyrics' ? null : 'lyrics')}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.player.lyrics}
            accessibilityState={{ selected: sheet === 'lyrics' }}
          >
            <Ionicons name="musical-notes-outline" size={18} color={sheet === 'lyrics' ? colors.textOnAccent : colors.textSecondary} />
            <Text style={[styles.sheetBtnText, sheet === 'lyrics' && styles.sheetBtnTextActive]}>{STRINGS.player.lyrics}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetBtn, sheet === 'queue' && styles.sheetBtnActive]}
            onPress={() => setSheet(sheet === 'queue' ? null : 'queue')}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.player.queue}
            accessibilityState={{ selected: sheet === 'queue' }}
          >
            <Ionicons name="list-outline" size={18} color={sheet === 'queue' ? colors.textOnAccent : colors.textSecondary} />
            <Text style={[styles.sheetBtnText, sheet === 'queue' && styles.sheetBtnTextActive]}>{STRINGS.player.queue}</Text>
          </TouchableOpacity>
        </View>

        {sheet === 'lyrics' ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{STRINGS.player.lyrics}</Text>
            <View style={styles.sheetBody}>
              <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
              <Text style={styles.sheetBodyTitle}>{currentSong.title}</Text>
              <Text style={styles.sheetBodyText}>{STRINGS.player.lyricsUnavailable}</Text>
            </View>
          </View>
        ) : null}

        {sheet === 'queue' ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{STRINGS.player.queue}</Text>
            {songs.length > 0 ? (
              <FlatList
                data={songs}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                style={styles.queueList}
                renderItem={({ item }) => {
                  const active = currentSong?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={styles.queueRow}
                      onPress={() => playSong(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${item.title}`}
                    >
                      <Text style={[styles.queueTitle, active && styles.queueTitleActive]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.queueArtist} numberOfLines={1}>{item.artist}</Text>
                      {active ? <Ionicons name="volume-high" size={14} color={colors.accent} /> : null}
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <View style={styles.sheetBody}>
                <Ionicons name="list-outline" size={44} color={colors.textMuted} />
                <Text style={styles.sheetBodyText}>{STRINGS.player.queueEmpty}</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerEyebrow: {
    color: colors.textMuted,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.caps,
  },
  headerLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
  },
  artworkContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    marginBottom: spacing.md,
  },
  songInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  songTitles: {
    flex: 1,
    marginRight: spacing.md,
  },
  songTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.titleLarge,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.tight,
  },
  songArtist: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
    marginTop: 4,
  },
  likeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.body,
    marginRight: spacing.sm,
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.borderStrong,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  sheetBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  sheetBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.medium,
    marginLeft: spacing.xs,
  },
  sheetBtnTextActive: {
    color: colors.textOnAccent,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    padding: spacing.xl,
    maxHeight: '60%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamily.semibold,
    marginBottom: spacing.md,
  },
  sheetBody: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  sheetBodyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    marginTop: spacing.md,
  },
  sheetBodyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: typography.lineHeights.bodySmall,
  },
  queueList: {
    flexGrow: 0,
    maxHeight: 420,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  queueTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  queueTitleActive: {
    color: colors.accent,
  },
  queueArtist: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.body,
    marginLeft: spacing.md,
    maxWidth: '40%',
  },
});

export default PlayerScreen;
