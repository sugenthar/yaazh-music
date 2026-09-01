import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, StatusBar, ScrollView, TouchableOpacity, Dimensions, TextInput, Image, LogBox, RefreshControl, Modal } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SongCard from './components/SongCard';
import BottomPlayer from './components/BottomPlayer';
import BottomTabs from './components/BottomTabs';

// Ignore specific warnings
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated'
]);

const { width } = Dimensions.get('window');
const TOP_INSET = 40;

// GITHUB CONFIGURATION
const GITHUB_REPO_URL = "https://raw.githubusercontent.com/sugenthar/songsData/main/songs/song.json";

// Fallback data
const DEMO_SONGS = [
  {
    "id": "1",
    "title": "Badass - Leo",
    "artist": "Anirudh Ravichander",
    "artwork": "https://upload.wikimedia.org/wikipedia/en/7/77/Leo_film_poster.jpg",
    "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "duration": 220
  },
  {
    "id": "2",
    "title": "Hukum - Jailer",
    "artist": "Anirudh Ravichander",
    "artwork": "https://upload.wikimedia.org/wikipedia/en/3/30/Jailer_2023_Tamil_film_poster.jpg",
    "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "duration": 210
  }
];

// Mock Categories
const CATEGORIES = [
  { id: '1', title: 'Music', color: '#DC148C', artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
  { id: '2', title: 'Podcasts', color: '#006450', artwork: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=300' },
  { id: '3', title: 'Live Events', color: '#8400E7', artwork: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300' },
  { id: '4', title: 'Made For You', color: '#1E3264', artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300' },
  { id: '5', title: 'New Releases', color: '#E8115B', artwork: 'https://images.unsplash.com/photo-1493224272065-c3e02398ebd9?w=300' },
  { id: '6', title: 'Tamil', color: '#B02897', artwork: 'https://upload.wikimedia.org/wikipedia/en/9/93/Vikram_2022_poster.jpg' },
  { id: '7', title: 'Pop', color: '#0D72EA', artwork: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=300' },
  { id: '8', title: 'Hip-Hop', color: '#BC5900', artwork: 'https://images.unsplash.com/photo-1605722243979-fe0be8190009?w=300' },
  { id: '9', title: 'Charts', color: '#8D67AB', artwork: 'https://images.unsplash.com/photo-1576525869588-e32a8db20ec3?w=300' },
  { id: '10', title: 'Wellness', color: '#A56752', artwork: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300' },
];

const INITIAL_MOODS = [
  { id: '1', text: "Late night drives and this playlist are a therapy session 🌃", user: "Alex", color: '#7358FF', song: "Nightcall" },
  { id: '2', text: "Finding peace in the chaos.", user: "Sarah", color: '#1DB954' },
  { id: '3', text: "Bass so heavy I can't feel my face 🫠", user: "Mike", color: '#E13300', song: "Hukum" },
  { id: '4', text: "Nostalgia hitting hard today.", user: "Priya", color: '#BC5900', song: "Mallipoo" },
  { id: '5', text: "Coding flow state activated ⚡️", user: "You", color: '#0D72EA' },
];

export default function App() {
  // Audio Data
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlayerMaximized, setPlayerMaximized] = useState(false);

  // Home Filter State
  const [homeFilter, setHomeFilter] = useState('All');

  // Library State
  const [libFilter, setLibFilter] = useState('All');
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);

  // Player Modes & Favorites
  const [likedSongs, setLikedSongs] = useState([]); // IDs
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'

  // Menu State
  const [selectedMenuSong, setSelectedMenuSong] = useState(null);
  const [isMenuVisible, setMenuVisible] = useState(false);

  // Audio Player Hook
  const player = useAudioPlayer(currentSong?.url);
  const status = useAudioPlayerStatus(player);
  const hasFetched = useRef(false);

  // ... tabs and mood state ...

  const [activeTab, setActiveTab] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Moods State
  const [moods, setMoods] = useState(INITIAL_MOODS);
  const [activeMood, setActiveMood] = useState(INITIAL_MOODS[0]);
  const [isCreatingMood, setIsCreatingMood] = useState(false);
  const [newMoodText, setNewMoodText] = useState('');

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true
    });
    fetchSongs();
  }, []);

  // Auto-play when song changes
  useEffect(() => {
    if (player && currentSong) {
      player.play();
    }
  }, [currentSong, player]);

  // Handle auto-next
  useEffect(() => {
    if (status.didJustFinish) {
      playNext();
    }
  }, [status.didJustFinish]);

  // Derived Values for UI
  const isPlaying = status?.playing ?? status?.isPlaying ?? false;
  const positionMs = (status?.currentTime ?? 0) * 1000;
  const durationMs = (status?.duration ?? 0) * 1000;
  const progress = (status?.duration > 0) ? (status?.currentTime / status?.duration) : 0;
  const isLoading = status?.loading ?? false;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      console.log("Fetching from:", GITHUB_REPO_URL);
      const response = await fetch(GITHUB_REPO_URL);
      const json = await response.json();
      if (json.songs) {
        setSongs(json.songs);
      }
    } catch (e) {
      console.log("Error fetching songs, using fallback:", e);
      if (songs.length === 0) {
        setSongs(DEMO_SONGS);
      }
    } finally {
      // Ensure refreshing stops whether success or fail
      setRefreshing(false);
    }
  };

  const playSong = (song) => {
    if (!player) return;

    if (currentSong?.id === song.id) {
      if (isPlaying) {
        player.pause();
      } else {
        // If finished, restart
        if (status?.currentTime >= (status?.duration || 0)) {
          player.seekTo(0);
        }
        player.play();
      }
      return;
    }

    // New song: replace source and play
    setCurrentSong(song);

    // Set metadata for Lock Screen and Notification controls
    player.replace({
      uri: song.url,
      metadata: {
        title: song.title,
        artist: song.artist,
        artwork: song.artwork,
      }
    });
    player.play();
  };

  const togglePlay = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      if (status?.currentTime >= (status?.duration || 0)) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const playNext = () => {
    if (songs.length === 0 || !currentSong) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);

    // Repeat One logic
    if (repeatMode === 'one') {
      player.seekTo(0);
      player.play();
      return;
    }

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * songs.length);
      // Avoid playing the same song if possible
      if (nextIndex === currentIndex && songs.length > 1) {
        nextIndex = (nextIndex + 1) % songs.length;
      }
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= songs.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          // End of queue
          player.pause();
          player.seekTo(0);
          return;
        }
      }
    }
    playSong(songs[nextIndex]);
  };

  const playPrevious = () => {
    if (songs.length === 0 || !currentSong) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    let prevIndex = currentIndex === -1 ? 0 : currentIndex - 1;

    if (prevIndex < 0) {
      prevIndex = songs.length - 1;
    }
    playSong(songs[prevIndex]);
  };

  const toggleLike = (songId) => {
    setLikedSongs(prev =>
      prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
    );
  };

  const openMenu = (song) => {
    setSelectedMenuSong(song);
    setMenuVisible(true);
  };

  const handleCreateMood = () => {
    if (newMoodText.trim().length > 0) {
      const newMood = {
        id: Date.now().toString(),
        text: newMoodText,
        user: "You",
        color: '#1DB954',
        song: currentSong ? currentSong.title : null
      };
      setMoods([newMood, ...moods]);
      setActiveMood(newMood);
      setNewMoodText('');
      setIsCreatingMood(false);
    }
  };

  // --- REUSABLE GRADIENT HEADER COMPONENT ---
  const GradientHeader = ({ title, showProfile = true, children }) => {
    const insets = useSafeAreaInsets();
    return (
      <LinearGradient
        colors={['#484848', '#121212']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradientContainer, { paddingTop: insets.top + 10 }]}
      >
        <View>
          <View style={styles.headerTopRow}>
            {showProfile && (
              <View style={styles.profileContainer}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileInitials}>A</Text>
                </View>
              </View>
            )}
            {title ? (
              <Text style={styles.headerTitle}>{title}</Text>
            ) : null}
          </View>
          <View style={{ marginTop: 10 }}>
            {children}
          </View>
        </View>
      </LinearGradient>
    );
  };

  // --- TAB RENDERERS ---

  const renderHome = () => (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 150 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" titleColor="#fff" />
      }
    >
      <GradientHeader>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setHomeFilter('All')}>
            <Text style={homeFilter === 'All' ? styles.pillActive : styles.pillInactive}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setHomeFilter('Music')}>
            <Text style={homeFilter === 'Music' ? styles.pillActive : styles.pillInactive}>Music</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setHomeFilter('Podcasts')}>
            <Text style={homeFilter === 'Podcasts' ? styles.pillActive : styles.pillInactive}>Podcasts</Text>
          </TouchableOpacity>
        </View>
      </GradientHeader>

      <View style={styles.blackSection}>
        {homeFilter === 'Podcasts' ? (
          <View style={styles.centerSection}>
            <Ionicons name="mic-outline" size={64} color="#555" />
            <Text style={styles.emptyText}>No podcasts found in your library yet.</Text>
            <TouchableOpacity style={styles.secondaryBtn}>
              <Text style={styles.btnText}>Browse Podcasts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.shelf}>
              <Text style={styles.sectionTitle}>{homeFilter === 'Music' ? 'Top Music' : 'Recently played'}</Text>
              <FlatList
                horizontal
                data={songs}
                renderItem={({ item }) => (
                  <SongCard
                    variant="card"
                    song={item}
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
              <Text style={styles.sectionTitle}>Best of Tamil</Text>
              <FlatList
                horizontal
                data={[...songs].reverse()}
                renderItem={({ item }) => (
                  <SongCard
                    variant="card"
                    song={item}
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

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>More like Anirudh</Text>
              {songs.map(item => (
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
        )}
      </View>
    </ScrollView>
  );

  const renderSearch = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
      <GradientHeader title="Search" showProfile={true}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={22} color="#121212" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="What do you want to listen to?"
            placeholderTextColor="#444"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={22} color="#121212" />
            </TouchableOpacity>
          )}
        </View>
      </GradientHeader>

      <View style={styles.blackSection}>
        {searchQuery.length > 0 ? (
          <View style={styles.listSection}>
            {songs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
              <SongCard
                key={item.id}
                variant="row"
                song={item}
                isPlaying={currentSong?.id === item.id && isPlaying}
                onPlay={() => playSong(item)}
                onMenu={() => openMenu(item)}
              />
            ))}
            {songs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <Text style={styles.emptyText}>No results found.</Text>
            )}
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { marginLeft: 16 }]}>Browse all</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <SongCard key={cat.id} variant="genre" song={cat} />
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );

  const renderLibrary = () => {
    // Filter songs based on showOnlyLiked
    const filteredSongs = showOnlyLiked
      ? songs.filter(s => likedSongs.includes(s.id))
      : songs;

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <GradientHeader title="Your Library" showProfile={true}>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => { setLibFilter('All'); setShowOnlyLiked(false); }}>
              <Text style={libFilter === 'All' && !showOnlyLiked ? styles.pillActive : styles.pillInactive}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setLibFilter('Playlists'); setShowOnlyLiked(false); }}>
              <Text style={libFilter === 'Playlists' ? styles.pillActive : styles.pillInactive}>Playlists</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setLibFilter('Artists'); setShowOnlyLiked(false); }}>
              <Text style={libFilter === 'Artists' ? styles.pillActive : styles.pillInactive}>Artists</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setLibFilter('Albums'); setShowOnlyLiked(false); }}>
              <Text style={libFilter === 'Albums' ? styles.pillActive : styles.pillInactive}>Albums</Text>
            </TouchableOpacity>
          </View>
        </GradientHeader>

        <View style={styles.blackSection}>
          <View style={styles.listSection}>
            <TouchableOpacity
              style={[styles.libraryRow, { opacity: showOnlyLiked ? 1 : 0.7 }]}
              onPress={() => {
                setShowOnlyLiked(!showOnlyLiked);
                setLibFilter('All');
              }}
            >
              <View style={[styles.likedSongsSquare, { backgroundColor: showOnlyLiked ? '#1DB954' : '#4E0F98' }]}>
                <Ionicons name="heart" size={24} color="#fff" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.libTitle, { color: showOnlyLiked ? '#1DB954' : '#fff' }]}>
                  {showOnlyLiked ? 'Showing Liked Songs' : 'Liked Songs'}
                </Text>
                <Text style={styles.libSub}>Playlist • {likedSongs.length} songs</Text>
              </View>
            </TouchableOpacity>

            {libFilter === 'All' ? (
              <>
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
                    <Ionicons name="heart-dislike-outline" size={48} color="#444" />
                    <Text style={styles.emptyText}>You haven't liked any songs yet.</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.centerSection}>
                <Ionicons name="folder-open-outline" size={48} color="#444" />
                <Text style={styles.emptyText}>Your {libFilter.toLowerCase()} will appear here.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderPremium = () => {
    if (isCreatingMood) {
      return (
        <View style={[styles.container, { padding: 20, paddingTop: 60 }]}>
          <View style={styles.createMoodHeader}>
            <TouchableOpacity onPress={() => setIsCreatingMood(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postButton, { opacity: newMoodText.length > 0 ? 1 : 0.5 }]}
              onPress={handleCreateMood}
              disabled={newMoodText.length === 0}
            >
              <Text style={styles.postText}>Share</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.moodInput}
            placeholder="How are you feeling?"
            placeholderTextColor="#555"
            multiline
            autoFocus
            value={newMoodText}
            onChangeText={setNewMoodText}
            maxLength={140}
          />
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <GradientHeader title="Mood" showProfile={true} />

        <View style={styles.blackSection}>
          <FlatList
            horizontal
            data={moods}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.circle,
                  {
                    backgroundColor: item.color || '#333',
                    borderWidth: activeMood?.id === item.id ? 2 : 0,
                    borderColor: '#fff'
                  }
                ]}
                onPress={() => setActiveMood(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.circleText}>{item.user[0]}</Text>
              </TouchableOpacity>
            )}
          />

          {activeMood ? (
            <View style={[styles.moodBox, { padding: 20, margin: 16 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[styles.userText, { color: activeMood.color }]}>@{activeMood.user}</Text>
                <Ionicons name="musical-notes" size={16} color="rgba(255,255,255,0.4)" />
              </View>

              <Text style={styles.moodText}>{activeMood.text}</Text>

              {activeMood.song && (
                <View style={styles.moodSongTag}>
                  <Text style={styles.songTagText}>Listening to {activeMood.song}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={{ padding: 20 }}>
              <Text style={{ color: '#555' }}>Select a mood above</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderFullPlayer = () => {
    if (!currentSong) return null;

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={isPlayerMaximized}
        onRequestClose={() => setPlayerMaximized(false)}
      >
        <LinearGradient
          colors={['#484848', '#121212']}
          style={{ flex: 1, padding: 24, paddingTop: 60 }}
        >
          {/* Header: Chevron Down */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setPlayerMaximized(false)}>
              <Ionicons name="chevron-down" size={30} color="#fff" />
            </TouchableOpacity>

            <Text style={{ color: '#fff', fontSize: 13, letterSpacing: 1, fontWeight: '700' }}>
              NOW PLAYING FROM {activeTab.toUpperCase()}
            </Text>

            <TouchableOpacity onPress={() => openMenu(currentSong)}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Artwork */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={{ uri: currentSong.artwork }}
              style={{ width: width - 48, height: width - 48, borderRadius: 12 }}
            />
          </View>

          {/* Song Info */}
          <View style={{ marginBottom: 30 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{currentSong.title}</Text>
                <Text style={{ color: '#B3B3B3', fontSize: 18, marginTop: 4 }}>{currentSong.artist}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleLike(currentSong.id)}>
                <Ionicons
                  name={likedSongs.includes(currentSong.id) ? "heart" : "heart-outline"}
                  size={28}
                  color={likedSongs.includes(currentSong.id) ? "#1DB954" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => {
              const tapX = e.nativeEvent.locationX;
              const barWidth = width - 48; // padding 24 on each side
              const seekProgress = tapX / barWidth;
              const seekTime = seekProgress * (status?.duration || 0);
              player.seekTo(seekTime);
            }}
            style={{ marginBottom: 20 }}
          >
            <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
              <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: '#fff', borderRadius: 2 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: '#B3B3B3', fontSize: 12 }}>
                {new Date(Math.max(0, positionMs)).toISOString().substr(14, 5)}
              </Text>
              <Text style={{ color: '#B3B3B3', fontSize: 12 }}>
                {new Date(Math.max(0, durationMs)).toISOString().substr(14, 5)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Controls */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
            <Ionicons name="shuffle" size={30} color="#1DB954" />

            <TouchableOpacity onPress={playPrevious}>
              <Ionicons name="play-skip-back" size={36} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity onPress={playNext}>
              <Ionicons name="play-skip-forward" size={36} color="#fff" />
            </TouchableOpacity>

            <Ionicons name="repeat" size={30} color="#1DB954" />
          </View>

        </LinearGradient>
      </Modal>
    );
  };


  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#484848" />

        {activeTab === 'Home' && renderHome()}
        {activeTab === 'Search' && renderSearch()}
        {activeTab === 'Library' && renderLibrary()}
        {activeTab === 'Premium' && (
          <View style={{ flex: 1 }}>
            {renderPremium()}
            {!isCreatingMood && (
              <TouchableOpacity style={styles.floatingCreateBtn} onPress={() => setIsCreatingMood(true)}>
                <Ionicons name="pencil" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {renderFullPlayer()}
        {currentSong && !isCreatingMood && (
          <BottomPlayer
            song={currentSong}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onPlayNext={playNext}
            onPlayPrevious={playPrevious}
            progress={progress}
            onPress={() => setPlayerMaximized(true)}
          />
        )}
        <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Action Menu Modal */}
        <Modal
          visible={isMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuContent}>
              {selectedMenuSong && (
                <>
                  <View style={styles.menuHeader}>
                    <Image source={{ uri: selectedMenuSong.artwork }} style={styles.menuArt} />
                    <View>
                      <Text style={styles.menuTitle}>{selectedMenuSong.title}</Text>
                      <Text style={styles.menuArtist}>{selectedMenuSong.artist}</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.menuItem} onPress={() => { toggleLike(selectedMenuSong.id); setMenuVisible(false); }}>
                    <Ionicons
                      name={likedSongs.includes(selectedMenuSong.id) ? "heart" : "heart-outline"}
                      size={24}
                      color={likedSongs.includes(selectedMenuSong.id) ? "#1DB954" : "#fff"}
                    />
                    <Text style={styles.menuItemText}>{likedSongs.includes(selectedMenuSong.id) ? "Liked" : "Like"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                    <Ionicons name="add-circle-outline" size={24} color="#fff" />
                    <Text style={styles.menuItemText}>Add to playlist</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                    <Ionicons name="share-social-outline" size={24} color="#fff" />
                    <Text style={styles.menuItemText}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => { playSong(selectedMenuSong); setMenuVisible(false); }}>
                    <Ionicons name="play-outline" size={24} color="#fff" />
                    <Text style={styles.menuItemText}>Play song</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212'
  },
  gradientContainer: {
    paddingHorizontal: 16,
    // paddingTop is handled dynamically via useSafeAreaInsets
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  profileContainer: {
    marginRight: 12,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E91429',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#1DB954',
    color: '#000',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    fontWeight: '600',
    fontSize: 13,
    marginRight: 8,
  },
  pillInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    fontSize: 13,
    marginRight: 8,
  },
  blackSection: {
    backgroundColor: '#121212',
    paddingTop: 0,
  },
  shelf: {
    marginBottom: 30,
    marginTop: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  shelfContent: {
    paddingHorizontal: 16,
  },
  listSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    height: '100%',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  emptyText: {
    color: '#B3B3B3',
    textAlign: 'center',
    marginTop: 30,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  likedSongsSquare: {
    width: 48,
    height: 48,
    backgroundColor: '#4E0F98',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  libTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  libSub: {
    color: '#B3B3B3',
    fontSize: 13,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  circleText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  moodBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    minHeight: 200,
  },
  moodText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 34,
  },
  userText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  moodSongTag: {
    marginTop: 20,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
    borderRadius: 6,
  },
  songTagText: {
    color: '#aaa',
    fontSize: 12,
  },
  floatingCreateBtn: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  createMoodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
  postButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  moodInput: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '500',
    textAlignVertical: 'top',
    minHeight: 200,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: '#282828',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 20,
  },
  menuArt: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuArtist: {
    color: '#B3B3B3',
    fontSize: 14,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 16,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  secondaryBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#555',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
