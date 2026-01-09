import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import Button from './Button';
import { usePlan } from '../contexts/PlanContext';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function UpgradeModal({ 
  visible, 
  onClose,
  title = 'Upgrade Required',
  message = "You've used all your free notices. Upgrade to continue creating notices."
}: UpgradeModalProps) {
  const router = useRouter();
  const { plan } = usePlan();

  const handleUpgrade = () => {
    onClose();
    router.push('/(app)/pricing');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.gray500} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={48} color={colors.warning} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {plan && (
            <View style={styles.usageInfo}>
              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>Notices Used</Text>
                <Text style={styles.usageValue}>{plan.notices_used}</Text>
              </View>
              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>Free Limit</Text>
                <Text style={styles.usageValue}>3</Text>
              </View>
              {plan.notices_purchased > 0 && (
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>Purchased</Text>
                  <Text style={styles.usageValue}>{plan.notices_purchased}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.optionsContainer}>
            <View style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Pay Per Notice</Text>
                <Text style={styles.optionPrice}>$19</Text>
              </View>
              <Text style={styles.optionDescription}>
                Buy individual notices as needed
              </Text>
            </View>

            <View style={[styles.optionCard, styles.optionCardHighlighted]}>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Pro Plan</Text>
                <Text style={styles.optionPrice}>$39/mo</Text>
              </View>
              <Text style={styles.optionDescription}>
                Unlimited notices + premium features
              </Text>
            </View>
          </View>

          <Button
            title="View Pricing Options"
            onPress={handleUpgrade}
            style={styles.upgradeButton}
          />

          <TouchableOpacity onPress={onClose} style={styles.laterButton}>
            <Text style={styles.laterText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  usageInfo: {
    width: '100%',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  usageLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  usageValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  optionsContainer: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  optionCardHighlighted: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryLight + '10',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  recommendedText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textInverse,
    fontWeight: '700',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  optionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  optionPrice: {
    ...typography.h3,
    color: colors.primary,
  },
  optionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  upgradeButton: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  laterButton: {
    padding: spacing.sm,
  },
  laterText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
