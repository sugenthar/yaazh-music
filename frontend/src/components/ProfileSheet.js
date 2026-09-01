import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { usePlayer } from '../player/PlayerContext';
import { useLibrary } from '../store/LibraryContext';
import { colors, typography, radius, spacing, shadows } from '../theme';

const ProfileSheet = ({ visible, onClose, onNavigateAuth }) => {
  const { user, logout } = useAuth();
  const { likedSongs, playlists } = useLibrary();
  const { currentSong } = usePlayer();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'Y'}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {user?.name || 'Guest listener'}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {user?.email || 'Sign in to sync your library'}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{likedSongs.length}</Text>
              <Text style={styles.statLabel}>LIKED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{playlists.length}</Text>
              <Text style={styles.statLabel}>PLAYLISTS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{currentSong ? '♪' : '—'}</Text>
              <Text style={styles.statLabel}>NOW PLAYING</Text>
            </View>
          </View>

          <View style={styles.actions}>
            {user ? (
              <TouchableOpacity style={styles.action} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Log out">
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Log Out</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.action} onPress={() => { onClose(); onNavigateAuth('login'); }} accessibilityRole="button" accessibilityLabel="Log in">
                  <Ionicons name="log-in-outline" size={20} color={colors.accent} />
                  <Text style={styles.actionText}>Log In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => { onClose(); onNavigateAuth('signup'); }} accessibilityRole="button" accessibilityLabel="Sign up">
                  <Ionicons name="person-add-outline" size={20} color={colors.accent} />
                  <Text style={styles.actionText}>Sign Up</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.action} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.actionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    ...shadows.floating,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.xl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    color: colors.accent,
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamily.semibold,
  },
  identityText: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamily.display,
  },
  email: {
    color: colors.textMuted,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontFamily: typography.fontFamily.display,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.caps,
    marginTop: 2,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    marginLeft: spacing.md,
  },
});

export default ProfileSheet;