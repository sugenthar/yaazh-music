import React from 'react';
import { Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import ScalePress from './ScalePress';
import { colors, typography, radius, spacing } from '../theme';

/**
 * Primary CTA buttons: accent-filled, outline, or ghost.
 */
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

  const bg =
    variant === 'ghost' ? 'transparent' : variant === 'secondary' ? 'transparent' : colors.accent;

  return (
    <ScalePress onPress={onPress} disabled={isDisabled} style={[fullWidth && styles.fullWidth, style]} accessibilityLabel={accessibilityLabel || label}>
      <View
        style={[
          styles.base,
          compact && styles.compact,
          bg !== 'transparent' && { backgroundColor: bg },
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.textOnAccent : colors.accent} />
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
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
  },
  compact: {
    height: 42,
    paddingHorizontal: spacing.xl,
  },
  compactLabel: {
    fontSize: typography.sizes.sub,
  },
  primaryLabel: {
    color: colors.textOnAccent,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(43,41,36,0.4)',
  },
  secondaryLabel: {
    color: colors.textPrimary,
  },
  ghost: {},
  ghostLabel: {
    color: colors.accent,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.normal,
  },
});

export default PrimaryButton;