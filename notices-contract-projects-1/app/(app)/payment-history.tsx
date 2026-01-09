import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { usePlan } from '../../contexts/PlanContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: number;
  receipt_url?: string;
  invoice_id?: string;
  payment_method_details?: {
    card?: {
      brand: string;
      last4: string;
    };
  };
  metadata?: {
    payment_type?: string;
    quantity?: string;
  };
}

interface NoticePurchase {
  id: string;
  quantity: number;
  amount_cents: number;
  created_at: string;
  status: string;
}

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { plan } = usePlan();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [noticePurchases, setNoticePurchases] = useState<NoticePurchase[]>([]);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  const fetchPaymentHistory = useCallback(async () => {
    if (!plan?.stripe_customer_id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch from Stripe via edge function
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          action: 'get-payment-history',
          customerId: plan.stripe_customer_id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPayments(data?.payments || []);
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
    }

    // Also fetch notice purchases from database
    try {
      const { data: purchases, error: purchasesError } = await supabase
        .from('notice_purchases')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (!purchasesError && purchases) {
        setNoticePurchases(purchases);
      }
    } catch (error) {
      console.error('Error fetching notice purchases:', error);
    }

    setLoading(false);
  }, [plan?.stripe_customer_id, user?.id]);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPaymentHistory();
    setRefreshing(false);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPaymentIcon = (payment: Payment) => {
    const paymentType = payment.metadata?.payment_type;
    if (paymentType === 'single_notice') {
      return 'document-text';
    } else if (paymentType === 'delivery') {
      return 'mail';
    } else if (payment.description?.toLowerCase().includes('subscription')) {
      return 'star';
    }
    return 'card';
  };

  const getPaymentLabel = (payment: Payment) => {
    const paymentType = payment.metadata?.payment_type;
    if (paymentType === 'single_notice') {
      const qty = payment.metadata?.quantity || '1';
      return `${qty} Notice Credit${parseInt(qty) > 1 ? 's' : ''}`;
    } else if (paymentType === 'delivery') {
      return payment.description || 'Delivery Service';
    } else if (payment.description?.toLowerCase().includes('subscription')) {
      return 'Pro Subscription';
    }
    return payment.description || 'Payment';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.gray400;
    }
  };

  const openReceipt = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open receipt');
    });
  };

  const handleDownloadInvoice = async (payment: Payment) => {
    setDownloadingInvoice(payment.id);
    
    try {
      // Call edge function to generate PDF invoice
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: {
          paymentId: payment.id,
          customerId: plan?.stripe_customer_id,
          userId: user?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Open the invoice URL
      if (data?.invoiceUrl) {
        Linking.openURL(data.invoiceUrl).catch(() => {
          Alert.alert('Error', 'Could not open invoice');
        });
      } else if (data?.pdfBase64) {
        // If we get base64 data, we could save it locally
        // For now, show a success message
        Alert.alert('Success', 'Invoice generated successfully');
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      Alert.alert('Error', error.message || 'Failed to generate invoice. Please try again.');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentIconContainer}>
          <Ionicons
            name={getPaymentIcon(item) as any}
            size={24}
            color={colors.primary}
          />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentLabel}>{getPaymentLabel(item)}</Text>
          <Text style={styles.paymentDate}>{formatDate(item.created)}</Text>
        </View>
        <View style={styles.paymentAmountContainer}>
          <Text style={styles.paymentAmount}>
            {formatAmount(item.amount, item.currency)}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {item.payment_method_details?.card && (
        <View style={styles.cardInfo}>
          <Ionicons name="card-outline" size={16} color={colors.gray400} />
          <Text style={styles.cardText}>
            {item.payment_method_details.card.brand.charAt(0).toUpperCase() +
              item.payment_method_details.card.brand.slice(1)}{' '}
            •••• {item.payment_method_details.card.last4}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {item.receipt_url && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openReceipt(item.receipt_url!)}
          >
            <Ionicons name="receipt-outline" size={16} color={colors.primary} />
            <Text style={styles.actionButtonText}>View Receipt</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'succeeded' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.invoiceButton]}
            onPress={() => handleDownloadInvoice(item)}
            disabled={downloadingInvoice === item.id}
          >
            {downloadingInvoice === item.id ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color={colors.info} />
                <Text style={[styles.actionButtonText, { color: colors.info }]}>
                  Download Invoice
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="receipt-outline" size={48} color={colors.gray300} />
      </View>
      <Text style={styles.emptyTitle}>No Payment History</Text>
      <Text style={styles.emptyDescription}>
        Your payment history will appear here once you make a purchase or
        subscribe to Pro.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/(app)/pricing')}
      >
        <Text style={styles.emptyButtonText}>View Pricing</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Payment History',
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading payment history...</Text>
          </View>
        ) : (
          <>
            {/* Summary Card */}
            {(payments.length > 0 || noticePurchases.length > 0) && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Payments</Text>
                    <Text style={styles.summaryValue}>{payments.length}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Spent</Text>
                    <Text style={styles.summaryValue}>
                      {formatAmount(
                        payments
                          .filter((p) => p.status === 'succeeded')
                          .reduce((sum, p) => sum + p.amount, 0),
                        'usd'
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <FlatList
              data={payments}
              renderItem={renderPaymentItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmptyState}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    marginBottom: 0,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray200,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  paymentLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  paymentDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  cardText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight + '15',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  invoiceButton: {
    backgroundColor: colors.infoLight + '30',
  },
  actionButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  separator: {
    height: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.full,
  },
  emptyButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
});

