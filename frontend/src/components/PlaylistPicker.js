import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLibrary } from '../store/LibraryContext';
import { colors, typography, radius, spacing } from '../theme';

const PlaylistPicker = ({ visible = false, song, onClose }) => {
  const { playlists, createPlaylist, addSongToPlaylist } = useLibrary();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (visible) {
      setNewName('');
      setCreating(false);
      setNotice(null);
    }
  }, [visible]);

  if (!song) return null;

  const handleSelect = async (playlist) => {
    await addSongToPlaylist(playlist, song);
    setNotice(`${song.title} added to ${playlist.name}`);
    setCreating(false);
    setNewName('');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const playlist = await createPlaylist(newName.trim());
    await addSongToPlaylist(playlist, song);
    setNotice(`${song.title} added to ${playlist.name}`);
    setNewName('');
    setCreating(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Add to playlist</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          {creating ? (
            <View style={styles.createRow}>
              <TextInput
                style={styles.input}
                placeholder="New playlist name"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                onSubmitEditing={handleCreate}
                returnKeyType="done"
                accessibilityLabel="New playlist name"
              />
              <TouchableOpacity
                style={[styles.createBtn, !newName.trim() && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim()}
                accessibilityRole="button"
                accessibilityLabel="Create playlist"
              >
                <Ionicons name="checkmark" size={22} color={colors.textOnAccent} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.createPlaylistRow}
              onPress={() => setCreating(true)}
              accessibilityRole="button"
              accessibilityLabel="New playlist"
            >
              <View style={styles.createPlaylistIcon}>
                <Ionicons name="add" size={22} color={colors.textPrimary} />
              </View>
              <Text style={styles.createPlaylistText}>New playlist</Text>
            </TouchableOpacity>
          )}

          <FlatList
            data={playlists}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            ListEmptyComponent={
              !creating ? (
                <Text style={styles.emptyText}>No playlists yet. Create one above.</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.playlistRow}
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`Add to ${item.name}`}
              >
                <View style={styles.playlistIcon}>
                  <Ionicons name="musical-notes" size={18} color={colors.textMuted} />
                </View>
                <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.songCount}>{item.songCount ?? 0} songs</Text>
              </TouchableOpacity>
            )}
          />
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
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  doneText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontFamily: typography.fontFamily.semibold,
  },
  notice: {
    color: colors.success,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.md,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createPlaylistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 48,
  },
  createPlaylistIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  createPlaylistText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  list: {
    flexGrow: 0,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playlistIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  playlistName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  songCount: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.body,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.bodySmall,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

export default React.memo(PlaylistPicker);
