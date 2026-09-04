import React, { useMemo, useState } from 'react';
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
import { SectionSkeleton, SongSkeleton } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

import { usePlayer } from '../player/PlayerContext';
import { useMusic } from '../store/MusicContext';

import { colors, typography, spacing, radius } from '../theme';

const HomeScreen = ({ openMenu, onOpenAuth, onOpenSearch }) => {
  const [homeFilter, setHomeFilter] = useState('All');

  const { songs, isLoading, refreshing, onRefresh, error } = useMusic();
  const { currentSong, isPlaying, playSong, setSongs } = usePlayer();

  const artists = useMemo(() => {
    const seen = new Map();
    songs.forEach((song) => {
      if (song?.artist && !seen.has(song.artist)) {
        seen.set(song.artist, song);
      }
    });
    return Array.from(seen.values()).slice(0, 8);
  }, [songs]);

  const trending = useMemo(() => songs.slice(0, 8), [songs]);
  const recent = useMemo(() => [...songs].reverse(), [songs]);

  React.useEffect(() => {
    if (songs.length > 0) setSongs(songs);
  }, [songs, setSongs]);

  const handlePlaySong = (song) => {
    if (!song) return;
    playSong(song);
  };

  const renderArtwork = ({ item }) => {
    if (!item) return null;
    return (
      <ArtworkCard
        song={item}
        isPlaying={currentSong?.id === item.id && isPlaying}
        onPlay={() => handlePlaySong(item)}
      />
    );
  };

  const renderArtist = ({ item }) => {
    if (!item) return null;
    return (
      <ArtworkAvatar
        uri={item.artwork}
        label={item.artist}
        onPress={() => handlePlaySong(item)}
      />
    );
  };

  if (isLoading && songs.length === 0) {
    return (
      <View style={styles.container}>
      <Header greeting onProfilePress={onOpenAuth} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <SectionSkeleton />
          <SectionSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header onProfilePress={onOpenAuth} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textMuted}
            colors={[colors.textMuted]}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YAAZH MUSIC</Text>
          <Text style={styles.title}>Listen to{'\n'}what moves you.</Text>
          <Text style={styles.subtitle}>
            Discover music, artists and sounds you love.
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
                style={[styles.filterButton, active && styles.filterButtonActive]}
                onPress={() => setHomeFilter(filter)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Error */}
        {error && songs.length === 0 ? (
          <ErrorState
            title="Music service unavailable"
            description={String(error)}
            onRetry={onRefresh}
          />
        ) : null}

        {/* Empty */}
        {!refreshing && songs.length === 0 && !error ? (
          <EmptyState
            title="No music available"
            description="Pull down to refresh and try again."
          />
        ) : null}

        {/* Trending */}
        {trending.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trending</Text>
                <Text style={styles.sectionSubtitle}>What people are listening to</Text>
              </View>
              <TouchableOpacity activeOpacity={0.8} onPress={onOpenSearch}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={trending}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => String(item?.id ?? index)}
              renderItem={renderArtwork}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        ) : null}

        {/* Artists */}
        {artists.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Artists</Text>
                <Text style={styles.sectionSubtitle}>Voices worth discovering</Text>
              </View>
            </View>
            <FlatList
              data={artists}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item?.artist ?? 'artist'}-${index}`}
              renderItem={renderArtist}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        ) : null}

        {/* Recently added */}
        {recent.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Recently added</Text>
                <Text style={styles.sectionSubtitle}>Fresh sounds for you</Text>
              </View>
            </View>
            <View style={styles.songList}>
              {recent.slice(0, 10).map((song, index) => (
                <View key={String(song?.id ?? index)} style={styles.songItem}>
                  <SongCard
                    song={song}
                    isPlaying={currentSong?.id === song.id && isPlaying}
                    onPlay={() => handlePlaySong(song)}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

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
    paddingBottom: 160,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.letterSpacing.caps,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.sizes.hero,
    lineHeight: typography.lineHeights.hero,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.body,
    color: colors.textSecondary,
    maxWidth: 320,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.textOnAccent,
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.sizes.subtitle,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  seeAll: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.sizes.bodySmall,
    color: colors.textSecondary,
  },
  horizontalList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  songList: {
    paddingHorizontal: spacing.lg,
  },
  songItem: {
    marginBottom: spacing.xs,
  },
  bottomSpace: {
    height: 80,
  },
});

export default HomeScreen;
