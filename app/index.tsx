import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../constants/theme';

export default function Index() {
  const { user, loading, isEmailVerified, pendingVerificationEmail } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is logged in, check if email is verified
        if (isEmailVerified) {
          router.replace('/(app)/dashboard');
        } else {
          // User logged in but email not verified
          router.replace('/(auth)/verify-email');
        }
      } else if (pendingVerificationEmail) {
        // User signed up but hasn't verified email yet
        router.replace('/(auth)/verify-email');
      } else {
        // No user, go to login
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading, isEmailVerified, pendingVerificationEmail, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
