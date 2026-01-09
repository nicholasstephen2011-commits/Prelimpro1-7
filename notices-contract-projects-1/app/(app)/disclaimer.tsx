import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Button from '../../components/Button';

export default function DisclaimerScreen() {
  const [agreed, setAgreed] = useState(false);
  
  const router = useRouter();
  const { projectId, action } = useLocalSearchParams<{ projectId: string; action: string }>();

  const handleContinue = () => {
    if (action === 'preview') {
      router.push({
        pathname: '/(app)/preview',
        params: { projectId }
      });
    } else if (action === 'send') {
      router.push({
        pathname: '/(app)/delivery',
        params: { projectId }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Warning Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={64} color={colors.warning} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Important Legal Disclaimer</Text>
        <Text style={styles.subtitle}>Please read carefully before proceeding</Text>

        {/* Disclaimer Content */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            I understand and acknowledge that:
          </Text>

          <View style={styles.disclaimerItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.disclaimerItemText}>
              <Text style={styles.bold}>Prelimpro is a tool only</Text> and does NOT provide legal advice, legal representation, or attorney services.
            </Text>
          </View>

          <View style={styles.disclaimerItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.disclaimerItemText}>
              I am <Text style={styles.bold}>solely responsible</Text> for the accuracy of all information entered and for ensuring compliance with applicable state laws.
            </Text>
          </View>

          <View style={styles.disclaimerItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.disclaimerItemText}>
              Prelimpro <Text style={styles.bold}>does not guarantee</Text> the validity of any notice or the preservation of any lien rights.
            </Text>
          </View>

          <View style={styles.disclaimerItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.disclaimerItemText}>
              State laws regarding preliminary notices and mechanic's liens vary and <Text style={styles.bold}>change frequently</Text>. I should verify current requirements.
            </Text>
          </View>

          <View style={styles.disclaimerItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.disclaimerItemText}>
              I should <Text style={styles.bold}>consult a licensed attorney</Text> in my state for legal advice regarding my specific situation.
            </Text>
          </View>
        </View>

        {/* Checkbox Agreement */}
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={18} color={colors.textInverse} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read, understand, and agree to the above disclaimer. I accept full responsibility for my use of this tool.
          </Text>
        </TouchableOpacity>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title="I Agree – Continue"
            onPress={handleContinue}
            disabled={!agreed}
            style={styles.continueButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  disclaimerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    ...shadows.md,
  },
  disclaimerText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  disclaimerItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
    marginTop: 8,
    marginRight: spacing.sm,
  },
  disclaimerItemText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.gray300,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  continueButton: {
    flex: 2,
  },
});
