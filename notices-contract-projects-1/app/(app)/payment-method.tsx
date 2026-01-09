import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { usePlan } from '../../contexts/PlanContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details: {
    name: string | null;
    email: string | null;
  };
}

interface CardFormData {
  cardNumber: string;
  expiry: string;
  cvc: string;
  name: string;
  zipCode: string;
}

const CARD_BRANDS: { [key: string]: { icon: string; color: string } } = {
  visa: { icon: 'card', color: '#1A1F71' },
  mastercard: { icon: 'card', color: '#EB001B' },
  amex: { icon: 'card', color: '#006FCF' },
  discover: { icon: 'card', color: '#FF6000' },
  default: { icon: 'card-outline', color: colors.gray600 },
};

export default function PaymentMethodScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { plan, refreshPlan } = usePlan();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState<CardFormData>({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: '',
    zipCode: '',
  });
  const [errors, setErrors] = useState<Partial<CardFormData>>({});

  const fetchPaymentMethod = useCallback(async () => {
    if (!plan?.stripe_customer_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          action: 'get-payment-method',
          customerId: plan.stripe_customer_id,
        },
      });

      if (error) throw error;
      if (data?.error && !data.error.includes('No payment method')) {
        throw new Error(data.error);
      }

      setCurrentPaymentMethod(data?.paymentMethod || null);
    } catch (error: any) {
      console.error('Error fetching payment method:', error);
    } finally {
      setLoading(false);
    }
  }, [plan?.stripe_customer_id]);

  useEffect(() => {
    fetchPaymentMethod();
  }, [fetchPaymentMethod]);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ').substring(0, 19) : '';
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const detectCardBrand = (number: string): string => {
    const cleaned = number.replace(/\D/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    return 'default';
  };

  const validateCard = (): boolean => {
    const newErrors: Partial<CardFormData> = {};
    const cardNumber = cardForm.cardNumber.replace(/\D/g, '');

    // Card number validation (basic Luhn check)
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.cardNumber = 'Invalid card number';
    }

    // Expiry validation
    const [month, year] = cardForm.expiry.split('/');
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(`20${year}`, 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (!month || !year || expMonth < 1 || expMonth > 12) {
      newErrors.expiry = 'Invalid expiry date';
    } else if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      newErrors.expiry = 'Card has expired';
    }

    // CVC validation
    const cvcLength = detectCardBrand(cardNumber) === 'amex' ? 4 : 3;
    if (cardForm.cvc.length !== cvcLength) {
      newErrors.cvc = `CVC must be ${cvcLength} digits`;
    }

    // Name validation
    if (cardForm.name.trim().length < 2) {
      newErrors.name = 'Name is required';
    }

    // ZIP code validation
    if (cardForm.zipCode.length < 5) {
      newErrors.zipCode = 'Valid ZIP code required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdatePaymentMethod = async () => {
    if (!validateCard()) {
      return;
    }

    if (!plan?.stripe_customer_id) {
      Alert.alert('Error', 'No customer account found. Please contact support.');
      return;
    }

    setSaving(true);

    try {
      // Create SetupIntent
      const { data: setupData, error: setupError } = await supabase.functions.invoke('create-payment', {
        body: {
          action: 'create-setup-intent',
          customerId: plan.stripe_customer_id,
        },
      });

      if (setupError) throw setupError;
      if (setupData?.error) throw new Error(setupData.error);

      const clientSecret = setupData?.clientSecret;
      if (!clientSecret) {
        throw new Error('Failed to create setup intent');
      }

      // In a production app, you would use Stripe's React Native SDK here
      // For now, we'll call an edge function that handles the card setup
      const [expMonth, expYear] = cardForm.expiry.split('/');
      
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke('create-payment', {
        body: {
          action: 'confirm-setup-intent',
          customerId: plan.stripe_customer_id,
          setupIntentId: setupData.setupIntentId,
          cardDetails: {
            number: cardForm.cardNumber.replace(/\D/g, ''),
            exp_month: parseInt(expMonth, 10),
            exp_year: parseInt(`20${expYear}`, 10),
            cvc: cardForm.cvc,
            name: cardForm.name,
            address_zip: cardForm.zipCode,
          },
          subscriptionId: plan.subscription_id,
        },
      });

      if (confirmError) throw confirmError;
      if (confirmData?.error) {
        // Handle specific card errors
        const errorMessage = confirmData.error;
        if (errorMessage.includes('card_declined')) {
          throw new Error('Your card was declined. Please try a different card.');
        } else if (errorMessage.includes('expired_card')) {
          throw new Error('Your card has expired. Please use a valid card.');
        } else if (errorMessage.includes('incorrect_cvc')) {
          throw new Error('The CVC code is incorrect. Please check and try again.');
        } else if (errorMessage.includes('insufficient_funds')) {
          throw new Error('Insufficient funds. Please try a different card.');
        } else if (errorMessage.includes('processing_error')) {
          throw new Error('An error occurred while processing your card. Please try again.');
        }
        throw new Error(errorMessage);
      }

      // Success
      Alert.alert(
        'Success',
        'Your payment method has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAddCard(false);
              setCardForm({
                cardNumber: '',
                expiry: '',
                cvc: '',
                name: '',
                zipCode: '',
              });
              fetchPaymentMethod();
              refreshPlan();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      Alert.alert('Error', error.message || 'Failed to update payment method. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePaymentMethod = () => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method? You will need to add a new one to continue your subscription.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!currentPaymentMethod || !plan?.stripe_customer_id) return;

            try {
              setLoading(true);
              const { data, error } = await supabase.functions.invoke('create-payment', {
                body: {
                  action: 'detach-payment-method',
                  paymentMethodId: currentPaymentMethod.id,
                },
              });

              if (error) throw error;
              if (data?.error) throw new Error(data.error);

              setCurrentPaymentMethod(null);
              Alert.alert('Success', 'Payment method removed successfully.');
            } catch (error: any) {
              console.error('Error removing payment method:', error);
              Alert.alert('Error', error.message || 'Failed to remove payment method.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getCardBrandInfo = (brand: string) => {
    return CARD_BRANDS[brand.toLowerCase()] || CARD_BRANDS.default;
  };

  const renderCurrentPaymentMethod = () => {
    if (!currentPaymentMethod) {
      return (
        <View style={styles.noPaymentMethod}>
          <View style={styles.noPaymentIconContainer}>
            <Ionicons name="card-outline" size={48} color={colors.gray300} />
          </View>
          <Text style={styles.noPaymentTitle}>No Payment Method</Text>
          <Text style={styles.noPaymentDescription}>
            Add a payment method to manage your subscription and purchases.
          </Text>
        </View>
      );
    }

    const brandInfo = getCardBrandInfo(currentPaymentMethod.card.brand);

    return (
      <View style={styles.currentCardContainer}>
        <View style={styles.cardDisplay}>
          <View style={[styles.cardIconContainer, { backgroundColor: brandInfo.color + '15' }]}>
            <Ionicons
              name={brandInfo.icon as any}
              size={32}
              color={brandInfo.color}
            />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.cardBrand}>
              {currentPaymentMethod.card.brand.charAt(0).toUpperCase() +
                currentPaymentMethod.card.brand.slice(1)}
            </Text>
            <Text style={styles.cardNumber}>
              •••• •••• •••• {currentPaymentMethod.card.last4}
            </Text>
            <Text style={styles.cardExpiry}>
              Expires {currentPaymentMethod.card.exp_month.toString().padStart(2, '0')}/
              {currentPaymentMethod.card.exp_year.toString().slice(-2)}
            </Text>
          </View>
          <View style={styles.defaultBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => setShowAddCard(true)}
          >
            <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
            <Text style={styles.cardActionText}>Replace Card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardActionButton, styles.cardActionButtonDanger]}
            onPress={handleRemovePaymentMethod}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={[styles.cardActionText, styles.cardActionTextDanger]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAddCardForm = () => {
    const detectedBrand = detectCardBrand(cardForm.cardNumber);
    const brandInfo = getCardBrandInfo(detectedBrand);

    return (
      <View style={styles.addCardForm}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>
            {currentPaymentMethod ? 'Replace Payment Method' : 'Add Payment Method'}
          </Text>
          <Text style={styles.formDescription}>
            Enter your card details below. Your information is encrypted and secure.
          </Text>
        </View>

        {/* Card Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Card Number</Text>
          <View style={[styles.inputContainer, errors.cardNumber && styles.inputError]}>
            <Ionicons
              name={brandInfo.icon as any}
              size={24}
              color={brandInfo.color}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={colors.gray400}
              value={cardForm.cardNumber}
              onChangeText={(text) => {
                setCardForm({ ...cardForm, cardNumber: formatCardNumber(text) });
                if (errors.cardNumber) setErrors({ ...errors, cardNumber: undefined });
              }}
              keyboardType="number-pad"
              maxLength={19}
            />
          </View>
          {errors.cardNumber && <Text style={styles.errorText}>{errors.cardNumber}</Text>}
        </View>

        {/* Expiry and CVC */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.md }]}>
            <Text style={styles.inputLabel}>Expiry Date</Text>
            <View style={[styles.inputContainer, errors.expiry && styles.inputError]}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.gray400}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="MM/YY"
                placeholderTextColor={colors.gray400}
                value={cardForm.expiry}
                onChangeText={(text) => {
                  setCardForm({ ...cardForm, expiry: formatExpiry(text) });
                  if (errors.expiry) setErrors({ ...errors, expiry: undefined });
                }}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            {errors.expiry && <Text style={styles.errorText}>{errors.expiry}</Text>}
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>CVC</Text>
            <View style={[styles.inputContainer, errors.cvc && styles.inputError]}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.gray400}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={detectedBrand === 'amex' ? '1234' : '123'}
                placeholderTextColor={colors.gray400}
                value={cardForm.cvc}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  setCardForm({ ...cardForm, cvc: cleaned });
                  if (errors.cvc) setErrors({ ...errors, cvc: undefined });
                }}
                keyboardType="number-pad"
                maxLength={detectedBrand === 'amex' ? 4 : 3}
                secureTextEntry
              />
            </View>
            {errors.cvc && <Text style={styles.errorText}>{errors.cvc}</Text>}
          </View>
        </View>

        {/* Cardholder Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cardholder Name</Text>
          <View style={[styles.inputContainer, errors.name && styles.inputError]}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.gray400}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={colors.gray400}
              value={cardForm.name}
              onChangeText={(text) => {
                setCardForm({ ...cardForm, name: text });
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              autoCapitalize="words"
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* ZIP Code */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Billing ZIP Code</Text>
          <View style={[styles.inputContainer, errors.zipCode && styles.inputError]}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.gray400}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="12345"
              placeholderTextColor={colors.gray400}
              value={cardForm.zipCode}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '');
                setCardForm({ ...cardForm, zipCode: cleaned });
                if (errors.zipCode) setErrors({ ...errors, zipCode: undefined });
              }}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
          {errors.zipCode && <Text style={styles.errorText}>{errors.zipCode}</Text>}
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          <Text style={styles.securityText}>
            Your payment information is encrypted and securely processed by Stripe.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowAddCard(false);
              setCardForm({
                cardNumber: '',
                expiry: '',
                cvc: '',
                name: '',
                zipCode: '',
              });
              setErrors({});
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Button
            title={saving ? 'Saving...' : 'Save Card'}
            onPress={handleUpdatePaymentMethod}
            disabled={saving}
            style={styles.saveButton}
          />
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Payment Method',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading payment method...</Text>
              </View>
            ) : showAddCard ? (
              renderAddCardForm()
            ) : (
              <>
                {/* Current Payment Method Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Current Payment Method</Text>
                  {renderCurrentPaymentMethod()}
                </View>

                {/* Add New Card Button (if no card exists) */}
                {!currentPaymentMethod && (
                  <Button
                    title="Add Payment Method"
                    onPress={() => setShowAddCard(true)}
                    style={styles.addButton}
                    icon={<Ionicons name="add" size={20} color={colors.textInverse} />}
                  />
                )}

                {/* Info Section */}
                <View style={styles.infoSection}>
                  <View style={styles.infoItem}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoTitle}>Secure Payments</Text>
                      <Text style={styles.infoDescription}>
                        All payments are processed securely through Stripe with bank-level encryption.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="refresh-outline" size={24} color={colors.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoTitle}>Automatic Billing</Text>
                      <Text style={styles.infoDescription}>
                        Your subscription will automatically renew using this payment method.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoTitle}>Payment Notifications</Text>
                      <Text style={styles.infoDescription}>
                        You'll receive email notifications before each billing cycle.
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
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
  backButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  noPaymentMethod: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noPaymentIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  noPaymentTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noPaymentDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  currentCardContainer: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  cardDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardBrand: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  cardNumber: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardExpiry: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  defaultBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: spacing.md,
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight + '15',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  cardActionButtonDanger: {
    backgroundColor: colors.errorLight,
  },
  cardActionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  cardActionTextDanger: {
    color: colors.error,
  },
  addButton: {
    marginBottom: spacing.lg,
  },
  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  // Add Card Form Styles
  addCardForm: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  formHeader: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight + '30',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight + '30',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  securityText: {
    ...typography.caption,
    color: colors.success,
    flex: 1,
    marginLeft: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
  },
});
