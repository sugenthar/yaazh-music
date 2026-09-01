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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { useMusic } from '../store/MusicContext';
import TextField from '../components/TextField';
import PrimaryButton from '../components/PrimaryButton';
import ArtworkHero from '../components/ArtworkHero';
import { colors, typography, radius, spacing } from '../theme';
import { STRINGS } from '../constants/strings';

const fallbackArtwork = 'https://upload.wikimedia.org/wikipedia/en/7/77/Leo_film_poster.jpg';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (name, email, password, confirmPassword) => {
  const errors = {};
  if (!name.trim()) errors.name = STRINGS.errors.shortName;
  if (!email.trim()) errors.email = STRINGS.errors.required;
  else if (!EMAIL_RE.test(email.trim())) errors.email = STRINGS.errors.invalidEmail;
  if (!password) errors.password = STRINGS.errors.required;
  else if (password.length < 6) errors.password = STRINGS.errors.shortPassword;
  if (!confirmPassword) errors.confirmPassword = STRINGS.errors.required;
  else if (confirmPassword !== password) errors.confirmPassword = STRINGS.errors.passwordMismatch;
  return errors;
};

const SignUpScreen = ({ visible = false, onClose, onSuccess, onGoLogin }) => {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { songs } = useMusic();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [socialNotice, setSocialNotice] = useState(null);

  const artwork = songs?.[0]?.artwork || fallbackArtwork;

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    setServerError(null);
    setSocialNotice(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const validation = validate(name, email, password, confirmPassword);
    setErrors(validation);
    setServerError(null);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      reset();
      onSuccess();
    } catch (e) {
      setServerError(e?.message || STRINGS.errors.serverError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocial = () => {
    setSocialNotice(STRINGS.auth.socialUnavailable);
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={handleClose}>
      <LinearGradient colors={['#191815', '#11110F']} style={styles.container}>
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
              <View style={styles.artGlow} pointerEvents="none" />
              <LinearGradient
                colors={['rgba(217,197,168,0.16)', 'rgba(216,197,168,0.02)']}
                style={styles.artWash}
              />
              <ArtworkHero uri={artwork} size={180} shape="blob" />
              <View style={styles.curveContour} pointerEvents="none" />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.heading}>Create Account</Text>
              <Text style={styles.subheading}>Join Yaazh Music today</Text>

              <View style={styles.fields}>
                <TextField
                  label={STRINGS.auth.fullName}
                  placeholder="Your full name"
                  value={name}
                  onChangeText={setName}
                  error={errors.name}
                  autoCapitalize="words"
                  textContentType="name"
                  icon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />}
                />
                <TextField
                  label={STRINGS.auth.email}
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="email"
                  icon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
                />
                <TextField
                  label={STRINGS.auth.password}
                  placeholder="Create a password"
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                  secureTextEntry
                  textContentType="newPassword"
                  icon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
                />
                <TextField
                  label={STRINGS.auth.confirmPassword}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={errors.confirmPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  icon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />}
                />
              </View>

              {serverError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{serverError}</Text>
                </View>
              ) : null}

              <PrimaryButton
                label={STRINGS.auth.signUp}
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
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={handleSocial}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                >
                  <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={handleSocial}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                >
                  <Ionicons name="logo-apple" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialBtn}
                  onPress={handleSocial}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Facebook"
                >
                  <Ionicons name="logo-facebook" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.switchRow}
                onPress={onGoLogin}
                accessibilityRole="button"
                accessibilityLabel="Log in"
              >
                <Text style={styles.switchText}>
                  Already have an account? <Text style={styles.switchLink}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
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
    backgroundColor: colors.card,
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
  artGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.warmGlow,
  },
  artWash: {
    position: 'absolute',
    top: 0,
    left: spacing.huge,
    right: spacing.huge,
    height: 200,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.xxl,
  },
  curveContour: {
    position: 'absolute',
    bottom: 10,
    width: 120,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
    borderBottomRightRadius: 60,
    borderBottomLeftRadius: 60,
    opacity: 0.6,
  },
  formSection: {
    marginTop: spacing.sm,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: typography.sizes.large,
    fontFamily: typography.fontFamily.display,
    letterSpacing: typography.letterSpacing.tight,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  fields: {
    marginBottom: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201,106,75,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,106,75,0.3)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sub,
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
    backgroundColor: colors.card,
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
    fontSize: typography.sizes.sub,
    fontFamily: typography.fontFamily.body,
  },
  switchLink: {
    color: colors.accent,
    fontFamily: typography.fontFamily.semibold,
  },
});

export default SignUpScreen;