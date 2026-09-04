import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Artwork from './Artwork';
import ScalePress from './ScalePress';
import { colors, typography, radius, spacing } from '../theme';

const ACTIONS = [
  { key: 'play', icon: 'play-circle-outline', label: 'Play' },
  { key: 'like', iconOutline: 'heart-outline', iconFilled: 'heart', labelOutline: 'Like', labelFilled: 'Liked' },
  { key: 'playlist', icon: 'add-circle-outline', label: 'Add to Playlist' },
  { key: 'share', icon: 'share-social-outline', label: 'Share' },
];

const ActionMenu = ({ visible, song, isLiked, onClose, onLike, onAddToPlaylist, onShare, onPlay }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          {song ? (
            <>
              <View style={styles.header}>
                <Artwork uri={song.artwork} size={52} shape="sm" />
                <View style={styles.headerText}>
                  <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
                  <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <ScalePress onPress={onPlay} style={styles.itemPress}>
                  <View style={styles.item}>
                    <Ionicons name="play-circle-outline" size={22} color={colors.textPrimary} />
                    <Text style={styles.itemText}>Play</Text>
                  </View>
                </ScalePress>

                <ScalePress onPress={onLike} style={styles.itemPress}>
                  <View style={styles.item}>
                    <Ionicons
                      name={isLiked ? 'heart' : 'heart-outline'}
                      size={22}
                      color={isLiked ? colors.accent : colors.textSecondary}
                    />
                    <Text style={styles.itemText}>{isLiked ? 'Liked' : 'Like'}</Text>
                  </View>
                </ScalePress>

                <ScalePress onPress={onAddToPlaylist} style={styles.itemPress}>
                  <View style={styles.item}>
                    <Ionicons name="add-circle-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.itemText}>Add to Playlist</Text>
                  </View>
                </ScalePress>

                <ScalePress onPress={onShare} style={styles.itemPress}>
                  <View style={styles.item}>
                    <Ionicons name="share-social-outline" size={22} color={colors.textSecondary} />
                    <Text style={styles.itemText}>Share</Text>
                  </View>
                </ScalePress>
              </View>
            </>
          ) : null}

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
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
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamily.semibold,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
    marginTop: 4,
  },
  actions: {
    marginBottom: spacing.sm,
  },
  itemPress: {
    borderRadius: radius.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  itemText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    marginLeft: spacing.lg,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});

export default React.memo(ActionMenu);
