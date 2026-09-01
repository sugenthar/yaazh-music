import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Artwork from './Artwork';
import { colors, typography, radius, shadows } from '../theme';

const SIZE = 96;
const RING_GAP = 5;

/**
 * Circular artist/avatar artwork with a subtle contour ring and label.
 */
const ArtworkAvatar = ({ uri, label, sublabel, onPress, active = false }) => {
  const content = (
    <View style={styles.column}>
      <View style={[styles.ring, active && styles.ringActive]}>
        <View style={styles.circle}>
          <Artwork uri={uri} size={SIZE} shape="circle" overlay={false} ring />
        </View>
      </View>
      {label && (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      )}
      {sublabel && (
        <Text style={styles.sublabel} numberOfLines={1}>
          {sublabel}
        </Text>
      )}
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
    width: SIZE + RING_GAP * 2,
  },
  ring: {
    width: SIZE + RING_GAP * 2,
    height: SIZE + RING_GAP * 2,
    borderRadius: (SIZE + RING_GAP * 2) / 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...shadows.soft,
    backgroundColor: colors.backgroundSecondary,
  },
  ringActive: {
    borderColor: colors.accent,
  },
  circle: {
    overflow: 'hidden',
    borderRadius: SIZE / 2,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  sublabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.body,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.caps,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default ArtworkAvatar;