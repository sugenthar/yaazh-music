import React, { useState, useMemo } from 'react';
import { ScrollView, View, FlatList, RefreshControl, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import SongCard from '../components/SongCard';
import ArtworkCard from '../components/ArtworkCard';
import ArtworkAvatar from '../components/ArtworkAvatar';
import { usePlayer } from '../player/PlayerContext';
import { useMusic } from '../store/MusicContext';
import { colors, typography, radius, spacing } from '../theme';
import { STRINGS } from '../constants/strings';

const FILTERS = ['All', 'Music', 'Podcasts'];

const HomeScreen = ({ openMenu, onOpenAuth, onOpenSearch }) => {
  const [homeFilter, setHomeFilter] = useState('All');
  const { songs, refreshing, onRefresh } = useMusic();
  const { currentSong, isPlaying, playSong } = usePlayer();

  const artists = useMemo(() => {
    const seen = new Map();
    songs.forEach(s => {
      if (!seen.has(s.artist)) seen.set(s.artist, s);
    });
    return [...seen.values()].slice(0, 8);
  }, [songs]);

  const trending = songs.slice(0, 8);
  const recent = [...songs].reverse();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          titleColor={colors.textSecondary}
          colors={[colors.accent]}
        />
      }
    >
      <Header greeting onProfilePress={onOpenAuth} />

      {homeFilter === 'Podcasts' ? (
        <View style={styles.centerSection}>
          <View style={styles.emptyIcon}>
            <Ionicons name="mic-outline" size={56} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>Podcasts aren't part of the collection yet.</Text>
          <Text style={styles.emptyHint}>Music is the heart of Yaazh. Explore it below instead.</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={onOpenSearch}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.home.searchPlaceholder}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <Text style={styles.searchText} numberOfLines={1}>
              {homeFilter === 'Music'
                ? 'What are you in the mood for?'
                : STRINGS.home.searchPlaceholder}
            </Text>
          </TouchableOpacity>

          <View style={styles.pillRow}>
            {FILTERS.map(filter => (
              <TouchableOpacity
                key={filter}
                onPress={() => setHomeFilter(filter)}
                accessibilityRole="button"
                accessibilityState={{ selected: homeFilter === filter }}
                accessibilityLabel={filter}
              >
                <Text style={homeFilter === filter ? styles.pillActive : styles.pillInactive}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.shelf}>
            <Text style={styles.sectionTitle}>{STRINGS.home.popularArtists}</Text>
            <FlatList
              horizontal
              data={artists}
              renderItem={({ item }) => (
                <ArtworkAvatar
                  uri={item.artwork}
                  label={item.artist}
                  sublabel={STRINGS.home.listeners}
                  active={currentSong?.id === item.id}
                  onPress={() => playSong(item)}
                />
              )}
              keyExtractor={item => `artist-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shelfContent}
            />
          </View>

          <View style={styles.shelf}>
            <Text style={styles.sectionTitle}>{STRINGS.home.trendingNow}</Text>
            <FlatList
              horizontal
              data={trending}
              renderItem={({ item }) => (
                <ArtworkCard
                  song={item}
                  width={148}
                  zone={homeFilter === 'Music' ? 'Music' : 'Chart'}
                  isPlaying={currentSong?.id === item.id && isPlaying}
                  onPlay={() => playSong(item)}
                  onMenu={() => openMenu(item)}
                />
              )}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shelfContent}
            />
          </View>

          <View style={styles.shelf}>
            <Text style={styles.sectionTitle}>{STRINGS.home.recentlyPlayed}</Text>
            <View style={styles.listSection}>
              {recent.map(item => (
                <SongCard
                  key={item.id}
                  variant="row"
                  song={item}
                  isPlaying={currentSong?.id === item.id && isPlaying}
                  onPlay={() => playSong(item)}
                  onMenu={() => openMenu(item)}
                />
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 150,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.body,
    marginLeft: spacing.md,
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
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
  shelf: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontFamily: typography.fontFamily.display,
    letterSpacing: typography.letterSpacing.tight,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  shelfContent: {
    paddingHorizontal: spacing.lg,
  },
  listSection: {
    paddingHorizontal: spacing.lg,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamily.display,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default HomeScreen;