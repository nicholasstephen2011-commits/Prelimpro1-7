import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../contexts/PlanContext';
import { useDisclaimer } from '../../contexts/DisclaimerContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import CancelSubscriptionModal from '../../components/CancelSubscriptionModal';
import DisclaimerFooter from '../../components/DisclaimerFooter';

interface UserProfile {
  id?: string;
  user_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_address: string;
  company_phone: string;
  company_email: string;
  license_number: string;
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { plan, refreshPlan } = usePlan();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    user_id: user?.id || '',
    company_name: '',
    company_logo_url: null,
    company_address: '',
    company_phone: '',
    company_email: '',
    license_number: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine for new users
        throw error;
      }
      
      if (data) {
        setProfile({
          ...data,
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_phone: data.company_phone || '',
          company_email: data.company_email || '',
          license_number: data.license_number || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload a logo.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera permissions to take a photo.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;
    
    setUploading(true);
    
    try {
      // Get file extension
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/logo.${ext}`;
      
      // Fetch the image and convert to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Convert blob to array buffer for upload
      const arrayBuffer = await new Response(blob).arrayBuffer();
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      setProfile(prev => ({ ...prev, company_logo_url: logoUrl }));
      
      Alert.alert('Success', 'Logo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    if (!user || !profile.company_logo_url) return;
    
    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove your company logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              // Try to delete from storage
              const { error } = await supabase.storage
                .from('company-logos')
                .remove([`${user.id}/logo.jpg`, `${user.id}/logo.png`, `${user.id}/logo.jpeg`]);
              
              // Update local state regardless
              setProfile(prev => ({ ...prev, company_logo_url: null }));
              
              Alert.alert('Success', 'Logo removed successfully!');
            } catch (error) {
              console.error('Error removing logo:', error);
              // Still update local state
              setProfile(prev => ({ ...prev, company_logo_url: null }));
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      'Upload Company Logo',
      'Choose how you want to add your logo',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      const profileData = {
        user_id: user.id,
        company_name: profile.company_name,
        company_logo_url: profile.company_logo_url,
        company_address: profile.company_address,
        company_phone: profile.company_phone,
        company_email: profile.company_email,
        license_number: profile.license_number,
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleCancelSubscription = () => {
    setShowCancelModal(true);
  };

  const handleSubscriptionCanceled = async () => {
    await refreshPlan();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Logo</Text>
          <Text style={styles.sectionDescription}>
            Your logo will appear on all generated preliminary notices.
          </Text>
          
          <View style={styles.logoContainer}>
            {uploading ? (
              <View style={styles.logoPlaceholder}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            ) : profile.company_logo_url ? (
              <View style={styles.logoWrapper}>
                <Image
                  source={{ uri: profile.company_logo_url }}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View style={styles.logoActions}>
                  <TouchableOpacity
                    style={styles.logoActionButton}
                    onPress={showImageOptions}
                  >
                    <Ionicons name="camera" size={20} color={colors.primary} />
                    <Text style={styles.logoActionText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.logoActionButton, styles.logoActionButtonDanger]}
                    onPress={removeLogo}
                  >
                    <Ionicons name="trash" size={20} color={colors.error} />
                    <Text style={[styles.logoActionText, styles.logoActionTextDanger]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.logoPlaceholder}
                onPress={showImageOptions}
                activeOpacity={0.7}
              >
                <View style={styles.uploadIconContainer}>
                  <Ionicons name="cloud-upload" size={40} color={colors.primary} />
                </View>
                <Text style={styles.uploadTitle}>Upload Logo</Text>
                <Text style={styles.uploadHint}>
                  Tap to select an image{'\n'}PNG, JPG up to 5MB
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Company Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <Text style={styles.sectionDescription}>
            This information will be used on your preliminary notices.
          </Text>

          <Input
            label="Company Name"
            value={profile.company_name}
            onChangeText={(text) => setProfile(prev => ({ ...prev, company_name: text }))}
            placeholder="Enter your company name"
            leftIcon={<Ionicons name="business" size={20} color={colors.gray400} />}
          />

          <Input
            label="Company Address"
            value={profile.company_address}
            onChangeText={(text) => setProfile(prev => ({ ...prev, company_address: text }))}
            placeholder="Enter your company address"
            leftIcon={<Ionicons name="location" size={20} color={colors.gray400} />}
            multiline
            numberOfLines={2}
          />

          <Input
            label="Phone Number"
            value={profile.company_phone}
            onChangeText={(text) => setProfile(prev => ({ ...prev, company_phone: text }))}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="call" size={20} color={colors.gray400} />}
          />

          <Input
            label="Email Address"
            value={profile.company_email}
            onChangeText={(text) => setProfile(prev => ({ ...prev, company_email: text }))}
            placeholder="contact@yourcompany.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail" size={20} color={colors.gray400} />}
          />

          <Input
            label="License Number"
            value={profile.license_number}
            onChangeText={(text) => setProfile(prev => ({ ...prev, license_number: text }))}
            placeholder="Enter your contractor license #"
            leftIcon={<Ionicons name="document-text" size={20} color={colors.gray400} />}
          />
        </View>

        {/* Templates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Templates</Text>
          <Text style={styles.sectionDescription}>
            Save frequently used project configurations to speed up data entry.
          </Text>
          
          <TouchableOpacity
            style={styles.templatesButton}
            onPress={() => router.push('/(app)/templates')}
          >
            <View style={styles.templatesButtonLeft}>
              <View style={styles.templatesIconContainer}>
                <Ionicons name="copy" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.templatesButtonTitle}>Manage Templates</Text>
                <Text style={styles.templatesButtonSubtitle}>
                  Create, edit, and delete project templates
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Data</Text>
          <Text style={styles.sectionDescription}>
            Export your project data as CSV or PDF reports.
          </Text>
          
          <TouchableOpacity
            style={styles.templatesButton}
            onPress={() => router.push('/(app)/export')}
          >
            <View style={styles.templatesButtonLeft}>
              <View style={[styles.templatesIconContainer, { backgroundColor: colors.successLight + '40' }]}>
                <Ionicons name="download" size={24} color={colors.success} />
              </View>
              <View>
                <Text style={styles.templatesButtonTitle}>Export Projects</Text>
                <Text style={styles.templatesButtonSubtitle}>
                  Download CSV or PDF reports of your projects
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* Developer Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer Settings</Text>
          <Text style={styles.sectionDescription}>
            Configuration guides for administrators and developers.
          </Text>
          
          <TouchableOpacity
            style={styles.templatesButton}
            onPress={() => router.push('/(app)/email-setup')}
          >
            <View style={styles.templatesButtonLeft}>
              <View style={[styles.templatesIconContainer, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="mail-unread" size={24} color={colors.info} />
              </View>
              <View>
                <Text style={styles.templatesButtonTitle}>Email Setup Guide</Text>
                <Text style={styles.templatesButtonSubtitle}>
                  Configure Resend SMTP for verification emails
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <Text style={styles.sectionDescription}>
            Manage your plan and billing.
          </Text>
          
          <TouchableOpacity
            style={styles.templatesButton}
            onPress={() => router.push('/(app)/pricing')}
          >
            <View style={styles.templatesButtonLeft}>
              <View style={[styles.templatesIconContainer, { backgroundColor: plan?.isPro ? colors.warningLight : colors.primaryLight + '20' }]}>
                <Ionicons name={plan?.isPro ? 'star' : 'card'} size={24} color={plan?.isPro ? colors.warning : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.templatesButtonTitle}>
                  {plan?.isPro ? 'Pro Plan' : 'Free Plan'}
                </Text>
                <Text style={styles.templatesButtonSubtitle}>
                  {plan?.isPro 
                    ? `Active until ${plan.pro_until ? new Date(plan.pro_until).toLocaleDateString() : 'N/A'}`
                    : `${plan?.noticesAvailable || 0} notices remaining`
                  }
                </Text>
                {plan?.subscription_status && plan.subscription_status !== 'active' && (
                  <View style={[styles.statusBadge, 
                    plan.subscription_status === 'canceling' && styles.statusBadgeWarning,
                    plan.subscription_status === 'past_due' && styles.statusBadgeError,
                    plan.subscription_status === 'canceled' && styles.statusBadgeMuted
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {plan.subscription_status === 'canceling' ? 'Cancels at period end' :
                       plan.subscription_status === 'past_due' ? 'Payment past due' :
                       plan.subscription_status === 'canceled' ? 'Canceled' :
                       plan.subscription_status}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.upgradeBadge}>
              <Text style={styles.upgradeBadgeText}>
                {plan?.isPro ? 'Manage' : 'Upgrade'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textInverse} />
            </View>
          </TouchableOpacity>
          {/* Payment History Link */}
          <TouchableOpacity
            style={[styles.templatesButton, { marginTop: spacing.md }]}
            onPress={() => router.push('/(app)/payment-history')}
          >
            <View style={styles.templatesButtonLeft}>
              <View style={[styles.templatesIconContainer, { backgroundColor: colors.gray100 }]}>
                <Ionicons name="receipt-outline" size={24} color={colors.gray600} />
              </View>
              <View>
                <Text style={styles.templatesButtonTitle}>Payment History</Text>
                <Text style={styles.templatesButtonSubtitle}>
                  View all past transactions and receipts
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </TouchableOpacity>

          {/* Payment Method Link */}
          {plan?.stripe_customer_id && (
            <TouchableOpacity
              style={[styles.templatesButton, { marginTop: spacing.md }]}
              onPress={() => router.push('/(app)/payment-method')}
            >
              <View style={styles.templatesButtonLeft}>
                <View style={[styles.templatesIconContainer, { backgroundColor: colors.infoLight }]}>
                  <Ionicons name="card-outline" size={24} color={colors.info} />
                </View>
                <View>
                  <Text style={styles.templatesButtonTitle}>Payment Method</Text>
                  <Text style={styles.templatesButtonSubtitle}>
                    Update your card on file
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}

          {/* Cancel Subscription Button (only for active Pro users) */}
          {plan?.isPro && plan?.subscription_id && plan?.subscription_status === 'active' && (
            <TouchableOpacity
              style={styles.cancelSubscriptionButton}
              onPress={handleCancelSubscription}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              <Text style={styles.cancelSubscriptionText}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}
        </View>


        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.accountInfo}>
            <Ionicons name="person-circle" size={48} color={colors.gray300} />
            <View style={styles.accountDetails}>
              <Text style={styles.accountEmail}>{user?.email}</Text>
              <Text style={styles.accountId}>ID: {user?.id?.slice(0, 8)}...</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <Button
          title={saving ? 'Saving...' : 'Save Profile'}
          onPress={saveProfile}
          disabled={saving}
          size="lg"
          style={styles.saveButton}
        />

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        {/* Version Info */}
        <Text style={styles.versionText}>Prelimpro v1.0.0</Text>

        {/* Legal Links Section */}
        <View style={styles.legalLinksSection}>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://prelimpro.com/terms')}
            style={styles.legalLink}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.gray500} />
            <Text style={styles.legalLinkText}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://prelimpro.com/privacy')}
            style={styles.legalLink}
          >
            <Ionicons name="shield-outline" size={18} color={colors.gray500} />
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DisclaimerFooter />

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCanceled={handleSubscriptionCanceled}
        subscriptionId={plan?.subscription_id || ''}
        proUntil={plan?.pro_until || null}
      />
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
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray100,
  },
  logoActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  logoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
    gap: spacing.xs,
  },
  logoActionButtonDanger: {
    backgroundColor: colors.errorLight,
  },
  logoActionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  logoActionTextDanger: {
    color: colors.error,
  },
  logoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray50,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  uploadTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  uploadHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  uploadingText: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountDetails: {
    flex: 1,
  },
  accountEmail: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  accountId: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  signOutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  versionText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  templatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  templatesButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templatesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  templatesButtonTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  templatesButtonSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  upgradeBadgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  statusBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray200,
    alignSelf: 'flex-start',
  },
  statusBadgeWarning: {
    backgroundColor: colors.warningLight,
  },
  statusBadgeError: {
    backgroundColor: colors.errorLight,
  },
  statusBadgeMuted: {
    backgroundColor: colors.gray200,
  },
  statusBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  cancelSubscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  cancelSubscriptionText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
  legalLinksSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legalLinkText: {
    ...typography.bodySmall,
    color: colors.gray500,
    textDecorationLine: 'underline',
  },
});
