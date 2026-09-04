import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';

const ErrorState = ({ title = 'Something went wrong', description, onRetry, retryLabel = 'Try Again' }) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
    {onRetry ? (
      <View style={styles.retryBtn}>
        <Text style={styles.retryText} onPress={onRetry}>{retryLabel}</Text>
      </View>
    ) : null}
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
    marginBottom: spacing.xl,
  },
  retryBtn: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  retryText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.semibold,
  },
});

export default React.memo(ErrorState);
