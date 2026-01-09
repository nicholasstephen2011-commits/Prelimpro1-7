import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';

type ScreenState = 'form' | 'success' | 'error';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const router = useRouter();

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setEmailError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail(email)) {
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Database is not configured. Please contact the administrator.');
      setScreenState('error');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${Platform.OS === 'web' ? window.location.origin : 'prelimpro://'}/(auth)/reset-password`,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('rate limit')) {
          setErrorMessage('Too many requests. Please wait a few minutes before trying again.');
        } else if (error.message.includes('not found') || error.message.includes('invalid')) {
          // Don't reveal if email exists for security - still show success
          setScreenState('success');
          return;
        } else {
          setErrorMessage(error.message || 'Failed to send reset email. Please try again.');
        }
        setScreenState('error');
      } else {
        setScreenState('success');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.');
      setScreenState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  const handleTryAgain = () => {
    setScreenState('form');
    setErrorMessage('');
    setEmail('');
    setEmailError('');
  };

  const renderForm = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackToLogin}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.iconContainer}>
          <Ionicons name="lock-open-outline" size={48} color={colors.primary} />
        </View>
        
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          No worries! Enter your email address and we'll send you a link to reset your password.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Email Address"
          placeholder="you@company.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) {
              validateEmail(text);
            }
          }}
          onBlur={() => validateEmail(email)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          leftIcon="mail-outline"
          error={emailError}
          required
        />

        <Button
          title="Send Reset Link"
          onPress={handleResetPassword}
          loading={loading}
          fullWidth
          size="lg"
          disabled={!isSupabaseConfigured}
        />

        {!isSupabaseConfigured && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text style={styles.warningText}>
              Database connection is not configured. Password reset is unavailable.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.backToLoginLink} 
        onPress={handleBackToLogin}
      >
        <Ionicons name="arrow-back" size={16} color={colors.primary} />
        <Text style={styles.backToLoginText}>Back to Sign In</Text>
      </TouchableOpacity>
    </>
  );

  const renderSuccess = () => (
    <View style={styles.stateContainer}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
      </View>
      
      <Text style={styles.stateTitle}>Check Your Email</Text>
      <Text style={styles.stateMessage}>
        We've sent a password reset link to:
      </Text>
      <Text style={styles.emailHighlight}>{email}</Text>
      <Text style={styles.stateSubtext}>
        Click the link in the email to reset your password. If you don't see the email, check your spam folder.
      </Text>

      <View style={styles.stateActions}>
        <Button
          title="Back to Sign In"
          onPress={handleBackToLogin}
          fullWidth
          size="lg"
        />
        
        <TouchableOpacity 
          style={styles.resendLink} 
          onPress={handleTryAgain}
        >
          <Text style={styles.resendText}>Didn't receive the email? </Text>
          <Text style={styles.resendLinkText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderError = () => (
    <View style={styles.stateContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle" size={80} color={colors.error} />
      </View>
      
      <Text style={styles.stateTitle}>Something Went Wrong</Text>
      <Text style={styles.stateMessage}>{errorMessage}</Text>

      <View style={styles.stateActions}>
        <Button
          title="Try Again"
          onPress={handleTryAgain}
          fullWidth
          size="lg"
        />
        
        <Button
          title="Back to Sign In"
          onPress={handleBackToLogin}
          variant="outline"
          fullWidth
          size="lg"
          style={styles.secondaryButton}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {screenState === 'form' && renderForm()}
          {screenState === 'success' && renderSuccess()}
          {screenState === 'error' && renderError()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: spacing.sm,
    zIndex: 1,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  form: {
    marginBottom: spacing.lg,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  backToLoginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  backToLoginText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  // Success & Error States
  stateContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  successIconContainer: {
    marginBottom: spacing.lg,
  },
  errorIconContainer: {
    marginBottom: spacing.lg,
  },
  stateTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  stateMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emailHighlight: {
    ...typography.bodyBold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  stateSubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  stateActions: {
    width: '100%',
  },
  secondaryButton: {
    marginTop: spacing.md,
  },
  resendLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resendText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resendLinkText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
