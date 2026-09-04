import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { colors, typography, spacing } from '../theme';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

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
          </View>
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow} numberOfLines={1}>
            {greeting ? getGreeting() : title ? title.toUpperCase() : 'YAAZH MUSIC'}
          </Text>
        </View>

        {showBell ? (
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
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {greeting ? <Text style={styles.greeting}>{getGreeting()}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.children}>{children}</View> : null}
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
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
  spacer: {
    width: 38,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: typography.sizes.titleLarge,
    fontFamily: typography.fontFamily.display,
    letterSpacing: typography.letterSpacing.tight,
    marginTop: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
    marginTop: spacing.xs,
  },
  children: {
    marginTop: spacing.lg,
  },
});

export default React.memo(Header);
