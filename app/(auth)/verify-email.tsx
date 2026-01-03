import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  AppState,
  AppStateStatus
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Button from '../../components/Button';

export default function VerifyEmailScreen() {
  const { 
    pendingVerificationEmail, 
    resendCooldown, 
    resendVerificationEmail,
    clearPendingVerification,
    refreshSession,
    user,
    isEmailVerified
  } = useAuth();
  const router = useRouter();
  const [resending, setResending] = useState(false);

  // Check verification status when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        await refreshSession();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refreshSession]);

  // Redirect when email is verified
  useEffect(() => {
    if (user && isEmailVerified) {
      router.replace('/(app)/dashboard');
    }
  }, [user, isEmailVerified, router]);

  const handleResend = async () => {
    if (resendCooldown > 0) {
      Alert.alert(
        'Please Wait',
        `You can resend the verification email in ${resendCooldown} seconds.`
      );
      return;
    }

    setResending(true);
    const { error } = await resendVerificationEmail();
    setResending(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to resend verification email');
    } else {
      Alert.alert(
        'Email Sent',
        'A new verification email has been sent. Please check your inbox and spam folder.'
      );
    }
  };

  const handleChangeEmail = async () => {
    await clearPendingVerification();
    router.replace('/(auth)/signup');
  };

  const handleBackToLogin = async () => {
    await clearPendingVerification();
    router.replace('/(auth)/login');
  };

  const handleCheckVerification = async () => {
    await refreshSession();
    
    if (isEmailVerified) {
      router.replace('/(app)/dashboard');
    } else {
      Alert.alert(
        'Not Verified Yet',
        'Your email has not been verified yet. Please click the link in the verification email we sent you.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={48} color={colors.primary} />
          </View>
          <View style={styles.checkBadge}>
            <Ionicons name="time-outline" size={20} color={colors.warning} />
          </View>
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        
        <Text style={styles.description}>
          We&apos;ve sent a verification link to:
        </Text>
        
        <View style={styles.emailContainer}>
          <Text style={styles.email}>{pendingVerificationEmail || 'your email'}</Text>
        </View>

        <Text style={styles.instructions}>
          Please click the link in the email to verify your account. 
          Check your spam folder if you don&apos;t see it in your inbox.
        </Text>

        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Open your email app</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Find the email from Prelimpro</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Click the verification link</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>Return here and tap &quot;I&apos;ve Verified&quot;</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="I&apos;ve Verified My Email"
            onPress={handleCheckVerification}
            fullWidth
            size="lg"
          />

          <TouchableOpacity 
            style={[
              styles.resendButton,
              resendCooldown > 0 && styles.resendButtonDisabled
            ]}
            onPress={handleResend}
            disabled={resending || resendCooldown > 0}
          >
            {resending ? (
              <Text style={styles.resendButtonText}>Sending...</Text>
            ) : resendCooldown > 0 ? (
              <Text style={styles.resendButtonTextDisabled}>
                Resend email in {resendCooldown}s
              </Text>
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                <Text style={styles.resendButtonText}>Resend Verification Email</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleChangeEmail}>
            <Text style={styles.footerLink}>Use a different email</Text>
          </TouchableOpacity>
          
          <View style={styles.footerDivider} />
          
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={styles.footerLink}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emailContainer: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  email: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  instructions: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepNumberText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  stepText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  resendButtonTextDisabled: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.gray300,
    marginHorizontal: spacing.md,
  },
});
