import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import { usePlayer } from '../player/PlayerContext';
import { useMusic } from '../store/MusicContext';
import SongsService from '../services/songs';
import { colors, typography, radius, spacing, shadows } from '../theme';
import { STRINGS } from '../constants/strings';

const FALLBACK_MOODS = [
  { id: 'local-1', text: "Late night drives and this playlist are a therapy session", user: "Alex", color: '#7358FF', song: 'Nightcall' },
  { id: 'local-2', text: "Finding peace in the chaos.", user: "Sarah", color: '#C3AE8F', song: null },
  { id: 'local-3', text: "Bass so heavy I can't feel my face", user: "Mike", color: '#0D72EA', song: 'Hukum' },
  { id: 'local-4', text: "Nostalgia hitting hard today.", user: "Priya", color: '#8D67AB', song: 'Mallipoo' },
  { id: 'local-5', text: "Coding flow state activated.", user: "You", color: '#BC5900', song: null },
];

const MOOD_COLORS = ['#D8C5A8', '#7358FF', '#0D72EA', '#BC5900', '#8D67AB', '#C36B8B'];

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
        setMoods(remote.map((m, i) => ({ ...m, color: MOOD_COLORS[i % MOOD_COLORS.length] })));
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
      color: MOOD_COLORS[0],
      song: currentSong ? currentSong.title : null,
    };
    if (createdMood.color) createdMood.color = MOOD_COLORS[(moods.length) % MOOD_COLORS.length];
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
            placeholder="I'm feeling…"
            placeholderTextColor={colors.textMuted}
            multiline
            autoFocus
            value={newMoodText}
            onChangeText={setNewMoodText}
            maxLength={140}
            accessibilityLabel="Mood text"
          />
          {currentSong && (
            <View style={styles.songTag}>
              <Ionicons name="musical-notes" size={14} color={colors.accent} />
              <Text style={styles.songTagText}>{STRINGS.mood.listeningTo(currentSong.title)}</Text>
            </View>
          )}
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
              style={[styles.circle, { backgroundColor: item.color || colors.elevated }, active && styles.circleActive]}
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
            <Text style={[styles.userText, { color: activeMood.color || colors.accent }]}>
              @{activeMood.user}
            </Text>
            <Ionicons name="sparkles" size={14} color={colors.textMuted} />
          </View>
          <Text style={styles.moodText}>{activeMood.text}</Text>
          {activeMood.song ? (
            <View style={styles.songTag}>
              <Ionicons name="musical-notes" size={14} color={colors.accent} />
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
                ? `Listening to ${activeMood.song} — ${preset}`
                : preset;
              setActiveMood({ id: `preset-${preset}`, text: tagged, user: 'Yaazh', color: '#D8C5A8', song: null });
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
    paddingBottom: 150,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginTop: spacing.md,
  },
  createBtnText: {
    color: colors.textOnAccent,
    fontSize: typography.sizes.sub,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  circleActive: {
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  circleText: {
    color: '#11110F',
    fontSize: typography.sizes.section,
    fontFamily: typography.fontFamily.bold,
  },
  moodBox: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    margin: spacing.lg,
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userText: {
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  moodText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.large,
    fontFamily: typography.fontFamily.display,
    lineHeight: typography.lineHeights.large,
    letterSpacing: typography.letterSpacing.tight,
  },
  songTag: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.pill,
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
    fontSize: typography.sizes.sub,
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
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.medium,
  },
  composer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  composerLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    marginBottom: spacing.md,
  },
  moodInput: {
    color: colors.textPrimary,
    fontSize: typography.sizes.large,
    fontFamily: typography.fontFamily.display,
    lineHeight: typography.lineHeights.large,
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