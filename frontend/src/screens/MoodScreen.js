import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import { usePlayer } from '../player/PlayerContext';
import { useMusic } from '../store/MusicContext';
import SongsService from '../services/songs';
import { colors, typography, radius, spacing } from '../theme';
import { STRINGS } from '../constants/strings';

const FALLBACK_MOODS = [
  { id: 'local-1', text: "Late night drives and this playlist are a therapy session", user: "Alex", song: 'Nightcall' },
  { id: 'local-2', text: "Finding peace in the chaos.", user: "Sarah", song: null },
  { id: 'local-3', text: "Bass so heavy I can't feel my face", user: "Mike", song: 'Hukum' },
  { id: 'local-4', text: "Nostalgia hitting hard today.", user: "Priya", song: 'Mallipoo' },
  { id: 'local-5', text: "Coding flow state activated.", user: "You", song: null },
];

const MoodScreen = ({ onOpenAuth }) => {
  const { currentSong } = usePlayer();
  const [moods, setMoods] = useState(FALLBACK_MOODS);
  const [activeMood, setActiveMood] = useState(FALLBACK_MOODS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [newMoodText, setNewMoodText] = useState('');

  useEffect(() => {
    let mounted = true;
    SongsService.fetchMoods().then(remote => {
      if (mounted && remote && remote.length > 0) {
        setMoods(remote);
        setActiveMood(m => m ? m : remote[0]);
      }
    });
    return () => { mounted = false; };
  }, []);

  const canPost = newMoodText.trim().length > 0;

  const handleCreateMood = async () => {
    if (!canPost) return;
    const payload = {
      text: newMoodText,
      song: currentSong ? currentSong.title : null,
    };
    const created = await SongsService.createMood(payload);
    const createdMood = created || {
      id: `local-${Date.now()}`,
      text: newMoodText,
      user: 'You',
      song: currentSong ? currentSong.title : null,
    };
    setMoods(prev => [createdMood, ...prev]);
    setActiveMood(createdMood);
    setNewMoodText('');
    setIsCreating(false);
  };

  const displayedMoods = useMemo(() => moods.slice(0, 12), [moods]);

  if (isCreating) {
    return (
      <View style={styles.container}>
        <Header title={STRINGS.mood.createNew} onProfilePress={onOpenAuth} />
        <View style={styles.composer}>
          <Text style={styles.composerLabel}>{STRINGS.mood.createPrompt}</Text>
          <TextInput
            style={styles.moodInput}
            placeholder="I'm feeling\u2026"
            placeholderTextColor={colors.textMuted}
            multiline
            autoFocus
            value={newMoodText}
            onChangeText={setNewMoodText}
            maxLength={140}
            accessibilityLabel="Mood text"
          />
          {currentSong ? (
            <View style={styles.songTag}>
              <Ionicons name="musical-notes" size={14} color={colors.textMuted} />
              <Text style={styles.songTagText}>{STRINGS.mood.listeningTo(currentSong.title)}</Text>
            </View>
          ) : null}
          <View style={styles.composerActions}>
            <TouchableOpacity onPress={() => { setIsCreating(false); setNewMoodText(''); }} accessibilityRole="button" accessibilityLabel={STRINGS.mood.cancel}>
              <Text style={styles.cancelText}>{STRINGS.mood.cancel}</Text>
            </TouchableOpacity>
            <PrimaryButton
              label={STRINGS.mood.share}
              onPress={handleCreateMood}
              disabled={!canPost}
              compact
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header title={STRINGS.mood.title} onProfilePress={onOpenAuth}>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setIsCreating(true)}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.mood.createNew}
        >
          <Ionicons name="add" size={16} color={colors.textOnAccent} />
          <Text style={styles.createBtnText}>{STRINGS.mood.createNew}</Text>
        </TouchableOpacity>
      </Header>

      <Text style={styles.groupLabel}>{STRINGS.mood.community.toUpperCase()}</Text>
      <FlatList
        horizontal
        data={displayedMoods}
        keyExtractor={item => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ringContent}
        renderItem={({ item }) => {
          const active = activeMood?.id === item.id;
          const initial = (item.user || '?')[0].toUpperCase();
          return (
            <TouchableOpacity
              style={[styles.circle, active && styles.circleActive]}
              onPress={() => setActiveMood(item)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Mood by ${item.user}`}
            >
              <Text style={styles.circleText}>{initial}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {activeMood ? (
        <View style={styles.moodBox}>
          <View style={styles.moodHeader}>
            <Text style={styles.userText}>@{activeMood.user}</Text>
            <Ionicons name="sparkles" size={14} color={colors.textMuted} />
          </View>
          <Text style={styles.moodText}>{activeMood.text}</Text>
          {activeMood.song ? (
            <View style={styles.songTag}>
              <Ionicons name="musical-notes" size={14} color={colors.textMuted} />
              <Text style={styles.songTagText}>{STRINGS.mood.listeningTo(activeMood.song)}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.selectPrompt}>
          <Text style={styles.selectPromptText}>{STRINGS.mood.selectMood}</Text>
        </View>
      )}

      <View style={styles.presets}>
        {STRINGS.mood.presets.map(preset => (
          <TouchableOpacity
            key={preset}
            style={styles.presetChip}
            onPress={() => {
              const tagged = activeMood && activeMood.song
                ? `Listening to ${activeMood.song} \u2014 ${preset}`
                : preset;
              setActiveMood({ id: `preset-${preset}`, text: tagged, user: 'Yaazh', song: null });
            }}
            accessibilityRole="button"
            accessibilityLabel={preset}
          >
            <Text style={styles.presetText}>{preset}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 160,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginTop: spacing.md,
  },
  createBtnText: {
    color: colors.textOnAccent,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.semibold,
    marginLeft: spacing.xs,
  },
  groupLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.caps,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  ringContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.elevated,
  },
  circleActive: {
    borderColor: colors.accent,
    backgroundColor: colors.card,
  },
  circleText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.subtitle,
    fontFamily: typography.fontFamily.semibold,
  },
  moodBox: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    margin: spacing.lg,
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  moodText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.titleLarge,
    fontFamily: typography.fontFamily.display,
    lineHeight: typography.lineHeights.titleLarge,
    letterSpacing: typography.letterSpacing.tight,
  },
  songTag: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.elevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  songTagText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    marginLeft: spacing.xs,
  },
  selectPrompt: {
    padding: spacing.xl,
  },
  selectPromptText: {
    color: colors.textMuted,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.medium,
  },
  composer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  composerLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
    marginBottom: spacing.md,
  },
  moodInput: {
    color: colors.textPrimary,
    fontSize: typography.sizes.titleLarge,
    fontFamily: typography.fontFamily.display,
    lineHeight: typography.lineHeights.titleLarge,
    textAlignVertical: 'top',
    minHeight: 140,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});

export default MoodScreen;
