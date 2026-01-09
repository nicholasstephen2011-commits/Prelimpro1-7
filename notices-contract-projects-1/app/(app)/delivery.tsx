import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Project } from '../../lib/supabase';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Button from '../../components/Button';
import Input from '../../components/Input';
import DisclaimerFooter from '../../components/DisclaimerFooter';

type DeliveryMethod = 'email' | 'esign' | 'mail';

interface DeliveryOption {
  id: DeliveryMethod;
  title: string;
  description: string;
  price: number;
  priceLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  features: string[];
}

const deliveryOptions: DeliveryOption[] = [
  {
    id: 'email',
    title: 'Basic Email',
    description: 'Send PDF via email attachment',
    price: 0,
    priceLabel: 'FREE',
    icon: 'mail-outline',
    features: [
      'PDF attachment',
      'Email confirmation',
      'Basic delivery proof',
    ],
  },
  {
    id: 'esign',
    title: 'Certified E-Delivery',
    description: 'E-signature with legal proof',
    price: 19,
    priceLabel: '$19',
    icon: 'shield-checkmark-outline',
    features: [
      'DocuSign/HelloSign integration',
      'E-signature request',
      'Legally binding certificate',
      'Timestamp verification',
    ],
  },
  {
    id: 'mail',
    title: 'Certified Mail',
    description: 'Physical certified/priority mail',
    price: 29,
    priceLabel: '$29',
    icon: 'paper-plane-outline',
    features: [
      'Automated printing',
      'Certified mail delivery',
      'USPS tracking number',
      'Delivery confirmation',
      'Return receipt',
    ],
  },
];

export default function DeliveryScreen() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      Alert.alert('Error', 'Failed to load project');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = () => {
    if (!recipientEmail) {
      setEmailError('Recipient email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(recipientEmail)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSend = async () => {
    if (!validateEmail()) return;

    const selectedOption = deliveryOptions.find(o => o.id === selectedMethod);
    
    if (selectedMethod !== 'email') {
      // Show payment required alert for paid options
      Alert.alert(
        'Payment Required',
        `${selectedOption?.title} costs ${selectedOption?.priceLabel}. Payment integration with Stripe will process your payment securely.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue to Payment',
            onPress: () => processDelivery()
          },
        ]
      );
    } else {
      processDelivery();
    }
  };

  const processDelivery = async () => {
    setSending(true);
    
    try {
      // Update project status
      const { error } = await supabase
        .from('projects')
        .update({
          status: 'sent',
          delivery_method: selectedMethod,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) throw error;

      Alert.alert(
        'Notice Sent!',
        `Your preliminary notice has been sent via ${selectedMethod === 'email' ? 'email' : selectedMethod === 'esign' ? 'e-signature' : 'certified mail'}. You can track the status in your dashboard.`,
        [{ text: 'OK', onPress: () => router.replace('/(app)/dashboard') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send notice');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  const selectedOption = deliveryOptions.find(o => o.id === selectedMethod);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Delivery Method</Text>
          <Text style={styles.subtitle}>
            Select how you want to send your preliminary notice
          </Text>
        </View>

        {/* Recipient Email */}
        <Input
          label="Recipient Email"
          placeholder="owner@email.com"
          value={recipientEmail}
          onChangeText={(text) => {
            setRecipientEmail(text);
            if (emailError) setEmailError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
          error={emailError}
          required
        />

        {/* Delivery Options */}
        <View style={styles.optionsContainer}>
          {deliveryOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedMethod === option.id && styles.optionCardSelected
              ]}
              onPress={() => setSelectedMethod(option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.optionHeader}>
                <View style={[
                  styles.optionIconContainer,
                  selectedMethod === option.id && styles.optionIconContainerSelected
                ]}>
                  <Ionicons 
                    name={option.icon} 
                    size={24} 
                    color={selectedMethod === option.id ? colors.textInverse : colors.primary} 
                  />
                </View>
                <View style={styles.optionTitleContainer}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <View style={[
                  styles.priceTag,
                  option.price === 0 && styles.priceTagFree
                ]}>
                  <Text style={[
                    styles.priceText,
                    option.price === 0 && styles.priceTextFree
                  ]}>
                    {option.priceLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {option.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color={selectedMethod === option.id ? colors.primary : colors.gray400} 
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Selection Indicator */}
              <View style={[
                styles.radioButton,
                selectedMethod === option.id && styles.radioButtonSelected
              ]}>
                {selectedMethod === option.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Project:</Text>
            <Text style={styles.summaryValue}>{project.project_name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Method:</Text>
            <Text style={styles.summaryValue}>{selectedOption?.title}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total:</Text>
            <Text style={styles.summaryTotalValue}>{selectedOption?.priceLabel}</Text>
          </View>
        </View>

        {/* Send Button */}
        <Button
          title={selectedMethod === 'email' ? 'Send Notice' : `Pay ${selectedOption?.priceLabel} & Send`}
          onPress={handleSend}
          loading={sending}
          fullWidth
          size="lg"
          style={styles.sendButton}
        />

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="lock-closed" size={16} color={colors.gray400} />
          <Text style={styles.securityText}>
            Payments processed securely via Stripe
          </Text>
        </View>
      </ScrollView>
      <DisclaimerFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  optionsContainer: {
    marginBottom: spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.gray200,
    position: 'relative',
    ...shadows.sm,
  },
  optionCardSelected: {
    borderColor: colors.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconContainerSelected: {
    backgroundColor: colors.primary,
  },
  optionTitleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  optionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  priceTag: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  priceTagFree: {
    backgroundColor: colors.success,
  },
  priceText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textInverse,
  },
  priceTextFree: {
    fontSize: 14,
  },
  featuresContainer: {
    marginLeft: 60,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  radioButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  summaryTotal: {
    borderBottomWidth: 0,
    paddingTop: spacing.md,
  },
  summaryTotalLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    ...typography.h3,
    color: colors.primary,
  },
  sendButton: {
    marginBottom: spacing.md,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  securityText: {
    ...typography.caption,
    color: colors.gray400,
    marginLeft: spacing.xs,
  },
});
