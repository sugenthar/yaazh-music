import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { useMusic } from '../store/MusicContext';
import { errorMessage } from '../services/api';
import TextField from '../components/TextField';
import PrimaryButton from '../components/PrimaryButton';
import ArtworkHero from '../components/ArtworkHero';
import { colors, typography, radius, spacing } from '../theme';
import { STRINGS } from '../constants/strings';

const fallbackArtwork = 'https://upload.wikimedia.org/wikipedia/en/7/77/Leo_film_poster.jpg';

const validate = (emailOrUsername, password) => {
  const errors = {};
  if (!emailOrUsername.trim()) errors.identifier = STRINGS.errors.required;
  if (!password) errors.password = STRINGS.errors.required;
  return errors;
};

const LoginScreen = ({ visible = false, onClose, onSuccess, onGoSignUp }) => {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { songs } = useMusic();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [socialNotice, setSocialNotice] = useState(null);

  const artwork = songs?.[0]?.artwork || fallbackArtwork;

  const reset = () => {
    setIdentifier('');
    setPassword('');
    setErrors({});
    setServerError(null);
    setSocialNotice(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const validation = validate(identifier, password);
    setErrors(validation);
    setServerError(null);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      reset();
      onSuccess();
    } catch (e) {
      setServerError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocial = () => {
    setSocialNotice(STRINGS.auth.socialUnavailable);
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.artSection}>
              <ArtworkHero uri={artwork} size={180} shape="rounded" />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.heading}>Welcome Back</Text>
              <Text style={styles.subheading}>Log in to continue</Text>

              <View style={styles.fields}>
                <TextField
                  label={STRINGS.auth.emailOrUsername}
                  placeholder="you@example.com"
                  value={identifier}
                  onChangeText={setIdentifier}
                  error={errors.identifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  keyboardType="email-address"
                  icon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />}
                />
                <TextField
                  label={STRINGS.auth.password}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                  secureTextEntry
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  icon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
                />
              </View>

              <TouchableOpacity
                style={styles.forgotRow}
                onPress={() => setServerError(STRINGS.auth.resetHint)}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgotText}>{STRINGS.auth.forgotPassword}</Text>
              </TouchableOpacity>

              {serverError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{serverError}</Text>
                </View>
              ) : null}

              <PrimaryButton
                label={STRINGS.auth.logIn}
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                style={styles.cta}
              />

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{STRINGS.auth.orContinueWith}</Text>
                <View style={styles.dividerLine} />
              </View>

              {socialNotice ? <Text style={styles.socialNotice}>{socialNotice}</Text> : null}

              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} onPress={handleSocial} accessibilityRole="button" accessibilityLabel="Continue with Google">
                  <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} onPress={handleSocial} accessibilityRole="button" accessibilityLabel="Continue with Apple">
                  <Ionicons name="logo-apple" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} onPress={handleSocial} accessibilityRole="button" accessibilityLabel="Continue with Facebook">
                  <Ionicons name="logo-facebook" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.switchRow}
                onPress={onGoSignUp}
                accessibilityRole="button"
                accessibilityLabel="Sign up"
              >
                <Text style={styles.switchText}>
                  Don't have an account?{' '}
                  <Text style={styles.switchLink}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  closeBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  artSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  formSection: {
    marginTop: spacing.sm,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.sizes.titleLarge,
    fontFamily: typography.fontFamily.semibold,
    letterSpacing: typography.letterSpacing.tight,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  fields: {
    marginBottom: spacing.sm,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    minHeight: 32,
    justifyContent: 'center',
  },
  forgotText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.medium,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.25)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.medium,
    marginLeft: spacing.sm,
    flex: 1,
  },
  cta: {
    marginBottom: spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.caps,
    marginHorizontal: spacing.md,
  },
  socialNotice: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  switchRow: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  switchText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.bodySmall,
    fontFamily: typography.fontFamily.body,
  },
  switchLink: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.semibold,
  },
});

export default LoginScreen;
