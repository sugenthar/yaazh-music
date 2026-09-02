import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import SongCard from '../components/SongCard';
import { usePlayer } from '../player/PlayerContext';
import { searchSongs as fetchRemoteSongs, MAX_LIMIT, toUserMessage } from '../services/musicApi';
import { normalizeError } from '../services/api';
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

const DEBOUNCE_MS = 400;

const mergeUnique = (existing, incoming) => {
  const seen = new Set(existing.map((s) => s.id));
  const merged = [...existing];
  incoming.forEach((s) => {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      merged.push(s);
    }
  });
  return merged;
};

const distinctArtists = (songs) => {
  const map = new Map();
  songs.forEach((s) => {
    if (s.artist && !map.has(s.artist)) map.set(s.artist, s);
  });
  return [...map.values()];
};

const SearchScreen = ({ openMenu, onOpenAuth }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { currentSong, isPlaying, playSong } = usePlayer();

  const [results, setResults] = useState([]);
  const [artists, setArtists] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [appendError, setAppendError] = useState(null);

  const debounceTimer = useRef(null);
  const requestSeq = useRef(0);
  const abortRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const resultsRef = useRef([]);
  const artistsRef = useRef([]);

  const loadPage = useCallback(async (query, targetPage, mode = 'replace') => {
    const q = query.trim();
    if (!q) return;
    const seq = ++requestSeq.current;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (mode === 'replace') {
      setLoading(true);
      setError(null);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setAppendError(null);
    }

    try {
      const result = await fetchRemoteSongs(q, targetPage, MAX_LIMIT, {
        signal: controller.signal,
      });
      if (seq !== requestSeq.current) return;

      if (mode === 'replace') {
        resultsRef.current = result.songs;
        setResults(result.songs);
        const nextArtists = distinctArtists(result.songs);
        artistsRef.current = nextArtists;
        setArtists(nextArtists);
        setPage(result.page);
        setHasNextPage(result.hasNextPage);
      } else {
        const prev = resultsRef.current;
        const merged = mergeUnique(prev, result.songs);
        resultsRef.current = merged;
        setResults(merged);
        const nextArtists = distinctArtists([
          ...artistsRef.current,
          ...result.songs.filter((s) => s.artist),
        ]);
        artistsRef.current = nextArtists;
        setArtists(nextArtists);
        const added = merged.length - prev.length;
        setPage(result.page);
        setHasNextPage(result.hasNextPage && added > 0);
      }
    } catch (e) {
      if (seq !== requestSeq.current) return;
      const normalized = normalizeError(e);
      if (normalized.code === 'ABORTED') return;
      const message = toUserMessage(e);
      if (mode === 'replace') {
        resultsRef.current = [];
        artistsRef.current = [];
        setResults([]);
        setArtists([]);
        setError(message);
      } else {
        setAppendError({ message, page: targetPage });
      }
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (abortRef.current) abortRef.current.abort();

    if (!q) {
      requestSeq.current += 1;
      resultsRef.current = [];
      artistsRef.current = [];
      setResults([]);
      setArtists([]);
      setPage(1);
      setHasNextPage(false);
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
      setRefreshing(false);
      setError(null);
      setAppendError(null);
      return undefined;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadPage(q, 1, 'replace');
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, loadPage]);

  const loadMore = useCallback(() => {
    const q = searchQuery.trim();
    if (!q || loadingMoreRef.current || loading || !hasNextPage) return;
    loadPage(q, page + 1, 'append');
  }, [searchQuery, loading, hasNextPage, page, loadPage]);

  const handleRefresh = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    setRefreshing(true);
    loadPage(q, 1, 'replace');
  }, [searchQuery, loadPage]);

  const isSearching = searchQuery.trim().length > 0;
  const showEmpty = isSearching && !loading && results.length === 0 && !error;

  const renderHeader = () => (
    <View style={styles.headerContent}>
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
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search"
            onSubmitEditing={() => {
              const q = searchQuery.trim();
              if (q) loadPage(q, 1, 'replace');
            }}
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

      {!isSearching && (
        <>
          <View style={styles.group}>
            <Text style={styles.sectionTitle}>{STRINGS.search.suggestions}</Text>
            <View style={styles.chips}>
              {SUGGESTIONS.map((s) => (
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
              {CATEGORIES.map((cat) => (
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

      {isSearching && artists.length > 0 && (
        <View style={styles.listSection}>
          <View style={styles.group}>
            <Text style={styles.groupTitle}>{STRINGS.search.artists}</Text>
            {artists.map((item) => (
              <SongCard
                key={`artist-${item.id}`}
                variant="row"
                song={item}
                isPlaying={currentSong?.id === item.id && isPlaying}
                onPlay={() => playSong(item)}
              />
            ))}
          </View>
        </View>
      )}

      {isSearching && results.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.groupTitle}>{STRINGS.search.songs}</Text>
        </View>
      )}

      {showEmpty && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{STRINGS.search.noResults}</Text>
          <Text style={styles.emptyHint}>{STRINGS.search.emptyHint}</Text>
        </View>
      )}

      {error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadPage(searchQuery.trim(), 1, 'replace')}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>{STRINGS.search.retry}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (appendError) {
      return (
        <View style={styles.footer}>
          <Text style={styles.moreErrorText}>{STRINGS.player.moreFailed}</Text>
          <TouchableOpacity
            style={styles.footerRetry}
            onPress={() => loadPage(searchQuery.trim(), appendError.page, 'append')}
            accessibilityRole="button"
          >
            <Text style={styles.footerRetryText}>{STRINGS.search.retry}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (loading || loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    }
    if (isSearching && results.length > 0 && !hasNextPage && !error) {
      return (
        <View style={styles.footer}>
          <Text style={styles.endText}>{STRINGS.search.endOfResults}</Text>
        </View>
      );
    }
    return null;
  };

  const renderItem = ({ item }) => (
    <View style={styles.rowWrap}>
      <SongCard
        variant="row"
        song={item}
        isPlaying={currentSong?.id === item.id && isPlaying}
        onPlay={() => playSong(item)}
        onMenu={() => openMenu(item)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={isSearching ? results : []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        removeClippedSubviews={false}
        keyboardDismissMode="none"
      />
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
  headerContent: {
    width: '100%',
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
  rowWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  endText: {
    color: colors.textMuted,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.body,
    letterSpacing: typography.letterSpacing.caps,
    textTransform: 'uppercase',
  },
  moreErrorText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    marginBottom: spacing.md,
  },
  footerRetry: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  footerRetryText: {
    color: colors.accent,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
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
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  retryText: {
    color: colors.background,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.semibold,
  },
});

export default SearchScreen;