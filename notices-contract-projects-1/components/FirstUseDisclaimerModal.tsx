import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import Button from './Button';

interface FirstUseDisclaimerModalProps {
  visible: boolean;
  onAccept: () => void;
}

export default function FirstUseDisclaimerModal({ 
  visible, 
  onAccept 
}: FirstUseDisclaimerModalProps) {
  const [agreed, setAgreed] = useState(false);

  const handleContinue = () => {
    if (agreed) {
      onAccept();
    }
  };

  const handleTermsPress = () => {
    Linking.openURL('https://prelimpro.com/terms');
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://prelimpro.com/privacy');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Important Legal Disclaimer</Text>
          <Text style={styles.subtitle}>Please read and acknowledge before continuing</Text>

          {/* Main Disclaimer Card */}
          <View style={styles.disclaimerCard}>
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Text style={styles.warningBannerText}>PLEASE READ CAREFULLY</Text>
            </View>

            <Text style={styles.disclaimerText}>
              PrelimPro is a self-service tool providing general templates only. It does not 
              constitute legal advice. We are not a law firm or attorneys. No attorney-client 
              relationship is formed.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.disclaimerText}>
              Laws change frequently. You are solely responsible for accuracy, timing, delivery, 
              verification, and all outcomes. Use at your own risk.
            </Text>

            <View style={styles.divider} />

            <Text style={[styles.disclaimerText, styles.highlightText]}>
              Consult a licensed attorney for your specific situation.
            </Text>
          </View>

          {/* Key Points */}
          <View style={styles.keyPointsContainer}>
            <Text style={styles.keyPointsTitle}>By using PrelimPro, you acknowledge:</Text>
            
            <View style={styles.keyPoint}>
              <View style={styles.bulletPoint} />
              <Text style={styles.keyPointText}>
                This is a <Text style={styles.bold}>template generation tool only</Text>
              </Text>
            </View>

            <View style={styles.keyPoint}>
              <View style={styles.bulletPoint} />
              <Text style={styles.keyPointText}>
                <Text style={styles.bold}>No legal advice</Text> is being provided
              </Text>
            </View>

            <View style={styles.keyPoint}>
              <View style={styles.bulletPoint} />
              <Text style={styles.keyPointText}>
                <Text style={styles.bold}>No attorney-client relationship</Text> is formed
              </Text>
            </View>

            <View style={styles.keyPoint}>
              <View style={styles.bulletPoint} />
              <Text style={styles.keyPointText}>
                You are <Text style={styles.bold}>solely responsible</Text> for all outcomes
              </Text>
            </View>

            <View style={styles.keyPoint}>
              <View style={styles.bulletPoint} />
              <Text style={styles.keyPointText}>
                Laws vary by state and <Text style={styles.bold}>change frequently</Text>
              </Text>
            </View>

            <View style={styles.keyPoint}>
              <View style={styles.bulletPoint} />
              <Text style={styles.keyPointText}>
                You should <Text style={styles.bold}>consult a licensed attorney</Text>
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
              I understand and agree to these terms
            </Text>
          </TouchableOpacity>

          {/* Continue Button */}
          <Button
            title="Continue"
            onPress={handleContinue}
            disabled={!agreed}
            size="lg"
            style={styles.continueButton}
          />

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={handleTermsPress}>
              <Text style={styles.link}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.linkSeparator}>•</Text>
            <TouchableOpacity onPress={handlePrivacyPress}>
              <Text style={styles.link}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.warning,
    ...shadows.md,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warningLight,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopLeftRadius: borderRadius.lg - 2,
    borderTopRightRadius: borderRadius.lg - 2,
  },
  warningBannerText: {
    ...typography.bodyBold,
    color: colors.warning,
    marginLeft: spacing.sm,
    letterSpacing: 1,
  },
  disclaimerText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
    textAlign: 'center',
  },
  highlightText: {
    fontWeight: '700',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.md,
  },
  keyPointsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  keyPointsTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 7,
    marginRight: spacing.sm,
  },
  keyPointText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gray200,
    ...shadows.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
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
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  continueButton: {
    marginBottom: spacing.lg,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: {
    ...typography.bodySmall,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  linkSeparator: {
    ...typography.bodySmall,
    color: colors.gray400,
    marginHorizontal: spacing.sm,
  },
});
