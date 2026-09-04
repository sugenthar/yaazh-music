import React from 'react';
import { StyleSheet, View, ActivityIndicator, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import Inter_400Regular from '@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf';
import Inter_500Medium from '@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf';
import Inter_600SemiBold from '@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf';
import Inter_700Bold from '@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf';
import DMSerifDisplay_400Regular from '@expo-google-fonts/dm-serif-display/400Regular/DMSerifDisplay_400Regular.ttf';

import { AuthProvider } from './src/store/AuthContext';
import { MusicProvider } from './src/store/MusicContext';
import { PlayerProvider } from './src/player/PlayerContext';
import { LibraryProvider } from './src/store/LibraryContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function App() {
  const [fontsReady] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMSerifDisplay_400Regular,
  });

  if (!fontsReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <MusicProvider>
          <PlayerProvider>
            <LibraryProvider>
              <AppNavigator />
            </LibraryProvider>
          </PlayerProvider>
        </MusicProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
