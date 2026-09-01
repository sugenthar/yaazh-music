import React, { useMemo, useState } from 'react';
import { ScrollView, View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import SongCard from '../components/SongCard';
import { usePlayer } from '../player/PlayerContext';
import { useMusic } from '../store/MusicContext';
import { colors, typography, radius, spacing } from '../theme';
import { STRINGS } from '../constants/strings';

const CATEGORIES = [
  { id: '1', title: 'Tamil Classics', artwork: 'https://upload.wikimedia.org/wikipedia/en/3/30/Jailer_2023_Tamil_film_poster.jpg', color: '#8D67AB' },
  { id: '2', title: 'Pop', artwork: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=300', color: '#0D72EA' },
  { id: '3', title: 'Charts', artwork: 'https://images.unsplash.com/photo-1576525869588-e32a8db20ec3?w=300', color: '#BC5900' },
  { id: '4', title: 'Made For You', artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300', color: '#1E3264' },
  { id: '5', title: 'New Releases', artwork: 'https://images.unsplash.com/photo-1493224272065-c3e02398ebd9?w=300', color: '#E8115B' },
  { id: '6', title: 'Live', artwork: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300', color: '#8400E7' },
];

const SUGGESTIONS = ['Anirudh', 'Hukum', 'Badass', 'Mallipoo', 'Night', 'Focus', 'Jailer'];

const SearchScreen = ({ openMenu, onOpenAuth }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { songs } = useMusic();
  const { currentSong, isPlaying, playSong } = usePlayer();

  const filteredSongs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return songs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q)
    );
  }, [songs, searchQuery]);

  const topArtists = useMemo(() => {
    const seen = new Map();
    filteredSongs.forEach(s => {
      if (!seen.has(s.artist)) seen.set(s.artist, s);
    });
    return [...seen.values()];
  }, [filteredSongs]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header title={STRINGS.search.placeholder} onProfilePress={onOpenAuth} />

        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={STRINGS.search.placeholder}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {searchQuery.trim().length > 0 ? (
          <View style={styles.listSection}>
            {filteredSongs.length > 0 ? (
              <>
                {topArtists.length > 0 && (
                  <View style={styles.group}>
                    <Text style={styles.groupTitle}>{STRINGS.search.artists}</Text>
                    {topArtists.map(item => (
                      <SongCard
                        key={`artist-${item.id}`}
                        variant="row"
                        song={item}
                        isPlaying={currentSong?.id === item.id && isPlaying}
                        onPlay={() => playSong(item)}
                      />
                    ))}
                  </View>
                )}
                <View style={styles.group}>
                  <Text style={styles.groupTitle}>{STRINGS.search.songs}</Text>
                  {filteredSongs.map(item => (
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
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{STRINGS.search.noResults}</Text>
                <Text style={styles.emptyHint}>{STRINGS.search.emptyHint}</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.group}>
              <Text style={styles.sectionTitle}>{STRINGS.search.suggestions}</Text>
              <View style={styles.chips}>
                {SUGGESTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={styles.chip}
                    onPress={() => setSearchQuery(s)}
                    accessibilityRole="button"
                    accessibilityLabel={s}
                  >
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={styles.sectionTitle}>{STRINGS.search.browseAll}</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(cat => (
                  <SongCard
                    key={cat.id}
                    variant="genre"
                    song={cat}
                    onPlay={() => setSearchQuery(cat.title)}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 150,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.body,
    height: '100%',
    marginLeft: spacing.md,
  },
  listSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  group: {
    marginTop: spacing.xxl,
  },
  groupTitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.caps,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontFamily: typography.fontFamily.display,
    letterSpacing: typography.letterSpacing.tight,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamily.display,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default SearchScreen;