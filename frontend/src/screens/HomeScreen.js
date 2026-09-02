import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Header from '../components/Header';
import SongCard from '../components/SongCard';
import ArtworkCard from '../components/ArtworkCard';
import ArtworkAvatar from '../components/ArtworkAvatar';

import { usePlayer } from '../player/PlayerContext';
import { useMusic } from '../store/MusicContext';

import { colors, typography, spacing, radius } from '../theme';
import STRINGS from '../constants/strings';

const HomeScreen = ({ openMenu, onOpenAuth, onOpenSearch }) => {
  const [homeFilter, setHomeFilter] = useState('All');

  /*
   * Get music data from MusicContext.
   *
   * IMPORTANT:
   * error is included here because it is used below
   * to display the music service error.
   */
  const {
    songs,
    refreshing,
    onRefresh,
    error,
  } = useMusic();

  const {
    currentSong,
    isPlaying,
    playSong,
  } = usePlayer();

  useEffect(() => {
    console.log('[Yaazh][BOOT] HomeScreen mounted');
  }, []);

  /*
   * Create a unique artist list.
   */
  const artists = useMemo(() => {
    const seen = new Map();

    songs.forEach((song) => {
      if (
        song?.artist &&
        !seen.has(song.artist)
      ) {
        seen.set(song.artist, song);
      }
    });

    return Array.from(seen.values()).slice(0, 8);
  }, [songs]);

  /*
   * Trending songs.
   */
  const trending = useMemo(() => {
    return songs.slice(0, 8);
  }, [songs]);

  /*
   * Recent songs.
   */
  const recent = useMemo(() => {
    return [...songs].reverse();
  }, [songs]);

  /*
   * Play a song.
   */
  const handlePlaySong = (song) => {
    if (!song) {
      return;
    }

    playSong(song);
  };

  /*
   * Render song.
   */
  const renderSong = ({ item }) => {
    if (!item) {
      return null;
    }

    const isCurrent =
      currentSong?.id === item?.id;

    return (
      <SongCard
        song={item}
        isPlaying={isCurrent && isPlaying}
        onPress={() => handlePlaySong(item)}
      />
    );
  };

  /*
   * Render artwork card.
   */
  const renderArtwork = ({ item }) => {
    if (!item) {
      return null;
    }

    return (
      <ArtworkCard
        song={item}
        onPress={() => handlePlaySong(item)}
      />
    );
  };

  /*
   * Render artist.
   */
  const renderArtist = ({ item }) => {
    if (!item) {
      return null;
    }

    return (
      <ArtworkAvatar
        uri={item.artwork}
        label={item.artist}
        onPress={() => handlePlaySong(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Header
        onMenuPress={openMenu}
        onAuthPress={onOpenAuth}
        onSearchPress={onOpenSearch}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            {STRINGS?.home?.eyebrow || 'YAAZH MUSIC'}
          </Text>

          <Text style={styles.title}>
            {STRINGS?.home?.title ||
              'Listen to what moves you.'}
          </Text>

          <Text style={styles.subtitle}>
            {STRINGS?.home?.subtitle ||
              'Discover music, artists and sounds you love.'}
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {['All', 'Tamil', 'Trending'].map((filter) => {
            const active = homeFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                style={[
                  styles.filterButton,
                  active &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setHomeFilter(filter)
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    active &&
                      styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Music service error */}
        {error && songs.length === 0 && (
          <View style={styles.feedError}>
            <Ionicons
              name="cloud-offline-outline"
              size={24}
              color={colors.accent}
            />

            <View style={styles.feedErrorContent}>
              <Text style={styles.feedErrorTitle}>
                Music service unavailable
              </Text>

              <Text style={styles.feedErrorText}>
                {String(error)}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.retryButton}
              onPress={onRefresh}
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {!refreshing &&
          songs.length === 0 &&
          !error && (
            <View style={styles.emptyState}>
              <Ionicons
                name="musical-notes-outline"
                size={42}
                color={colors.textMuted}
              />

              <Text style={styles.emptyTitle}>
                No music available
              </Text>

              <Text style={styles.emptyText}>
                Pull down to refresh and try again.
              </Text>
            </View>
          )}

        {/* Trending */}
        {trending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Trending
                </Text>

                <Text style={styles.sectionSubtitle}>
                  What people are listening to
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onOpenSearch?.()}
              >
                <Text style={styles.seeAll}>
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={trending}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) =>
                String(item?.id ?? index)
              }
              renderItem={renderArtwork}
              contentContainerStyle={
                styles.horizontalList
              }
            />
          </View>
        )}

        {/* Artists */}
        {artists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Artists
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Voices worth discovering
                </Text>
              </View>
            </View>

            <FlatList
              data={artists}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) =>
                `${item?.artist ?? 'artist'}-${index}`
              }
              renderItem={renderArtist}
              contentContainerStyle={
                styles.horizontalList
              }
            />
          </View>
        )}

        {/* Recently added */}
        {recent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Recently added
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Fresh sounds for you
                </Text>
              </View>
            </View>

            <View style={styles.songList}>
              {recent.slice(0, 10).map(
                (song, index) => (
                  <View
                    key={String(
                      song?.id ?? index
                    )}
                    style={styles.songItem}
                  >
                    {renderSong({
                      item: song,
                      index,
                    })}
                  </View>
                )
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  eyebrow: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 8,
  },

  title: {
    fontFamily:
      typography.fontFamily.display,
    fontSize: 34,
    lineHeight: 40,
    color: colors.textPrimary,
    marginBottom: 10,
  },

  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    maxWidth: 340,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundSecondary,
  },

  filterButtonActive: {
    backgroundColor: colors.accent,
  },

  filterText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },

  filterTextActive: {
    color: colors.background,
  },

  section: {
    marginBottom: 28,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: 14,
  },

  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 21,
    color: colors.textPrimary,
  },

  sectionSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },

  seeAll: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    color: colors.accent,
  },

  horizontalList: {
    paddingHorizontal: spacing.lg,
    gap: 14,
  },

  songList: {
    paddingHorizontal: spacing.lg,
  },

  songItem: {
    marginBottom: 8,
  },

  feedError: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: 24,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
  },

  feedErrorContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  feedErrorTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 3,
  },

  feedErrorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.elevated,
  },

  retryText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.accent,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },

  emptyTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: 14,
  },

  emptyText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },

  bottomSpace: {
    height: 80,
  },
});

export default HomeScreen;