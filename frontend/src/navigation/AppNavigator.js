import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import StorageService from '../services/storage';
import { usePlayer } from '../player/PlayerContext';
import { useLibrary } from '../store/LibraryContext';
import { colors, typography, spacing } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import MoodScreen from '../screens/MoodScreen';
import PlayerScreen from '../screens/PlayerScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';

import BottomPlayer from '../components/BottomPlayer';
import BottomTabs from '../components/BottomTabs';
import ActionMenu from '../components/ActionMenu';
import PlaylistPicker from '../components/PlaylistPicker';
import ProfileSheet from '../components/ProfileSheet';

const ONBOARDING_SEEN_KEY = 'yaazh_onboarding_seen';

const AppNavigator = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [onboarding, setOnboarding] = useState('loading'); // 'loading' | 'show' | 'hidden'
  const [authRoute, setAuthRoute] = useState(null); // null | 'login' | 'signup'
  const [isPlayerMaximized, setPlayerMaximized] = useState(false);
  const [menuSong, setMenuSong] = useState(null);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isPlaylistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [isProfileVisible, setProfileVisible] = useState(false);

  const { currentSong, isPlaying, progress, playSong, togglePlay, playNext, playPrevious } = usePlayer();
  const { likedSongs, toggleLike } = useLibrary();

  useEffect(() => {
    StorageService.get(ONBOARDING_SEEN_KEY).then(seen => {
      setOnboarding(seen ? 'hidden' : 'show');
    });
  }, []);

  const completeOnboarding = async () => {
    await StorageService.set(ONBOARDING_SEEN_KEY, true);
    setOnboarding('hidden');
  };

  const openMenu = (song) => {
    setMenuSong(song);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setMenuSong(null);
  };

  if (onboarding === 'loading') {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashBrand}>YAழH MUSIC</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeTab === 'Home' && (
        <HomeScreen
          openMenu={openMenu}
          onOpenAuth={() => setProfileVisible(true)}
          onOpenSearch={() => setActiveTab('Search')}
        />
      )}
      {activeTab === 'Search' && (
        <SearchScreen openMenu={openMenu} onOpenAuth={() => setProfileVisible(true)} />
      )}
      {activeTab === 'Library' && (
        <LibraryScreen openMenu={openMenu} onOpenAuth={() => setProfileVisible(true)} />
      )}
      {activeTab === 'Mood' && <MoodScreen onOpenAuth={() => setProfileVisible(true)} />}

      <PlayerScreen
        activeTab={activeTab}
        visible={isPlayerMaximized}
        onClose={() => setPlayerMaximized(false)}
        onOpenMenu={openMenu}
      />

      <PlaylistPicker
        visible={isPlaylistPickerVisible}
        song={menuSong}
        onClose={() => setPlaylistPickerVisible(false)}
      />

      {currentSong && (
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

      <ActionMenu
        visible={isMenuVisible}
        song={menuSong}
        isLiked={menuSong ? likedSongs.includes(menuSong.id) : false}
        onClose={closeMenu}
        onLike={() => { if (menuSong) { toggleLike(menuSong.id); closeMenu(); } }}
        onAddToPlaylist={() => { setMenuVisible(false); setPlaylistPickerVisible(true); }}
        onShare={closeMenu}
        onPlay={() => { if (menuSong) { playSong(menuSong); closeMenu(); } }}
      />

      <ProfileSheet
        visible={isProfileVisible}
        onClose={() => setProfileVisible(false)}
        onNavigateAuth={setAuthRoute}
      />

      {onboarding === 'show' && (
        <View style={styles.onboardingOverlay}>
          <OnboardingScreen
            onSkip={completeOnboarding}
            onSignUp={() => { completeOnboarding(); setAuthRoute('signup'); }}
            onLogin={() => { completeOnboarding(); setAuthRoute('login'); }}
          />
        </View>
      )}

      <LoginScreen
        visible={authRoute === 'login'}
        onClose={() => setAuthRoute(null)}
        onSuccess={() => setAuthRoute(null)}
        onGoSignUp={() => setAuthRoute('signup')}
      />
      <SignUpScreen
        visible={authRoute === 'signup'}
        onClose={() => setAuthRoute(null)}
        onSuccess={() => setAuthRoute(null)}
        onGoLogin={() => setAuthRoute('login')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  splashBrand: {
    color: colors.accent,
    fontSize: typography.sizes.large,
    fontFamily: typography.fontFamily.display,
    letterSpacing: typography.letterSpacing.wide,
  },
  onboardingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    backgroundColor: colors.background,
  },
});

export default AppNavigator;