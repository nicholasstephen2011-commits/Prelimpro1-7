import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  AppState,
  AppStateStatus,
  TextInput,
  Keyboard
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
    verifyEmailCode,
    clearPendingVerification,
    refreshSession,
    user,
    isEmailVerified
  } = useAuth();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);

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

  const handleCodeChange = (value: string, index: number) => {
    // Only allow alphanumeric characters
    const cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (cleanValue.length <= 1) {
      const newCode = [...code];
      newCode[index] = cleanValue;
      setCode(newCode);

      // Auto-focus next input
      if (cleanValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 characters entered
      if (cleanValue && index === 5) {
        const fullCode = [...newCode.slice(0, 5), cleanValue].join('');
        if (fullCode.length === 6) {
          Keyboard.dismiss();
          handleVerifyCode(fullCode);
        }
      }
    } else if (cleanValue.length === 6) {
      // Handle paste of full code
      const newCode = cleanValue.split('');
      setCode(newCode);
      Keyboard.dismiss();
      handleVerifyCode(cleanValue);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || code.join('');
    
    if (fullCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-character verification code.');
      return;
    }

    setVerifying(true);
    const { error, success } = await verifyEmailCode(fullCode);
    setVerifying(false);

    if (error) {
      Alert.alert('Verification Failed', error.message || 'Invalid verification code. Please try again.');
      // Clear the code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else if (success) {
      Alert.alert(
        'Email Verified!',
        'Your email has been verified successfully. Welcome to LienClear Pro!',
        [{ text: 'Continue', onPress: () => router.replace('/(app)/dashboard') }]
      );
    }
  };

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
        'A new verification code has been sent to your email. Please check your inbox and spam folder.'
      );
      // Clear the code
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={48} color={colors.primary} />
          </View>
          <View style={styles.checkBadge}>
            <Ionicons name="key-outline" size={16} color={colors.warning} />
          </View>
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        
        <Text style={styles.description}>
          We've sent a 6-character verification code to:
        </Text>
        
        <View style={styles.emailContainer}>
          <Text style={styles.email}>{pendingVerificationEmail || 'your email'}</Text>
        </View>

        <Text style={styles.instructions}>
          Enter the code from your email to verify your account.
          Check your spam folder if you don't see it.
        </Text>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              maxLength={index === 0 ? 6 : 1} // Allow paste on first input
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType="default"
              selectTextOnFocus
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={verifying ? "Verifying..." : "Verify Email"}
            onPress={() => handleVerifyCode()}
            fullWidth
            size="lg"
            loading={verifying}
            disabled={code.join('').length !== 6 || verifying}
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
                Resend code in {resendCooldown}s
              </Text>
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                <Text style={styles.resendButtonText}>Resend Verification Code</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} />
          <Text style={styles.helpText}>
            The code is 6 characters and expires in 24 hours.
          </Text>
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
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderRadius: borderRadius.md,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
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
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  helpText: {
    ...typography.bodySmall,
    color: colors.info,
    marginLeft: spacing.xs,
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
