import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import SongCard from '../components/SongCard';
import { usePlayer } from '../player/PlayerContext';
import { useLibrary } from '../store/LibraryContext';
import { useMusic } from '../store/MusicContext';
import { colors, typography, radius, spacing } from '../theme';
import { STRINGS } from '../constants/strings';

const FILTERS = ['All', 'Playlists', 'Artists', 'Albums'];

const LibraryScreen = ({ openMenu, onOpenAuth }) => {
  const [libFilter, setLibFilter] = useState('All');
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const { songs } = useMusic();
  const { currentSong, isPlaying, playSong } = usePlayer();
  const { likedSongs, playlists, removeSongFromPlaylist, deletePlaylist } = useLibrary();

  const filteredSongs = showOnlyLiked
    ? songs.filter(s => likedSongs.includes(s.id))
    : songs;

  const resetView = (filter) => {
    setLibFilter(filter);
    setShowOnlyLiked(false);
    setSelectedPlaylist(null);
  };

  const renderPlaylists = () => (
    <View style={styles.listSection}>
      {playlists.length > 0 ? (
        playlists.map(playlist => (
          <TouchableOpacity
            key={playlist.id}
            style={styles.libraryRow}
            onPress={() => setSelectedPlaylist(playlist)}
            accessibilityRole="button"
            accessibilityLabel={`Open playlist ${playlist.name}`}
          >
            <View style={styles.playlistArtwork}>
              <Ionicons name="musical-notes" size={20} color={colors.accent} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.libTitle} numberOfLines={1}>{playlist.name}</Text>
              <Text style={styles.libSub}>{playlist.songCount ?? 0} songs</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.centerSection}>
          <View style={styles.emptyIcon}>
            <Ionicons name="folder-open-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>{STRINGS.library.noPlaylists}</Text>
          <Text style={styles.emptyHint}>{STRINGS.library.noPlaylistsHint}</Text>
        </View>
      )}
    </View>
  );

  const renderPlaylistDetail = (playlist) => (
    <View style={styles.listSection}>
      <TouchableOpacity style={styles.backRow} onPress={() => setSelectedPlaylist(null)} accessibilityRole="button" accessibilityLabel="Back to playlists">
        <Ionicons name="chevron-back" size={20} color={colors.accent} />
        <Text style={styles.backText}>{STRINGS.library.backToPlaylists}</Text>
      </TouchableOpacity>

      <View style={styles.playlistDetailHeader}>
        <View style={styles.playlistDetailTitleWrap}>
          <Text style={styles.playlistDetailTitle} numberOfLines={1}>{playlist.name}</Text>
          <Text style={styles.libSub}>{playlist.songCount ?? 0} songs</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteRow}
          onPress={() => {
            deletePlaylist(playlist.id);
            setSelectedPlaylist(null);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Delete playlist ${playlist.name}`}
        >
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={styles.deleteText}>{STRINGS.library.deletePlaylist}</Text>
        </TouchableOpacity>
      </View>

      {playlist.songs && playlist.songs.length > 0 ? (
        playlist.songs.map(item => (
          <SongCard
            key={`${playlist.id}-${item.id}`}
            variant="row"
            song={item}
            isPlaying={currentSong?.id === item.id && isPlaying}
            onPlay={() => playSong(item)}
            onMenu={() => { removeSongFromPlaylist(playlist, item.id); }}
          />
        ))
      ) : (
        <View style={styles.centerSection}>
          <View style={styles.emptyIcon}>
            <Ionicons name="musical-notes-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>{STRINGS.library.emptyPlaylist}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header title={STRINGS.library.title} onProfilePress={onOpenAuth} />

      <View style={styles.pillRow}>
        {FILTERS.map(filter => (
          <TouchableOpacity
            key={filter}
            onPress={() => resetView(filter)}
            accessibilityRole="button"
            accessibilityState={{ selected: libFilter === filter && !showOnlyLiked }}
            accessibilityLabel={filter}
          >
            <Text style={libFilter === filter && !showOnlyLiked ? styles.pillActive : styles.pillInactive}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listSection}>
        <TouchableOpacity
          style={styles.libraryRow}
          onPress={() => {
            setShowOnlyLiked(!showOnlyLiked);
            setLibFilter('All');
            setSelectedPlaylist(null);
          }}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.library.likedSongs}
        >
          <View style={[styles.likedSongsArtwork, showOnlyLiked && styles.likedSongsArtworkActive]}>
            <Ionicons name="heart" size={20} color={showOnlyLiked ? colors.background : colors.accent} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={[styles.libTitle, showOnlyLiked && styles.libTitleActive]}>
              {showOnlyLiked ? STRINGS.library.showingLiked : STRINGS.library.likedSongs}
            </Text>
            <Text style={styles.libSub}>{likedSongs.length} songs</Text>
          </View>
          {showOnlyLiked && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
        </TouchableOpacity>
      </View>

      {libFilter === 'Playlists' ? (
        selectedPlaylist ? renderPlaylistDetail(selectedPlaylist) : renderPlaylists()
      ) : libFilter === 'Artists' || libFilter === 'Albums' ? (
        <View style={[styles.centerSection, styles.centerSectionNoTop]}>
          <View style={styles.emptyIcon}>
            <Ionicons name={libFilter === 'Artists' ? 'people-outline' : 'albums-outline'} size={40} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>{STRINGS.library.emptySection(libFilter)}</Text>
        </View>
      ) : (
        <View style={styles.listSection}>
          {filteredSongs.length > 0 ? (
            filteredSongs.map(item => (
              <SongCard
                key={item.id}
                variant="row"
                song={item}
                isPlaying={currentSong?.id === item.id && isPlaying}
                onPlay={() => playSong(item)}
                onMenu={() => openMenu(item)}
              />
            ))
          ) : (
            <View style={styles.centerSection}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-dislike-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>{showOnlyLiked ? STRINGS.library.noLiked : STRINGS.library.noLiked}</Text>
              <Text style={styles.emptyHint}>{STRINGS.library.noLikedHint}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 150,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  pillActive: {
    backgroundColor: colors.accent,
    color: colors.textOnAccent,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.sizes.sub,
    marginRight: spacing.sm,
  },
  pillInactive: {
    backgroundColor: colors.card,
    color: colors.textSecondary,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  likedSongsArtwork: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  likedSongsArtworkActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  playlistArtwork: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowInfo: {
    flex: 1,
  },
  libTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  libTitleActive: {
    color: colors.accent,
  },
  libSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 70,
    paddingHorizontal: spacing.xxl,
  },
  centerSectionNoTop: {
    paddingTop: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamily.display,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.medium,
    marginLeft: spacing.sm,
  },
  playlistDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  playlistDetailTitleWrap: {
    flex: 1,
  },
  playlistDetailTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.large,
    fontFamily: typography.fontFamily.display,
    letterSpacing: typography.letterSpacing.tight,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(201,106,75,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,106,75,0.3)',
  },
  deleteText: {
    color: colors.error,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.medium,
    marginLeft: spacing.xs,
  },
});

export default LibraryScreen;