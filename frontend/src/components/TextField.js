import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../theme';

const AUTOCOMPLETE_MAP = {
  username: 'username',
  email: 'email',
  password: 'password',
  newPassword: 'new-password',
  name: 'name',
  fullName: 'name',
  oneTimeCode: 'one-time-code',
};

const mapAutoComplete = (type) => (type ? AUTOCOMPLETE_MAP[type] || 'off' : undefined);

/**
 * Beautiful input field with label, optional icon, password visibility toggle,
 * error state and keyboard-safe behavior.
 */
const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  icon,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  returnKeyType,
  onSubmitEditing,
  multiline = false,
  textContentType,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;
  const isError = !!error;

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, isError && styles.inputWrapError]}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon, multiline && styles.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize === undefined ? 'sentences' : autoCapitalize}
          autoCorrect={autoCorrect === undefined ? true : autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          multiline={multiline}
          textContentType={textContentType}
          accessibilityLabel={label || placeholder}
          autoComplete={mapAutoComplete(textContentType)}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {isError ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.sm,
    letterSpacing: typography.letterSpacing.wide,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  inputWrapError: {
    borderColor: colors.error,
  },
  iconWrap: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.body,
  },
  inputWithIcon: {
    marginLeft: 2,
  },
  multiline: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    marginTop: spacing.xs,
  },
});

export default TextField;