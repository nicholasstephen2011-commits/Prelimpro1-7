import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

function Step({ number, title, children, isExpanded, onToggle }: StepProps) {
  return (
    <View style={styles.step}>
      <TouchableOpacity style={styles.stepHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{number}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={colors.gray400} 
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.stepContent}>
          {children}
        </View>
      )}
    </View>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <View style={styles.codeBlock}>
      <Text style={styles.codeText}>{children}</Text>
    </View>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.configRow}>
      <Text style={styles.configLabel}>{label}</Text>
      <Text style={styles.configValue}>{value}</Text>
    </View>
  );
}

export default function EmailSetupScreen() {
  const router = useRouter();
  const [expandedStep, setExpandedStep] = useState<number>(1);

  const toggleStep = (step: number) => {
    setExpandedStep(expandedStep === step ? 0 : step);
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Email Setup Guide',
          headerBackTitle: 'Settings',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="mail" size={32} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Configure Email Delivery</Text>
            <Text style={styles.headerDescription}>
              Set up Resend as your SMTP provider to ensure reliable delivery of verification emails, password resets, and notifications.
            </Text>
          </View>

          {/* Why Resend */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="information-circle" size={24} color={colors.info} />
              <Text style={styles.infoCardTitle}>Why Use Resend?</Text>
            </View>
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.benefitText}>3,000 free emails/month (vs 4/hour with Supabase)</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.benefitText}>Better deliverability with proper SPF/DKIM</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.benefitText}>Custom domain support for professional emails</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.benefitText}>Email analytics and tracking</Text>
              </View>
            </View>
          </View>

          {/* Steps */}
          <Text style={styles.sectionTitle}>Setup Instructions</Text>

          <Step 
            number={1} 
            title="Create Resend Account"
            isExpanded={expandedStep === 1}
            onToggle={() => toggleStep(1)}
          >
            <Text style={styles.stepText}>
              Sign up for a free Resend account to get started.
            </Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => openLink('https://resend.com')}
            >
              <Ionicons name="open-outline" size={18} color={colors.primary} />
              <Text style={styles.linkButtonText}>Open resend.com</Text>
            </TouchableOpacity>
            <Text style={styles.stepText}>
              After signing up, verify your email address to activate your account.
            </Text>
          </Step>

          <Step 
            number={2} 
            title="Get Your API Key"
            isExpanded={expandedStep === 2}
            onToggle={() => toggleStep(2)}
          >
            <Text style={styles.stepText}>
              In the Resend dashboard:
            </Text>
            <View style={styles.instructionList}>
              <Text style={styles.instructionItem}>1. Go to <Text style={styles.bold}>API Keys</Text></Text>
              <Text style={styles.instructionItem}>2. Click <Text style={styles.bold}>Create API Key</Text></Text>
              <Text style={styles.instructionItem}>3. Name it "Supabase Auth"</Text>
              <Text style={styles.instructionItem}>4. Select <Text style={styles.bold}>Full access</Text></Text>
              <Text style={styles.instructionItem}>5. Copy the key (starts with <Text style={styles.code}>re_</Text>)</Text>
            </View>
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Text style={styles.warningText}>
                Save this key securely! You won't be able to see it again.
              </Text>
            </View>
          </Step>

          <Step 
            number={3} 
            title="Configure Domain (Optional)"
            isExpanded={expandedStep === 3}
            onToggle={() => toggleStep(3)}
          >
            <Text style={styles.stepText}>
              For production, configure a custom sending domain:
            </Text>
            <View style={styles.instructionList}>
              <Text style={styles.instructionItem}>1. Go to <Text style={styles.bold}>Domains</Text> in Resend</Text>
              <Text style={styles.instructionItem}>2. Click <Text style={styles.bold}>Add Domain</Text></Text>
              <Text style={styles.instructionItem}>3. Enter your domain (e.g., mail.yourcompany.com)</Text>
              <Text style={styles.instructionItem}>4. Add the DNS records Resend provides</Text>
              <Text style={styles.instructionItem}>5. Wait for verification (5-15 minutes)</Text>
            </View>
            <View style={styles.tipBox}>
              <Ionicons name="bulb" size={20} color={colors.primary} />
              <Text style={styles.tipText}>
                For testing, you can use Resend's default sender: onboarding@resend.dev
              </Text>
            </View>
          </Step>

          <Step 
            number={4} 
            title="Configure Supabase SMTP"
            isExpanded={expandedStep === 4}
            onToggle={() => toggleStep(4)}
          >
            <Text style={styles.stepText}>
              In your Supabase Dashboard:
            </Text>
            <View style={styles.instructionList}>
              <Text style={styles.instructionItem}>1. Go to <Text style={styles.bold}>Project Settings</Text> (gear icon)</Text>
              <Text style={styles.instructionItem}>2. Navigate to <Text style={styles.bold}>Authentication</Text></Text>
              <Text style={styles.instructionItem}>3. Scroll to <Text style={styles.bold}>SMTP Settings</Text></Text>
              <Text style={styles.instructionItem}>4. Toggle <Text style={styles.bold}>Enable Custom SMTP</Text> ON</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => openLink('https://supabase.com/dashboard')}
            >
              <Ionicons name="open-outline" size={18} color={colors.primary} />
              <Text style={styles.linkButtonText}>Open Supabase Dashboard</Text>
            </TouchableOpacity>

            <Text style={[styles.stepText, { marginTop: spacing.md }]}>
              Enter these SMTP settings:
            </Text>
            
            <View style={styles.configTable}>
              <ConfigRow label="Sender email" value="noreply@yourdomain.com" />
              <ConfigRow label="Sender name" value="LienClear" />
              <ConfigRow label="Host" value="smtp.resend.com" />
              <ConfigRow label="Port number" value="465" />
              <ConfigRow label="Minimum interval" value="60" />
              <ConfigRow label="Username" value="resend" />
              <ConfigRow label="Password" value="re_your_api_key" />
            </View>

            <Text style={[styles.stepText, { marginTop: spacing.md }]}>
              Click <Text style={styles.bold}>Save</Text> to apply the settings.
            </Text>
          </Step>

          <Step 
            number={5} 
            title="Test the Configuration"
            isExpanded={expandedStep === 5}
            onToggle={() => toggleStep(5)}
          >
            <Text style={styles.stepText}>
              Verify everything works:
            </Text>
            <View style={styles.instructionList}>
              <Text style={styles.instructionItem}>1. Sign up with a new email in your app</Text>
              <Text style={styles.instructionItem}>2. Check your inbox for the verification email</Text>
              <Text style={styles.instructionItem}>3. Verify it comes from your configured sender</Text>
              <Text style={styles.instructionItem}>4. Click the verification link to confirm</Text>
            </View>
            
            <View style={styles.troubleshootBox}>
              <Text style={styles.troubleshootTitle}>Troubleshooting</Text>
              <Text style={styles.troubleshootItem}>
                <Text style={styles.bold}>Email not received?</Text> Check spam folder, verify SMTP settings
              </Text>
              <Text style={styles.troubleshootItem}>
                <Text style={styles.bold}>Invalid credentials?</Text> Ensure username is exactly "resend"
              </Text>
              <Text style={styles.troubleshootItem}>
                <Text style={styles.bold}>Connection refused?</Text> Try port 587 with STARTTLS
              </Text>
            </View>
          </Step>

          {/* Quick Reference */}
          <View style={styles.quickRef}>
            <Text style={styles.quickRefTitle}>Quick Reference</Text>
            <View style={styles.quickRefGrid}>
              <TouchableOpacity 
                style={styles.quickRefItem}
                onPress={() => openLink('https://resend.com/dashboard')}
              >
                <Ionicons name="mail" size={24} color={colors.primary} />
                <Text style={styles.quickRefText}>Resend Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickRefItem}
                onPress={() => openLink('https://supabase.com/dashboard')}
              >
                <Ionicons name="server" size={24} color={colors.success} />
                <Text style={styles.quickRefText}>Supabase Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickRefItem}
                onPress={() => openLink('https://resend.com/docs/send-with-smtp')}
              >
                <Ionicons name="document-text" size={24} color={colors.info} />
                <Text style={styles.quickRefText}>Resend SMTP Docs</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickRefItem}
                onPress={() => openLink('https://supabase.com/docs/guides/auth')}
              >
                <Ionicons name="book" size={24} color={colors.warning} />
                <Text style={styles.quickRefText}>Supabase Auth Docs</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rate Limits Info */}
          <View style={styles.rateLimitsCard}>
            <Text style={styles.rateLimitsTitle}>Resend Rate Limits</Text>
            <View style={styles.rateLimitRow}>
              <View style={styles.rateLimitPlan}>
                <Text style={styles.rateLimitPlanName}>Free Tier</Text>
                <Text style={styles.rateLimitPlanPrice}>$0/month</Text>
              </View>
              <View style={styles.rateLimitDetails}>
                <Text style={styles.rateLimitDetail}>3,000 emails/month</Text>
                <Text style={styles.rateLimitDetail}>100 emails/day</Text>
                <Text style={styles.rateLimitDetail}>1 custom domain</Text>
              </View>
            </View>
            <View style={[styles.rateLimitRow, styles.rateLimitRowPro]}>
              <View style={styles.rateLimitPlan}>
                <Text style={styles.rateLimitPlanName}>Pro</Text>
                <Text style={styles.rateLimitPlanPrice}>$20/month</Text>
              </View>
              <View style={styles.rateLimitDetails}>
                <Text style={styles.rateLimitDetail}>50,000 emails/month</Text>
                <Text style={styles.rateLimitDetail}>Unlimited domains</Text>
                <Text style={styles.rateLimitDetail}>Priority support</Text>
              </View>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  headerDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoCardTitle: {
    ...typography.bodyBold,
    color: colors.info,
  },
  benefitsList: {
    gap: spacing.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  step: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  stepTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  stepContent: {
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  stepText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: colors.gray100,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
    gap: spacing.xs,
  },
  linkButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  instructionList: {
    marginVertical: spacing.sm,
    gap: spacing.xs,
  },
  instructionItem: {
    ...typography.body,
    color: colors.textSecondary,
    paddingLeft: spacing.sm,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.warning,
    flex: 1,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.primary,
    flex: 1,
  },
  configTable: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  configRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  configLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    width: 120,
  },
  configValue: {
    ...typography.bodySmall,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.textPrimary,
    flex: 1,
  },
  troubleshootBox: {
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  troubleshootTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  troubleshootItem: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  quickRef: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickRefTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  quickRefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickRefItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  quickRefText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  rateLimitsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  rateLimitsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  rateLimitRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  rateLimitRowPro: {
    borderBottomWidth: 0,
  },
  rateLimitPlan: {
    width: 100,
  },
  rateLimitPlanName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  rateLimitPlanPrice: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rateLimitDetails: {
    flex: 1,
  },
  rateLimitDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  codeBlock: {
    backgroundColor: colors.gray900,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: colors.gray100,
  },
});
