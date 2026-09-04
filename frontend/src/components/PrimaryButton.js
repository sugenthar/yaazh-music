import React from 'react';
import { Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import ScalePress from './ScalePress';
import { colors, typography, radius, spacing } from '../theme';

const PrimaryButton = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  compact = false,
  icon,
  accessibilityLabel,
  style,
}) => {
  const isDisabled = disabled || loading;

  return (
    <ScalePress onPress={onPress} disabled={isDisabled} style={[fullWidth && styles.fullWidth, style]} accessibilityLabel={accessibilityLabel || label}>
      <View
        style={[
          styles.base,
          compact && styles.compact,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.textOnAccent : colors.textPrimary} />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.label,
                compact && styles.compactLabel,
                variant === 'primary' && styles.primaryLabel,
                variant === 'secondary' && styles.secondaryLabel,
                variant === 'ghost' && styles.ghostLabel,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </ScalePress>
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  base: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
  },
  compact: {
    height: 40,
    paddingHorizontal: spacing.xl,
  },
  compactLabel: {
    fontSize: typography.sizes.bodySmall,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  primaryLabel: {
    color: colors.textOnAccent,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
  },
  secondaryLabel: {
    color: colors.textPrimary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostLabel: {
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.normal,
  },
});

export default React.memo(PrimaryButton);
