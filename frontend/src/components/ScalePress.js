import React, { useRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Platform } from 'react-native';

/**
 * Subtle scale-on-press wrapper for premium feedback.
 */
const ScalePress = ({
  onPress,
  children,
  activeScale = 0.97,
  style,
  disabled,
  accessibilityRole = 'button',
  accessibilityLabel,
  hitSlop,
}) => {
  const value = useRef(new Animated.Value(1)).current;

  const onPressIn = useMemo(
    () => () => {
      Animated.spring(value, {
        toValue: activeScale,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }).start();
    },
    [value, activeScale]
  );

  const onPressOut = useMemo(
    () => () => {
      Animated.spring(value, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 0,
      }).start();
    },
    [value]
  );

  return (
    <Animated.View style={[{ transform: [{ scale: value }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        hitSlop={hitSlop}
        style={Platform.select({ android: styles.androidTouch, default: null })}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  androidTouch: {
    opacity: 0.99,
  },
});

export default ScalePress;