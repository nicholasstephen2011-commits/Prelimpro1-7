import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { supabase, Project } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Button from '../../components/Button';
import DisclaimerFooter from '../../components/DisclaimerFooter';
import { getPreviewHTML, generatePDF, sharePDF, printPDF, CompanyProfile } from '../../lib/pdfGenerator';
import { getStateTemplate } from '../../templates/notices/stateNoticeTemplates'

export default function PreviewScreen() {
  const [project, setProject] = useState<Project | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'info'>('preview');
  
  const router = useRouter();
  const { user } = useAuth();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const fetchProject = useCallback(async () => {
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
  }, [projectId, router]);

  const fetchCompanyProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('company_name, company_logo_url, company_address, company_phone, company_email, license_number')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching company profile:', error);
      }
      
      if (data) {
        setCompanyProfile(data);
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchProject();
    fetchCompanyProfile();
  }, [fetchProject, fetchCompanyProfile]);

  useEffect(() => {
    if (project) {
      const html = getPreviewHTML(project, companyProfile || undefined);
      setPreviewHtml(html);
    }
  }, [project, companyProfile]);

  const handleGeneratePDF = async () => {
    if (!project) return;
    
    setGenerating(true);
    try {
      const result = await generatePDF(project, companyProfile || undefined);
      if (result.success) {
        Alert.alert(
          'PDF Generated',
          'Your preliminary notice PDF has been saved to your device.',
          [
            { text: 'OK' },
            { 
              text: 'Share', 
              onPress: () => handleSharePDF() 
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Generate PDF failed:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handleSharePDF = async () => {
    if (!project) return;
    
    setGenerating(true);
    try {
      const result = await sharePDF(project, companyProfile || undefined);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to share PDF');
      }
    } catch (error) {
      console.error('Share PDF failed:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!project) return;
    
    setGenerating(true);
    try {
      const result = await printPDF(project, companyProfile || undefined);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to print PDF');
      }
    } catch (error) {
      console.error('Print PDF failed:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendNotice = () => {
    router.push({
      pathname: '/(app)/delivery',
      params: { projectId }
    });
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

  const template = getStateTemplate(project.state);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'preview' && styles.activeTab]}
          onPress={() => setActiveTab('preview')}
        >
          <Ionicons 
            name="document-text" 
            size={18} 
            color={activeTab === 'preview' ? colors.primary : colors.gray400} 
          />
          <Text style={[styles.tabText, activeTab === 'preview' && styles.activeTabText]}>
            Document Preview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Ionicons 
            name="information-circle" 
            size={18} 
            color={activeTab === 'info' ? colors.primary : colors.gray400} 
          />
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
            State Requirements
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'preview' ? (
        <View style={styles.previewContainer}>
          {/* Company Logo Notice */}
          {!companyProfile?.company_logo_url && (
            <TouchableOpacity 
              style={styles.logoNotice}
              onPress={() => router.push('/(app)/settings')}
            >
              <Ionicons name="image-outline" size={18} color={colors.info} />
              <Text style={styles.logoNoticeText}>
                Add your company logo in Settings to include it on notices
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.info} />
            </TouchableOpacity>
          )}
          
          {/* WebView PDF Preview */}
          <View style={styles.webViewContainer}>
            <WebView
              source={{ html: previewHtml }}
              style={styles.webView}
              scalesPageToFit={true}
              showsVerticalScrollIndicator={true}
              originWhitelist={['*']}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionBar}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handlePrintPDF}
              disabled={generating}
            >
              <Ionicons name="print-outline" size={22} color={colors.primary} />
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleGeneratePDF}
              disabled={generating}
            >
              <Ionicons name="download-outline" size={22} color={colors.primary} />
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleSharePDF}
              disabled={generating}
            >
              <Ionicons name="share-outline" size={22} color={colors.primary} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.infoContainer} contentContainerStyle={styles.infoContent}>
          {/* State Info Card */}
          <View style={styles.stateInfoCard}>
            <View style={styles.stateHeader}>
              <Ionicons name="location" size={24} color={colors.primary} />
              <Text style={styles.stateTitle}>{project.state}</Text>
            </View>
            <Text style={styles.stateSubtitle}>{template.subtitle}</Text>
          </View>

          {/* Deadline Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
              <Text style={styles.infoCardTitle}>Filing Deadline</Text>
            </View>
            <Text style={styles.infoCardValue}>
              {template.deadlineDays} days from first furnishing labor/materials
            </Text>
          </View>

          {/* Delivery Requirements */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="mail-outline" size={20} color={colors.info} />
              <Text style={styles.infoCardTitle}>Delivery Requirements</Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={template.certifiedMailRequired ? "checkmark-circle" : "close-circle"} 
                size={18} 
                color={template.certifiedMailRequired ? colors.success : colors.gray400} 
              />
              <Text style={styles.requirementText}>
                Certified Mail {template.certifiedMailRequired ? 'Required' : 'Optional'}
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={template.notaryRequired ? "checkmark-circle" : "close-circle"} 
                size={18} 
                color={template.notaryRequired ? colors.success : colors.gray400} 
              />
              <Text style={styles.requirementText}>
                Notarization {template.notaryRequired ? 'Required' : 'Not Required'}
              </Text>
            </View>
          </View>

          {/* Legal Warning */}
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Text style={styles.warningTitle}>Important Notice</Text>
            </View>
            <Text style={styles.warningText}>{template.warningText}</Text>
          </View>

          {/* Legal Notice */}
          <View style={styles.legalCard}>
            <View style={styles.legalHeader}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              <Text style={styles.legalTitle}>Legal Notice</Text>
            </View>
            <Text style={styles.legalText}>{template.legalNotice}</Text>
          </View>

          {/* Additional Clauses */}
          <View style={styles.clausesCard}>
            <Text style={styles.clausesTitle}>Required Clauses</Text>
            {template.additionalClauses.map((clause, index) => (
              <View key={index} style={styles.clauseRow}>
                <Text style={styles.clauseBullet}>{index + 1}.</Text>
                <Text style={styles.clauseText}>{clause}</Text>
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimerCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.gray400} />
            <Text style={styles.disclaimerText}>
              This information is provided for general guidance only. Laws vary by state and 
              may change. Consult with a licensed attorney in your state for specific legal advice.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        {generating && (
          <View style={styles.generatingOverlay}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.generatingText}>Processing...</Text>
          </View>
        )}
        
        <View style={styles.buttonRow}>
          <Button
            title="Back"
            onPress={() => router.back()}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title="Send Notice"
            onPress={handleSendNotice}
            style={styles.sendButton}
            disabled={generating}
          />
        </View>
      </View>
      
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.gray400,
    marginLeft: spacing.xs,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
  },
  logoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  logoNoticeText: {
    ...typography.caption,
    color: colors.info,
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: colors.gray200,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  infoContainer: {
    flex: 1,
  },
  infoContent: {
    padding: spacing.lg,
  },
  stateInfoCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stateTitle: {
    ...typography.h2,
    color: colors.textInverse,
    marginLeft: spacing.sm,
  },
  stateSubtitle: {
    ...typography.bodySmall,
    color: colors.gray200,
    marginTop: spacing.xs,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoCardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  infoCardValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  requirementText: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  warningCard: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  warningTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  legalCard: {
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  legalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  legalTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.info,
    marginLeft: spacing.sm,
  },
  legalText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  clausesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  clausesTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  clauseRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  clauseBullet: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    width: 24,
  },
  clauseText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.gray500,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
  bottomContainer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  generatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  generatingText: {
    ...typography.bodySmall,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  backButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sendButton: {
    flex: 2,
  },
});
