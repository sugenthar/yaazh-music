import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Artwork from './Artwork';
import { colors, typography, radius, spacing, shadows } from '../theme';

const SIZE = 88;

const ArtworkAvatar = ({ uri, label, sublabel, onPress, active = false }) => {
  const content = (
    <View style={styles.column}>
      <View style={[styles.ring, active && styles.ringActive]}>
        <Artwork uri={uri} size={SIZE} shape="circle" />
      </View>
      {label ? (
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      ) : null}
      {sublabel ? (
        <Text style={styles.sublabel} numberOfLines={1}>{sublabel}</Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    width: SIZE + 20,
  },
  ring: {
    width: SIZE + 12,
    height: SIZE + 12,
    borderRadius: (SIZE + 12) / 2,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    ...shadows.soft,
  },
  ringActive: {
    borderColor: colors.accent,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  sublabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.body,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.caps,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default React.memo(ArtworkAvatar);
