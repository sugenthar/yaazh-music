import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '../store/MusicContext';
import ArtworkHero from '../components/ArtworkHero';
import PrimaryButton from '../components/PrimaryButton';
import { colors, typography, spacing, radius } from '../theme';

const fallbackArtwork =
  'https://upload.wikimedia.org/wikipedia/en/7/77/Leo_film_poster.jpg';

const OnboardingScreen = ({ onSkip, onSignUp, onLogin }) => {
  const insets = useSafeAreaInsets();
  const { songs } = useMusic();
  const artwork = songs?.[0]?.artwork || fallbackArtwork;

  return (
    <LinearGradient
      colors={['#191815', '#11110F', '#11110F']}
      style={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brandEyebrow}>YAழH MUSIC</Text>
          </View>
          <TouchableOpacity
            onPress={onSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroArea}>
          <View style={styles.heroGlow} pointerEvents="none" />
          <ArtworkHero uri={artwork} size={260} shape="blob" />
        </View>

        <View style={styles.bottom}>
          <Text style={styles.headline}>Elevate Every{'\n'}Moment With Music</Text>
          <Text style={styles.tagline}>
            Discover music that matches your mood, your moment, and your story.
          </Text>
          <PrimaryButton label="Sign Up" onPress={onSignUp} style={styles.cta} />
          <TouchableOpacity
            onPress={onLogin}
            style={styles.loginLink}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
            <Text style={styles.loginText}>Already have an account? Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandEyebrow: {
    color: colors.accent,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.caps,
  },
  skip: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.medium,
  },
  heroArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    minHeight: 340,
  },
  heroGlow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: colors.warmGlow,
  },
  bottom: {
    alignItems: 'flex-start',
  },
  headline: {
    color: colors.textPrimary,
    fontSize: typography.sizes.hero,
    fontFamily: typography.fontFamily.display,
    lineHeight: typography.lineHeights.hero,
    letterSpacing: typography.letterSpacing.tight,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.body,
    lineHeight: typography.lineHeights.body,
    marginTop: spacing.lg,
    maxWidth: 320,
  },
  cta: {
    marginTop: spacing.xxxl,
  },
  loginLink: {
    marginTop: spacing.xl,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  loginText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});

export default OnboardingScreen;