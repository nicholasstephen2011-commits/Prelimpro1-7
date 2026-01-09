import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import DisclaimerFooter from '../../components/DisclaimerFooter';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    confirmPassword?: string;
    companyName?: string;
  }>({});
  
  const { signUp, isConfigured } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!companyName) {
      newErrors.companyName = 'Company name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const { error, needsVerification } = await signUp(email, password);
    setLoading(false);
    
    if (error) {
      if (error.message.includes('not configured')) {
        Alert.alert(
          'Setup Required',
          'The database is not configured yet. Please contact the administrator to set up Supabase.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Signup Failed', error.message || 'Could not create account');
      }
    } else if (needsVerification) {
      // Navigate to email verification screen
      router.replace('/(auth)/verify-email');
    } else {
      // Email already verified (shouldn't happen normally, but handle it)
      router.replace('/(app)/dashboard');
    }
  };

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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image
              source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/694c0f1ba40221f0cf4c61ac_1766599383355_ba484813.jpg' }}
              style={styles.logo}
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Start protecting your lien rights today
            </Text>
          </View>

          {!isConfigured && (
            <View style={styles.configWarning}>
              <Ionicons name="warning" size={24} color={colors.warning} />
              <View style={styles.configWarningContent}>
                <Text style={styles.configWarningTitle}>Setup Required</Text>
                <Text style={styles.configWarningText}>
                  Database connection is not configured. Please set the following environment variables:
                </Text>
                <Text style={styles.configCode}>EXPO_PUBLIC_SUPABASE_URL</Text>
                <Text style={styles.configCode}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
              </View>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label="Company Name"
              placeholder="Your Company LLC"
              value={companyName}
              onChangeText={setCompanyName}
              autoCapitalize="words"
              leftIcon="business-outline"
              error={errors.companyName}
              required
            />

            <Input
              label="Email"
              placeholder="you@company.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              error={errors.email}
              required
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              error={errors.password}
              helperText="At least 6 characters"
              required
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon="lock-closed-outline"
              error={errors.confirmPassword}
              required
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              fullWidth
              size="lg"
              disabled={!isConfigured}
            />
          </View>

          <View style={styles.verificationNote}>
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={styles.verificationNoteText}>
              You'll need to verify your email address before accessing the app.
            </Text>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <DisclaimerFooter />
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
  },
  backButton: {
    marginBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  configWarning: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  configWarningContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  configWarningTitle: {
    ...typography.bodyBold,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  configWarningText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  configCode: {
    ...typography.caption,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: colors.gray100,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  form: {
    marginBottom: spacing.md,
  },
  verificationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  verificationNoteText: {
    ...typography.bodySmall,
    color: colors.info,
    marginLeft: spacing.xs,
    flex: 1,
  },
  termsContainer: {
    marginBottom: spacing.lg,
  },
  termsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
