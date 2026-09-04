import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';

const EmptyState = ({ icon = 'musical-notes-outline', title, description, action, style }) => (
  <View style={[styles.container, style]}>
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={32} color={colors.textMuted} />
    </View>
    {title ? <Text style={styles.title}>{title}</Text> : null}
    {description ? <Text style={styles.description}>{description}</Text> : null}
    {action}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.giant,
    paddingHorizontal: spacing.xxxl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.subtitle,
    fontFamily: typography.fontFamily.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
    lineHeight: typography.lineHeights.bodySmall,
    maxWidth: 280,
  },
});

export default React.memo(EmptyState);
