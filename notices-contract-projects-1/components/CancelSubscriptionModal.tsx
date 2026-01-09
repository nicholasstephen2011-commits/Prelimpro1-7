import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { supabase } from '../lib/supabase';
import Button from './Button';

interface CancelSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onCanceled: () => void;
  subscriptionId: string;
  proUntil: string | null;
}

export default function CancelSubscriptionModal({
  visible,
  onClose,
  onCanceled,
  subscriptionId,
  proUntil,
}: CancelSubscriptionModalProps) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!subscriptionId) {
      Alert.alert('Error', 'No active subscription found');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          action: 'cancel-subscription',
          subscriptionId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      Alert.alert(
        'Subscription Canceled',
        'Your subscription has been canceled. You will continue to have Pro access until the end of your current billing period.',
        [
          {
            text: 'OK',
            onPress: () => {
              onCanceled();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      Alert.alert('Error', error.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'your billing period ends';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={32} color={colors.warning} />
            </View>
            <Text style={styles.title}>Cancel Subscription?</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.gray400} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Are you sure you want to cancel your Pro subscription?
            </Text>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>You'll keep Pro access</Text>
                <Text style={styles.infoText}>
                  Your subscription will remain active until{' '}
                  <Text style={styles.bold}>{formatDate(proUntil)}</Text>. After that, your account
                  will revert to the free plan.
                </Text>
              </View>
            </View>

            <View style={styles.loseAccessSection}>
              <Text style={styles.loseAccessTitle}>After cancellation, you'll lose:</Text>
              <View style={styles.loseAccessItem}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
                <Text style={styles.loseAccessText}>Unlimited notice creation</Text>
              </View>
              <View style={styles.loseAccessItem}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
                <Text style={styles.loseAccessText}>Watermark-free documents</Text>
              </View>
              <View style={styles.loseAccessItem}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
                <Text style={styles.loseAccessText}>Priority support</Text>
              </View>
            </View>

            <View style={styles.keepAccessSection}>
              <Text style={styles.keepAccessTitle}>You'll keep:</Text>
              <View style={styles.keepAccessItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.keepAccessText}>All existing notices and projects</Text>
              </View>
              <View style={styles.keepAccessItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.keepAccessText}>Any purchased notice credits</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Keep My Subscription"
              onPress={onClose}
              variant="primary"
              style={styles.keepButton}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
              )}
            </TouchableOpacity>
          </View>
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
  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  infoTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loseAccessSection: {
    marginBottom: spacing.md,
  },
  loseAccessTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  loseAccessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  loseAccessText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  keepAccessSection: {
    backgroundColor: colors.successLight + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  keepAccessTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.sm,
  },
  keepAccessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  keepAccessText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  actions: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  keepButton: {
    marginBottom: spacing.sm,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
});
