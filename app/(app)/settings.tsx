import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { stateResources } from '../../constants/stateResources';
import Input from '../../components/Input';
import Button from '../../components/Button';

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
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    user_id: user?.id || '',
    company_name: '',
    company_logo_url: null,
    company_address: '',
    company_phone: '',
    company_email: '',
    license_number: '',
  });

  const fetchProfile = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const pickImage = async () => {
    try {
      // Request permission on native only (web does not need it and silently fails)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant camera roll permissions to upload a logo.',
            [{ text: 'OK' }]
          );
          return;
        }
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
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      setProfile(prev => ({ ...prev, company_logo_url: logoUrl }));
      
      Alert.alert('Success', 'Logo uploaded successfully!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload logo. Please try again.';
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', message);
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
              const { error: removeError } = await supabase.storage
                .from('company-logos')
                .remove([`${user.id}/logo.jpg`, `${user.id}/logo.png`, `${user.id}/logo.jpeg`]);
              
              if (removeError) {
                throw removeError;
              }
              
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save profile. Please try again.';
      console.error('Error saving profile:', error);
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window === 'undefined' ? true : window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        await signOut();
        router.replace('/(auth)/login');
      }
      return;
    }

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
                  alt="Company logo"
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

          {/* Explicit upload button for reliability (esp. web) */}
          <View style={{ marginTop: spacing.md }}>
            <Button
              title="Upload Logo"
              onPress={pickImage}
              variant="outline"
              fullWidth
            />
          </View>
        </View>

        {/* Upgrade Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PrelimPro Subscription</Text>
          <Text style={styles.sectionDescription}>
            Unlock unlimited notices, exports, and automated reminders to stay lien-protected.
          </Text>

          <View style={styles.upgradeHighlights}>
            <View style={styles.upgradeBullet}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.upgradeText}>Unlimited projects and PDFs</Text>
            </View>
            <View style={styles.upgradeBullet}>
              <Ionicons name="time" size={18} color={colors.primary} />
              <Text style={styles.upgradeText}>Automatic reminder timelines</Text>
            </View>
            <View style={styles.upgradeBullet}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              <Text style={styles.upgradeText}>Priority support</Text>
            </View>
          </View>

          <Button
            title="Upgrade to Pro"
            onPress={() => router.push('/(app)/upgrade')}
            size="lg"
            fullWidth
          />
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

        {/* State Resources Link */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/state-resources')}
          style={styles.linkRow}
          activeOpacity={0.7}
        >
          <View style={styles.linkRowTextWrap}>
            <Text style={styles.linkRowTitle}>State Preliminary Notice Resources</Text>
            <Text style={styles.linkRowSubtitle}>Official forms & statutes for all 50 states</Text>
          </View>
          <Text style={styles.linkRowChevron}>→</Text>
        </TouchableOpacity>

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

        {/* State Resources Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>State Resources</Text>
          <Text style={styles.sectionDescription}>
            Tap a state to view its notice details and links.
          </Text>
          <View style={styles.stateGrid}>
            {stateResources.map((state) => {
              return (
                <TouchableOpacity
                  key={state.abbr}
                  style={styles.stateChip}
                  onPress={() => router.push(`/states/${state.abbr.toLowerCase()}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stateChipText}>{state.abbr}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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

        {/* Legal Links */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://premiumlien.com/terms')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://premiumlien.com/privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <Text style={styles.versionText}>Prelimpro v1.0.0</Text>
      </ScrollView>
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
  upgradeHighlights: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  upgradeBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  upgradeText: {
    ...typography.body,
    color: colors.textPrimary,
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
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  legalLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  legalSeparator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  linkRowTextWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  linkRowTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  linkRowSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  linkRowChevron: {
    ...typography.h3,
    color: colors.primary,
    paddingHorizontal: spacing.xs,
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
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stateChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  stateChipText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
