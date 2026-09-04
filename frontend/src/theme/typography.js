/**
 * Yaazh Music – typography system.
 * Inter for all functional text, DM Serif Display for hero moments.
 */
export const typography = {
  fontFamily: {
    display: 'DMSerifDisplay_400Regular',
    body: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  sizes: {
    hero: 36,
    titleLarge: 28,
    title: 24,
    subtitle: 20,
    body: 16,
    bodySmall: 14,
    caption: 12,
    label: 11,
    micro: 10,
  },

  lineHeights: {
    hero: 42,
    titleLarge: 34,
    title: 30,
    subtitle: 26,
    body: 22,
    bodySmall: 20,
    caption: 16,
    label: 15,
    micro: 14,
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  letterSpacing: {
    tight: -0.4,
    normal: 0,
    wide: 0.5,
    caps: 1.6,
  },
};

export default typography;
