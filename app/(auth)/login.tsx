import React, { useState, useEffect, useCallback } from 'react';
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
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import DisclaimerFooter from '../../components/DisclaimerFooter';

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  
  const { signIn, isConfigured } = useAuth();

  const router = useRouter();

  const checkBiometricAvailability = useCallback(async (isActive: boolean) => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (compatible && enrolled) {
        if (!isActive) return;
        setBiometricAvailable(true);
        
        // Get supported authentication types
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          if (isActive) setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          if (isActive) setBiometricType('Fingerprint');
        } else {
          if (isActive) setBiometricType('Biometric');
        }
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  }, []);

  const checkSavedCredentials = useCallback(async (isActive: boolean) => {
    try {
      const saved = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      if (isActive) setHasSavedCredentials(!!saved);
    } catch (error) {
      console.error('Error checking saved credentials:', error);
    }
  }, []);

  // FEATURE 4: Check biometric availability on mount
  useEffect(() => {
    let active = true;
     const run = async () => {
       await checkBiometricAvailability(active);
       await checkSavedCredentials(active);
     };
     void run();
    return () => {
      active = false;
    };
  }, [checkBiometricAvailability, checkSavedCredentials]);

  const handleBiometricLogin = async () => {
    try {
      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Sign in with ${biometricType}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        // Get saved credentials
        const savedCredentials = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
        if (savedCredentials) {
          const { email: savedEmail, password: savedPassword } = JSON.parse(savedCredentials);
          
          setLoading(true);
          const { error } = await signIn(savedEmail, savedPassword);
          setLoading(false);
          
          if (error) {
            Alert.alert('Login Failed', 'Saved credentials are invalid. Please login with email and password.');
            // Clear invalid credentials
            await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
            setHasSavedCredentials(false);
          } else {
            // Route through index to check email verification
            router.replace('/');
          }

        } else {
          Alert.alert('No Saved Credentials', 'Please login with email and password first, then enable biometric login.');
        }
      } else if (result.error === 'user_cancel') {
        // User cancelled, do nothing
      } else {
        Alert.alert('Authentication Failed', 'Biometric authentication failed. Please try again or use your password.');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'An error occurred during biometric authentication.');
    }
  };

  const saveCredentialsForBiometric = async (userEmail: string, userPassword: string) => {
    if (!biometricAvailable) return;
    
    try {
      // Check if we already have saved credentials
      const existingCredentials = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      
      if (!existingCredentials) {
        // Ask user if they want to enable biometric login
        Alert.alert(
          `Enable ${biometricType} Login?`,
          `Would you like to use ${biometricType} for faster login next time?`,
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Enable',
              onPress: async () => {
                await AsyncStorage.setItem(
                  BIOMETRIC_CREDENTIALS_KEY,
                  JSON.stringify({ email: userEmail, password: userPassword })
                );
                setHasSavedCredentials(true);
                Alert.alert('Success', `${biometricType} login enabled!`);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      if (error.message.includes('not configured')) {
        Alert.alert(
          'Setup Required',
          'The database is not configured yet. Please contact the administrator to set up Supabase.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Login Failed', error.message || 'Invalid email or password');
      }
    } else {
      // Offer to save credentials for biometric login
      await saveCredentialsForBiometric(email, password);
      
      // Check if email is verified - the index.tsx will handle routing
      // based on isEmailVerified status
      router.replace('/');
    }
  };


  const handleRemoveBiometric = async () => {
    Alert.alert(
      'Remove Biometric Login',
      `Are you sure you want to disable ${biometricType} login?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
            setHasSavedCredentials(false);
            Alert.alert('Success', `${biometricType} login has been disabled.`);
          },
        },
      ]
    );
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
          <View style={styles.header}>
            <Image
              source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/694c0f1ba40221f0cf4c61ac_1766599383355_ba484813.jpg' }}
              style={styles.logo}
              alt="Prelimpro logo"
              accessibilityLabel="Prelimpro logo"
            />
            <Text style={styles.title}>Prelimpro</Text>
            <Text style={styles.subtitle}>
              Protect your lien rights in under 5 minutes
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

          {/* Biometric Login Button */}
          {biometricAvailable && hasSavedCredentials && isConfigured && (
            <View style={styles.biometricSection}>
              <TouchableOpacity 
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <View style={styles.biometricIconContainer}>
                  <Ionicons 
                    name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'} 
                    size={32} 
                    color={colors.primary} 
                  />
                </View>
                <Text style={styles.biometricButtonText}>Sign in with {biometricType}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.removeBiometricButton}
                onPress={handleRemoveBiometric}
              >
                <Text style={styles.removeBiometricText}>Remove {biometricType} login</Text>
              </TouchableOpacity>
              
              <View style={styles.orDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or use email</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          )}

          <View style={styles.form}>
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon="lock-closed-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              error={errors.password}
              required
            />

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>


            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              disabled={!isConfigured}
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.signupPrompt}>
            <Text style={styles.signupText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={24} color={colors.success} />
              <Text style={styles.featureText}>State-specific forms</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="time" size={24} color={colors.primary} />
              <Text style={styles.featureText}>Auto deadline tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="document-text" size={24} color={colors.warning} />
              <Text style={styles.featureText}>Proof of service</Text>
            </View>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
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
  
  // Biometric styles
  biometricSection: {
    marginBottom: spacing.lg,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  biometricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  biometricButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  removeBiometricButton: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  removeBiometricText: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  
  form: {
    marginBottom: spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  signupText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  signupLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
