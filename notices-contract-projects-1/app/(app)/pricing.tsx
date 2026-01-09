import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../contexts/PlanContext';
import { supabase } from '../../lib/supabase';
import Button from '../../components/Button';

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51OJhJBHdGQpsHqInIzu7c6PzGPSH0yImD4xfpofvxvFZs0VFhPRXZCyEgYkkhOtBOXFWvssYASs851mflwQvjnrl00T6DbUwWZ';
const STRIPE_ACCOUNT_ID = 'acct_1SiHQMHSeKwwiiH6';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  priceSubtext: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  buttonText: string;
  paymentType: 'free' | 'single_notice' | 'subscription';
}

const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: '$0',
    priceSubtext: '3 notices included',
    description: 'Perfect for trying out Prelimpro',
    features: [
      '3 preliminary notices',
      'All 50 states supported',
      'PDF export',
      'Email delivery',
      'Basic templates',
    ],
    buttonText: 'Current Plan',
    paymentType: 'free',
  },
  {
    id: 'pay_per_notice',
    name: 'Pay Per Notice',
    price: '$19',
    priceSubtext: 'per notice',
    description: 'Buy notices as you need them',
    features: [
      'Purchase individual notices',
      'Never expires',
      'All 50 states supported',
      'PDF export',
      'Email delivery',
      'Basic templates',
    ],
    buttonText: 'Buy Notices',
    paymentType: 'single_notice',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$39',
    priceSubtext: '/month',
    description: 'Unlimited notices for professionals',
    features: [
      'Unlimited notices',
      'Priority support',
      'All 50 states supported',
      'PDF export with no watermarks',
      'All delivery methods',
      'Advanced templates',
      'Bulk export',
      'Audit trail',
    ],
    highlighted: true,
    buttonText: 'Upgrade to Pro',
    paymentType: 'subscription',
  },
];

const DELIVERY_OPTIONS = [
  {
    id: 'certified_mail',
    name: 'Certified Mail',
    price: '$12',
    description: 'USPS Certified Mail with return receipt',
    icon: 'mail',
  },
  {
    id: 'process_server',
    name: 'Process Server',
    price: '$75',
    description: 'Professional delivery with proof of service',
    icon: 'person',
  },
];

export default function PricingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { plan, refreshPlan } = usePlan();
  const [loading, setLoading] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [noticeQuantity, setNoticeQuantity] = useState(1);
  const [paymentStep, setPaymentStep] = useState<'select' | 'processing' | 'success'>('select');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const handleSelectPlan = async (selectedPlanData: PricingPlan) => {
    if (selectedPlanData.paymentType === 'free') {
      return; // Already on free plan
    }

    setSelectedPlan(selectedPlanData);
    setShowPaymentModal(true);
    setPaymentStep('select');
  };

  const handleStartPayment = async () => {
    if (!selectedPlan || !user) return;

    setLoading(selectedPlan.id);
    setPaymentStep('processing');

    try {
      if (selectedPlan.paymentType === 'subscription') {
        // Create SetupIntent for subscription
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            action: 'create-setup-intent',
            email: user.email,
            userId: user.id,
          }
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || 'Failed to create payment');
        }

        setClientSecret(data.clientSecret);
        setCustomerId(data.customerId);
        
        // In a real app, you'd open Stripe PaymentSheet here
        // For now, show instructions for testing
        Alert.alert(
          'Payment Setup',
          `To complete your Pro subscription:\n\n1. Your payment is being processed\n2. Use test card: 4242 4242 4242 4242\n3. Any future date and any CVC\n\nClient Secret: ${data.clientSecret.substring(0, 20)}...`,
          [
            {
              text: 'Simulate Success',
              onPress: () => handlePaymentSuccess('subscription'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setPaymentStep('select');
                setLoading(null);
              }
            }
          ]
        );
      } else if (selectedPlan.paymentType === 'single_notice') {
        // Create PaymentIntent for one-time purchase
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            action: 'create-payment-intent',
            email: user.email,
            userId: user.id,
            paymentType: 'single_notice',
            quantity: noticeQuantity,
          }
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || 'Failed to create payment');
        }

        setClientSecret(data.clientSecret);
        setCustomerId(data.customerId);

        Alert.alert(
          'Purchase Notices',
          `Total: $${(19 * noticeQuantity).toFixed(2)} for ${noticeQuantity} notice${noticeQuantity > 1 ? 's' : ''}\n\nUse test card: 4242 4242 4242 4242`,
          [
            {
              text: 'Simulate Success',
              onPress: () => handlePaymentSuccess('single_notice'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setPaymentStep('select');
                setLoading(null);
              }
            }
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to process payment');
      setPaymentStep('select');
      setLoading(null);
    }
  };

  const handlePaymentSuccess = async (type: 'subscription' | 'single_notice') => {
    if (!user) return;

    try {
      if (type === 'subscription') {
        // Activate subscription
        const { data: subData, error: subError } = await supabase.functions.invoke('create-payment', {
          body: {
            action: 'activate-subscription',
            customerId,
            userId: user.id,
          }
        });

        if (subError || subData?.error) {
          throw new Error(subData?.error || subError?.message);
        }

        // Update user plan
        await supabase.functions.invoke('update-user-plan', {
          body: {
            action: 'activate-pro',
            userId: user.id,
            subscriptionId: subData.subscriptionId,
            stripeCustomerId: customerId,
          }
        });
      } else {
        // Add purchased notices
        await supabase.functions.invoke('update-user-plan', {
          body: {
            action: 'add-notices',
            userId: user.id,
            quantity: noticeQuantity,
            stripeCustomerId: customerId,
          }
        });
      }

      setPaymentStep('success');
      await refreshPlan();

      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentStep('select');
        setLoading(null);
        Alert.alert(
          'Success!',
          type === 'subscription' 
            ? 'Welcome to Prelimpro Pro! You now have unlimited notices.'
            : `${noticeQuantity} notice credit${noticeQuantity > 1 ? 's' : ''} added to your account.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }, 1500);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete payment');
      setPaymentStep('select');
      setLoading(null);
    }
  };

  const renderPlanCard = (planData: PricingPlan) => {
    const isCurrentPlan = plan?.plan_type === planData.id || 
      (planData.id === 'free' && plan?.plan_type === 'free');
    const isPro = plan?.isPro;

    return (
      <View 
        key={planData.id}
        style={[
          styles.planCard,
          planData.highlighted && styles.planCardHighlighted,
        ]}
      >
        {planData.highlighted && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}
        
        <Text style={styles.planName}>{planData.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.planPrice}>{planData.price}</Text>
          <Text style={styles.planPriceSubtext}>{planData.priceSubtext}</Text>
        </View>
        <Text style={styles.planDescription}>{planData.description}</Text>
        
        <View style={styles.featuresContainer}>
          {planData.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons 
                name="checkmark-circle" 
                size={18} 
                color={planData.highlighted ? colors.primary : colors.success} 
              />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <Button
          title={
            isPro && planData.id === 'pro' ? 'Current Plan' :
            isCurrentPlan && planData.id === 'free' ? 'Current Plan' :
            planData.buttonText
          }
          onPress={() => handleSelectPlan(planData)}
          variant={planData.highlighted ? 'primary' : 'outline'}
          disabled={
            (isPro && planData.id === 'pro') || 
            (isCurrentPlan && planData.id === 'free') ||
            loading === planData.id
          }
          loading={loading === planData.id}
          style={styles.planButton}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pricing Plans</Text>
          <View style={styles.backButton} />
        </View>

        {/* Current Plan Status */}
        {plan && (
          <View style={styles.currentPlanBanner}>
            <Ionicons 
              name={plan.isPro ? 'star' : 'document-text'} 
              size={24} 
              color={plan.isPro ? colors.warning : colors.primary} 
            />
            <View style={styles.currentPlanInfo}>
              <Text style={styles.currentPlanTitle}>
                {plan.isPro ? 'Pro Plan' : `${plan.noticesAvailable} notices remaining`}
              </Text>
              <Text style={styles.currentPlanSubtitle}>
                {plan.isPro 
                  ? `Active until ${new Date(plan.pro_until!).toLocaleDateString()}`
                  : `${plan.notices_used} of ${3 + plan.notices_purchased} used`
                }
              </Text>
            </View>
          </View>
        )}

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map(renderPlanCard)}
        </View>

        {/* Delivery Add-ons */}
        <View style={styles.addonsSection}>
          <Text style={styles.addonsTitle}>Delivery Add-ons</Text>
          <Text style={styles.addonsSubtitle}>
            Professional delivery options for your notices
          </Text>
          
          {DELIVERY_OPTIONS.map((option) => (
            <View key={option.id} style={styles.addonCard}>
              <View style={styles.addonIcon}>
                <Ionicons name={option.icon as any} size={24} color={colors.primary} />
              </View>
              <View style={styles.addonInfo}>
                <Text style={styles.addonName}>{option.name}</Text>
                <Text style={styles.addonDescription}>{option.description}</Text>
              </View>
              <Text style={styles.addonPrice}>{option.price}</Text>
            </View>
          ))}
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What happens after my free notices?</Text>
            <Text style={styles.faqAnswer}>
              You can purchase individual notices at $19 each, or upgrade to Pro for unlimited notices at $39/month.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel my Pro subscription?</Text>
            <Text style={styles.faqAnswer}>
              Yes, you can cancel anytime. Your Pro benefits will continue until the end of your billing period.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Do purchased notices expire?</Text>
            <Text style={styles.faqAnswer}>
              No, purchased notice credits never expire and can be used anytime.
            </Text>
          </View>
        </View>

        {/* Test Mode Notice */}
        <View style={styles.testModeNotice}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={styles.testModeText}>
            Test Mode: Use card 4242 4242 4242 4242 with any future date and CVC
          </Text>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedPlan?.paymentType === 'subscription' ? 'Subscribe to Pro' : 'Purchase Notices'}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setShowPaymentModal(false);
                setPaymentStep('select');
                setLoading(null);
              }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {paymentStep === 'success' ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successText}>
                  {selectedPlan?.paymentType === 'subscription'
                    ? 'Welcome to Prelimpro Pro!'
                    : `${noticeQuantity} notice credit${noticeQuantity > 1 ? 's' : ''} added!`}
                </Text>
              </View>
            ) : (
              <>
                {selectedPlan?.paymentType === 'single_notice' && (
                  <View style={styles.quantitySelector}>
                    <Text style={styles.quantityLabel}>Number of Notices</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => setNoticeQuantity(Math.max(1, noticeQuantity - 1))}
                      >
                        <Ionicons name="remove" size={24} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.quantityValue}>{noticeQuantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => setNoticeQuantity(noticeQuantity + 1)}
                      >
                        <Ionicons name="add" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.quantityTotal}>
                      Total: ${(19 * noticeQuantity).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.paymentSummary}>
                  <Text style={styles.summaryTitle}>Order Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      {selectedPlan?.paymentType === 'subscription' 
                        ? 'Pro Monthly Subscription'
                        : `${noticeQuantity} Notice Credit${noticeQuantity > 1 ? 's' : ''}`}
                    </Text>
                    <Text style={styles.summaryValue}>
                      {selectedPlan?.paymentType === 'subscription'
                        ? '$39.00'
                        : `$${(19 * noticeQuantity).toFixed(2)}`}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryTotal]}>
                    <Text style={styles.summaryTotalLabel}>Total</Text>
                    <Text style={styles.summaryTotalValue}>
                      {selectedPlan?.paymentType === 'subscription'
                        ? '$39.00/mo'
                        : `$${(19 * noticeQuantity).toFixed(2)}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.testCardInfo}>
                  <Ionicons name="card" size={20} color={colors.info} />
                  <Text style={styles.testCardText}>
                    Test Card: 4242 4242 4242 4242{'\n'}
                    Exp: Any future date | CVC: Any 3 digits
                  </Text>
                </View>

                <Button
                  title={paymentStep === 'processing' ? 'Processing...' : 'Complete Payment'}
                  onPress={handleStartPayment}
                  loading={paymentStep === 'processing'}
                  style={styles.payButton}
                />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  currentPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  currentPlanInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  currentPlanTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  currentPlanSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  plansContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.md,
  },
  planCardHighlighted: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  popularBadgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
  planName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: spacing.sm,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planPriceSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  planDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  featuresContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  planButton: {
    marginTop: spacing.sm,
  },
  addonsSection: {
    marginBottom: spacing.xl,
  },
  addonsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  addonsSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  addonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  addonIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  addonName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  addonDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  addonPrice: {
    ...typography.h3,
    color: colors.primary,
  },
  faqSection: {
    marginBottom: spacing.xl,
  },
  faqTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  faqItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  faqQuestion: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  testModeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  testModeText: {
    ...typography.caption,
    color: colors.info,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalContent: {
    padding: spacing.lg,
  },
  quantitySelector: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  quantityLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    ...typography.h1,
    color: colors.textPrimary,
    minWidth: 60,
    textAlign: 'center',
  },
  quantityTotal: {
    ...typography.h3,
    color: colors.primary,
    marginTop: spacing.md,
  },
  paymentSummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryTotalLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    ...typography.h3,
    color: colors.primary,
  },
  testCardInfo: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  testCardText: {
    ...typography.caption,
    color: colors.info,
    flex: 1,
  },
  payButton: {
    marginTop: spacing.md,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h2,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  successText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
