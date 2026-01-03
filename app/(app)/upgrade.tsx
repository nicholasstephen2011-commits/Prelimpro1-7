import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Button from '../../components/Button'
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme'
import { pricingTiers, PricingTier } from '../../constants/pricing'
import { createCheckoutSession, openCheckoutUrl } from '../../lib/checkout'
import { useAuth } from '../../contexts/AuthContext'

const plans: PricingTier[] = pricingTiers

const isWeb = Platform.OS === 'web';

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}

export default function UpgradeScreen() {
  const [selectedPlanId, setSelectedPlanId] = useState('basic');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ session_id?: string; status?: string; cancel?: string }>();

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0],
    [selectedPlanId]
  );

  // Handle redirect outcomes when returning from Stripe
  useEffect(() => {
    if (params.session_id) {
      setStatusMessage('Payment success! We will unlock Pro after confirming your session.');
    } else if (params.status === 'cancel' || params.cancel === '1') {
      showToast('Payment cancelled');
    }
  }, [params.cancel, params.session_id, params.status]);

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    // Non-checkout plans
    if (!selectedPlan.priceIdMonthly && !selectedPlan.priceIdAnnual) {
      if (selectedPlan.contactLink) {
        Linking.openURL(selectedPlan.contactLink);
      } else {
        showToast('Select a paid plan to continue.');
      }
      return;
    }

    const priceId =
      billingCycle === 'annual' ? selectedPlan.priceIdAnnual : selectedPlan.priceIdMonthly;

    if (!priceId) {
      showToast('This billing cycle is not available for the selected plan.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const { url } = await createCheckoutSession({
        priceId,
        customerEmail: user?.email || undefined,
        metadata: { plan: selectedPlan.name, billingCycle, platform: Platform.OS },
      });

      await openCheckoutUrl(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not start checkout. Please try again.';
      setError(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Upgrade to PrelimPro</Text>
          <Text style={styles.subtitle}>
            Unlock unlimited notices, exports, and automated reminders to stay lien-protected.
          </Text>
        </View>

        <View style={styles.billingToggleRow}>
          <TouchableOpacity
            style={[styles.billingToggle, billingCycle === 'monthly' && styles.billingToggleActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.billingToggleText, billingCycle === 'monthly' && styles.billingToggleTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingToggle, billingCycle === 'annual' && styles.billingToggleActive]}
            onPress={() => setBillingCycle('annual')}
          >
            <Text style={[styles.billingToggleText, billingCycle === 'annual' && styles.billingToggleTextActive]}>Annual (save ~17%)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.planGrid}>
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlanId(plan.id)}
                activeOpacity={0.9}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
              >
                <View style={styles.planHeader}>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.planPrice}>
                        {billingCycle === 'annual' ? plan.annualPrice || plan.monthlyPrice : plan.monthlyPrice}
                      </Text>
                      <Text style={styles.planInterval}>
                        {billingCycle === 'annual' ? '/yr' : plan.isFree ? '' : '/mo'}
                      </Text>
                    </View>
                    {plan.annualPrice && plan.monthlyPrice && (
                      <Text style={styles.altPriceText}>
                        {billingCycle === 'annual'
                          ? `or ${plan.monthlyPrice} monthly`
                          : `or ${plan.annualPrice} annually`}
                      </Text>
                    )}
                  </View>
                  {plan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.planDescription}>{plan.description}</Text>

                {plan.savings && (
                  <View style={styles.savingsPill}>
                    <Ionicons name="sparkles" size={16} color={colors.success} />
                    <Text style={styles.savingsText}>{plan.savings}</Text>
                  </View>
                )}

                <View style={styles.features}>
                  {plan.features.map((feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {isSelected && (
                  <View style={styles.selectedPill}>
                    <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                    <Text style={styles.selectedText}>Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {statusMessage && (
          <View style={styles.statusCard}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          title={
            selectedPlan?.contactLink
              ? 'Contact Sales'
              : !selectedPlan?.priceIdMonthly && !selectedPlan?.priceIdAnnual
              ? 'Select a paid plan'
              : loading
              ? 'Redirecting to Stripe…'
              : 'Continue to Checkout'
          }
          onPress={handleCheckout}
          loading={loading}
          disabled={loading}
          size="lg"
          fullWidth
          style={styles.ctaButton}
        />

        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryLinkText}>Maybe later, take me back</Text>
        </TouchableOpacity>

        <View style={styles.secureRow}>
          <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
          <Text style={styles.secureText}>
            Secure checkout powered by Stripe. We do not store card details in the app.
          </Text>
        </View>

        {isWeb ? (
          <Text style={styles.platformHint}>On web you will be redirected in this tab.</Text>
        ) : (
          <Text style={styles.platformHint}>
            On mobile we open a secure in-app browser. Close it to return here if you cancel.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  billingToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  billingToggle: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  billingToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '15',
  },
  billingToggleText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  billingToggleTextActive: {
    color: colors.primary,
  },
  planGrid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.sm,
  },
  planCardSelected: {
    borderColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  planName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: spacing.xs,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planInterval: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  altPriceText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
  planDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  savingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.successLight,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  savingsText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
  features: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + '20',
  },
  selectedText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success,
  },
  statusText: {
    ...typography.body,
    color: colors.success,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  ctaButton: {
    marginTop: spacing.sm,
  },
  secondaryLink: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryLinkText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  secureText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  platformHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
