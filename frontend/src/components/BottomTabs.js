import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, radius, spacing } from '../theme';

const TABS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'Search', label: 'Search', icon: 'search-outline', activeIcon: 'search' },
  { key: 'Library', label: 'Library', icon: 'albums-outline', activeIcon: 'albums' },
  { key: 'Mood', label: 'Mood', icon: 'sparkles-outline', activeIcon: 'sparkles' },
];

const BottomTabs = ({ activeTab, onTabChange }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safeWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={styles.tab}
              activeOpacity={0.6}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={22}
                color={isActive ? colors.accent : colors.textMuted}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,5,0.94)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamily.medium,
    marginTop: 4,
    letterSpacing: typography.letterSpacing.wide,
  },
  labelActive: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.semibold,
  },
});

export default React.memo(BottomTabs);
