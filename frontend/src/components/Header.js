import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { colors, typography, spacing, radius, shadows } from '../theme';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

/**
 * Neutral warm header with greeting, optional title, avatar and trailing icons.
 */
const Header = ({
  title,
  greeting,
  subtitle,
  onProfilePress,
  onBellPress,
  showBell = false,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const initial = user?.name ? user.name[0].toUpperCase() : 'Y';

  const greetingKey = getGreeting();
  const greetingLabel = greetingKey === 'morning' ? 'Good Morning' : greetingKey === 'afternoon' ? 'Good Afternoon' : 'Good Evening';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onProfilePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Account"
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
            <View style={styles.avatarRing} pointerEvents="none" />
          </View>
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow} numberOfLines={1}>
            {greeting ? greetingLabel : title ? title.toUpperCase() : 'YAழH MUSIC'}
          </Text>
        </View>

        {showBell && (
          <TouchableOpacity
            onPress={onBellPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            activeOpacity={0.8}
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {greeting && <Text style={styles.greeting}>{greetingLabel}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {children && <View style={styles.children}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  avatarRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.warmGlowStrong,
  },
  avatarText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.caps,
    textTransform: 'uppercase',
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: typography.sizes.large,
    fontFamily: typography.fontFamily.display,
    letterSpacing: typography.letterSpacing.tight,
    marginTop: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    marginTop: spacing.xs,
  },
  children: {
    marginTop: spacing.lg,
  },
});

export default Header;