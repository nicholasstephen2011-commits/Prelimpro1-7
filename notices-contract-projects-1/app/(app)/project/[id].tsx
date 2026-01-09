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
  Image,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';
import { supabase, Project } from '../../../lib/supabase';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';
import Button from '../../../components/Button';
import DisclaimerFooter from '../../../components/DisclaimerFooter';
import ReminderStatus from '../../../components/ReminderStatus';
import AuditTimeline from '../../../components/AuditTimeline';
import ComplianceStatusBadge from '../../../components/ComplianceStatusBadge';
import GenerateNoticeModal from '../../../components/GenerateNoticeModal';
import { cancelProjectReminders } from '../../../lib/notifications';
import { sharePDF, printPDF, generatePDF } from '../../../lib/pdfGenerator';

const statusConfig = {
  draft: { label: 'Draft', color: colors.gray500, bg: colors.gray100, icon: 'document-outline' as const },
  pending: { label: 'Pending', color: colors.warning, bg: colors.warningLight, icon: 'time-outline' as const },
  sent: { label: 'Sent', color: colors.info, bg: colors.infoLight, icon: 'send-outline' as const },
  delivered: { label: 'Delivered', color: colors.success, bg: colors.successLight, icon: 'checkmark-circle-outline' as const },
  signed: { label: 'Signed', color: colors.success, bg: colors.successLight, icon: 'shield-checkmark-outline' as const },
};

export default function ProjectDetailScreen() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'preview' | 'share' | 'print' | 'email' | 'send' | null>(null);
  
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    fetchProject();
    fetchReceiptImages();
  }, [id]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
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

  const fetchReceiptImages = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .list(`${id}/`, { limit: 10 });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const urls = await Promise.all(
          data.map(async (file) => {
            const { data: urlData } = await supabase.storage
              .from('receipts')
              .createSignedUrl(`${id}/${file.name}`, 3600);
            return urlData?.signedUrl || '';
          })
        );
        setReceiptImages(urls.filter(url => url));
      }
    } catch (error) {
      console.error('Error fetching receipt images:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id) {
                await cancelProjectReminders(id);
              }
              await supabase.from('projects').delete().eq('id', id);
              router.replace('/(app)/dashboard');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete project');
            }
          },
        },
      ]
    );
  };

  // Show generate notice modal before any PDF action
  const requestGenerateAction = (action: 'preview' | 'share' | 'print' | 'email' | 'send') => {
    setPendingAction(action);
    setShowGenerateModal(true);
  };

  const handleGenerateAccept = () => {
    setShowGenerateModal(false);
    if (pendingAction === 'preview') {
      executePreview();
    } else if (pendingAction === 'share') {
      executeShare();
    } else if (pendingAction === 'print') {
      executePrint();
    } else if (pendingAction === 'email') {
      executeEmail();
    } else if (pendingAction === 'send') {
      executeSend();
    }
    setPendingAction(null);
  };

  const handleGenerateCancel = () => {
    setShowGenerateModal(false);
    setPendingAction(null);
  };

  const executePreview = () => {
    router.push({
      pathname: '/(app)/preview',
      params: { projectId: id }
    });
  };

  const executeSend = () => {
    router.push({
      pathname: '/(app)/delivery',
      params: { projectId: id }
    });
  };

  const executeShare = async () => {
    if (!project) return;
    setPdfLoading(true);
    try {
      const result = await sharePDF(project);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to share PDF');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setPdfLoading(false);
    }
  };

  const executePrint = async () => {
    if (!project) return;
    setPdfLoading(true);
    try {
      const result = await printPDF(project);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to print PDF');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setPdfLoading(false);
    }
  };

  const executeEmail = async () => {
    if (!project) return;
    
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Error', 'Email is not available on this device');
      return;
    }
    
    setPdfLoading(true);
    try {
      const pdfResult = await generatePDF(project);
      if (!pdfResult.success || !pdfResult.uri) {
        Alert.alert('Error', pdfResult.error || 'Failed to generate PDF');
        return;
      }
      
      const result = await MailComposer.composeAsync({
        recipients: [],
        subject: `Preliminary Notice - ${project.project_name}`,
        body: `Dear ${project.property_owner_name},\n\nPlease find attached the Preliminary Notice for the project at ${project.property_address}.\n\nProject Details:\n- Project Name: ${project.project_name}\n- Property Address: ${project.property_address}\n- Job Start Date: ${new Date(project.job_start_date).toLocaleDateString()}\n- Contract Amount: $${project.contract_amount.toLocaleString()}\n\nPlease review and acknowledge receipt of this notice.\n\nThank you.`,
        attachments: [pdfResult.uri],
      });
      
      if (result.status === 'sent') {
        Alert.alert('Success', 'Email sent successfully!');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert('Error', 'Failed to compose email');
    } finally {
      setPdfLoading(false);
    }
  };

  // FEATURE 1: Scan Receipt with Camera
  const handleScanReceipt = async () => {
    Alert.alert(
      'Add Receipt',
      'Choose how to add a receipt photo',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            if (!cameraPermission?.granted) {
              const permission = await requestCameraPermission();
              if (!permission.granted) {
                Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
                return;
              }
            }
            setShowCamera(true);
          },
        },
        {
          text: 'Choose from Library',
          onPress: handlePickImage,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async (cameraRef: any) => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({ quality: 0.8 });
        setShowCamera(false);
        if (photo?.uri) {
          await uploadReceiptImage(photo.uri);
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const uploadReceiptImage = async (uri: string) => {
    if (!id) return;
    
    setUploadingReceipt(true);
    try {
      const fileName = `receipt_${Date.now()}.jpg`;
      const filePath = `${id}/${fileName}`;
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const { error } = await supabase.storage
        .from('receipts')
        .upload(filePath, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      
      if (error) throw error;
      
      Alert.alert('Success', 'Receipt uploaded successfully!');
      fetchReceiptImages();
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      Alert.alert('Error', error.message || 'Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // FEATURE 5: Copy Project Details to Clipboard
  const handleCopyDetails = async () => {
    if (!project) return;
    
    const details = `PROJECT DETAILS
================
Project Name: ${project.project_name}
State: ${project.state}
Status: ${project.status}

PROPERTY INFORMATION
====================
Property Address: ${project.property_address}
Owner Name: ${project.property_owner_name}
Owner Address: ${project.property_owner_address}

CONTRACT DETAILS
================
Job Start Date: ${new Date(project.job_start_date).toLocaleDateString()}
Contract Amount: $${project.contract_amount.toLocaleString()}
${project.deadline ? `Deadline: ${new Date(project.deadline).toLocaleDateString()}` : ''}

WORK DESCRIPTION
================
${project.description}
${project.general_contractor_name ? `\nGeneral Contractor: ${project.general_contractor_name}` : ''}
${project.lender_name ? `\nLender: ${project.lender_name}` : ''}`;

    await Clipboard.setStringAsync(details);
    Alert.alert('Copied!', 'Project details copied to clipboard');
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

  const status = statusConfig[project.status];
  const deadlineDate = project.deadline ? new Date(project.deadline) : null;
  const isOverdue = deadlineDate && deadlineDate < new Date() && project.status === 'draft';
  const daysUntilDeadline = deadlineDate 
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Generate Notice Modal - Required before any PDF action */}
      <GenerateNoticeModal
        visible={showGenerateModal}
        onAccept={handleGenerateAccept}
        onCancel={handleGenerateCancel}
        actionType={pendingAction === 'preview' ? 'preview' : pendingAction === 'send' ? 'send' : 'generate'}
      />

      {/* Camera Modal */}
      <Modal visible={showCamera} animationType="slide">
        <CameraModal 
          onClose={() => setShowCamera(false)}
          onTakePhoto={handleTakePhoto}
        />
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={20} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          
          {project.notice_required && deadlineDate && (
            <View style={[styles.deadlineCard, isOverdue && styles.deadlineCardOverdue]}>
              <Ionicons 
                name="calendar" 
                size={24} 
                color={isOverdue ? colors.error : colors.warning} 
              />
              <View style={styles.deadlineContent}>
                <Text style={styles.deadlineLabel}>
                  {isOverdue ? 'OVERDUE' : 'Deadline'}
                </Text>
                <Text style={[styles.deadlineDate, isOverdue && styles.deadlineDateOverdue]}>
                  {deadlineDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                <Text style={styles.deadlineDays}>
                  {isOverdue 
                    ? `${Math.abs(daysUntilDeadline!)} days overdue`
                    : daysUntilDeadline === 0 
                      ? 'Due today!'
                      : `${daysUntilDeadline} days remaining`
                  }
                </Text>
              </View>
            </View>
          )}

          {!project.notice_required && (
            <View style={styles.noNoticeCard}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.noNoticeText}>
                No preliminary notice required in {project.state}
              </Text>
            </View>
          )}
        </View>

        {/* Compliance Status Badge */}
        {project.notice_required && (
          <View style={styles.complianceSection}>
            <ComplianceStatusBadge projectId={id || ''} variant="full" />
          </View>
        )}

        {/* Reminder Status */}
        {project.notice_required && project.deadline && project.status === 'draft' && (
          <View style={styles.reminderSection}>
            <ReminderStatus project={project} />
          </View>
        )}

        {/* Project Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Project Information</Text>
            <TouchableOpacity onPress={handleCopyDetails} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
          
          <DetailRow icon="folder" label="Project Name" value={project.project_name} />
          <DetailRow icon="location" label="State" value={project.state} />
          <DetailRow icon="calendar" label="Job Start Date" value={new Date(project.job_start_date).toLocaleDateString()} />
          <DetailRow icon="cash" label="Contract Amount" value={`$${project.contract_amount.toLocaleString()}`} />
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          <DetailRow icon="home" label="Property Address" value={project.property_address} />
          <DetailRow icon="person" label="Owner Name" value={project.property_owner_name} />
          <DetailRow icon="mail" label="Owner Address" value={project.property_owner_address} />
        </View>

        {/* Additional Parties */}
        {(project.general_contractor_name || project.lender_name) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Parties</Text>
            {project.general_contractor_name && (
              <>
                <DetailRow icon="construct" label="General Contractor" value={project.general_contractor_name} />
                {project.general_contractor_address && (
                  <DetailRow icon="location" label="GC Address" value={project.general_contractor_address} />
                )}
              </>
            )}
            {project.lender_name && (
              <>
                <DetailRow icon="business" label="Lender" value={project.lender_name} />
                {project.lender_address && (
                  <DetailRow icon="location" label="Lender Address" value={project.lender_address} />
                )}
              </>
            )}
          </View>
        )}

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Description</Text>
          <Text style={styles.descriptionText}>{project.description}</Text>
        </View>

        {/* Receipt Images Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Receipts</Text>
            <TouchableOpacity 
              onPress={handleScanReceipt} 
              style={styles.addReceiptButton}
              disabled={uploadingReceipt}
            >
              {uploadingReceipt ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  <Text style={styles.addReceiptText}>Add Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {receiptImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.receiptScroll}>
              {receiptImages.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.receiptImage} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noReceiptsCard}>
              <Ionicons name="receipt-outline" size={32} color={colors.gray300} />
              <Text style={styles.noReceiptsText}>No receipts uploaded yet</Text>
              <Text style={styles.noReceiptsSubtext}>Tap "Add Receipt" to scan or upload delivery receipts</Text>
            </View>
          )}
        </View>

        {/* Proof of Service */}
        {project.proof_of_service && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proof of Service</Text>
            <View style={styles.proofCard}>
              <Ionicons name="shield-checkmark" size={24} color={colors.success} />
              <View style={styles.proofContent}>
                {project.delivery_method === 'mail' && project.tracking_number && (
                  <Text style={styles.proofText}>Tracking #: {project.tracking_number}</Text>
                )}
                <Text style={styles.proofText}>
                  Delivered via {project.delivery_method === 'email' ? 'Email' : 
                    project.delivery_method === 'esign' ? 'E-Signature' : 'Certified Mail'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick PDF Actions - Now with Generate Notice Modal */}
        {project.notice_required && (
          <View style={styles.pdfActionsCard}>
            <Text style={styles.pdfActionsTitle}>Quick Actions</Text>
            <View style={styles.pdfActionsRow}>
              <TouchableOpacity style={styles.pdfActionButton} onPress={() => requestGenerateAction('share')} disabled={pdfLoading}>
                <View style={styles.pdfActionIcon}>
                  <Ionicons name="share-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.pdfActionText}>Share PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.pdfActionButton} onPress={() => requestGenerateAction('print')} disabled={pdfLoading}>
                <View style={styles.pdfActionIcon}>
                  <Ionicons name="print-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.pdfActionText}>Print PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.pdfActionButton} onPress={() => requestGenerateAction('email')} disabled={pdfLoading}>
                <View style={styles.pdfActionIcon}>
                  <Ionicons name="mail-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.pdfActionText}>Email</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.pdfActionButton} onPress={() => requestGenerateAction('preview')}>
                <View style={styles.pdfActionIcon}>
                  <Ionicons name="eye-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.pdfActionText}>Preview</Text>
              </TouchableOpacity>
            </View>
            {pdfLoading && (
              <View style={styles.pdfLoadingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.pdfLoadingText}>Processing...</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons - Now with Generate Notice Modal */}
        {project.status === 'draft' && project.notice_required && (
          <View style={styles.actionButtons}>
            <Button title="Preview & Generate Notice" onPress={() => requestGenerateAction('preview')} variant="outline" fullWidth style={styles.actionButton} />
            <Button title="Send Notice" onPress={() => requestGenerateAction('send')} fullWidth style={styles.actionButton} />
          </View>
        )}

        {/* Audit Timeline */}
        <View style={styles.timelineSection}>
          <AuditTimeline projectId={id || ''} />
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
          <Text style={styles.deleteButtonText}>Delete Project</Text>
        </TouchableOpacity>
      </ScrollView>
      <DisclaimerFooter />
    </SafeAreaView>
  );
}

// Camera Modal Component
function CameraModal({ onClose, onTakePhoto }: { onClose: () => void; onTakePhoto: (ref: any) => void }) {
  const cameraRef = React.useRef<any>(null);
  
  return (
    <View style={styles.cameraContainer}>
      <CameraView 
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <SafeAreaView style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={onClose} style={styles.cameraCloseButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Scan Receipt</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.cameraGuide}>
            <View style={styles.cameraFrame} />
            <Text style={styles.cameraHint}>Position the receipt within the frame</Text>
          </View>
          
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={styles.captureButton}
              onPress={() => onTakePhoto(cameraRef.current)}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.gray400} style={styles.detailIcon} />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { ...typography.body, color: colors.textSecondary },
  scrollContent: { padding: spacing.lg },
  
  statusCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.md },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.full, marginBottom: spacing.md },
  statusText: { ...typography.body, fontWeight: '600', marginLeft: spacing.xs },
  deadlineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warningLight, padding: spacing.md, borderRadius: borderRadius.lg },
  deadlineCardOverdue: { backgroundColor: colors.errorLight },
  deadlineContent: { marginLeft: spacing.md, flex: 1 },
  deadlineLabel: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },
  deadlineDate: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  deadlineDateOverdue: { color: colors.error },
  deadlineDays: { ...typography.bodySmall, color: colors.textSecondary },
  noNoticeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successLight, padding: spacing.md, borderRadius: borderRadius.lg },
  noNoticeText: { ...typography.body, color: colors.success, fontWeight: '500', marginLeft: spacing.sm, flex: 1 },
  
  reminderSection: { marginBottom: spacing.lg },
  complianceSection: { marginBottom: spacing.lg },
  
  section: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  
  copyButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: colors.primaryLight + '20', borderRadius: borderRadius.full },
  copyButtonText: { ...typography.caption, color: colors.primary, fontWeight: '600', marginLeft: spacing.xs },
  
  addReceiptButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: colors.primaryLight + '20', borderRadius: borderRadius.full },
  addReceiptText: { ...typography.caption, color: colors.primary, fontWeight: '600', marginLeft: spacing.xs },
  
  receiptScroll: { marginTop: spacing.sm },
  receiptImage: { width: 100, height: 100, borderRadius: borderRadius.md, marginRight: spacing.sm },
  noReceiptsCard: { alignItems: 'center', padding: spacing.lg, backgroundColor: colors.gray50, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.gray200, borderStyle: 'dashed' },
  noReceiptsText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  noReceiptsSubtext: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  
  detailRow: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  detailIcon: { marginTop: 2, marginRight: spacing.sm },
  detailContent: { flex: 1 },
  detailLabel: { ...typography.caption, color: colors.textSecondary },
  detailValue: { ...typography.body, color: colors.textPrimary },
  descriptionText: { ...typography.body, color: colors.textPrimary, lineHeight: 24 },
  
  proofCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successLight, padding: spacing.md, borderRadius: borderRadius.lg },
  proofContent: { marginLeft: spacing.md, flex: 1 },
  proofText: { ...typography.body, color: colors.textPrimary },
  
  pdfActionsCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.sm },
  pdfActionsTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.md },
  pdfActionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pdfActionButton: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  pdfActionIcon: { width: 48, height: 48, borderRadius: borderRadius.full, backgroundColor: colors.primaryLight + '20', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs },
  pdfActionText: { ...typography.caption, color: colors.primary, fontWeight: '500' },
  pdfLoadingOverlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray100 },
  pdfLoadingText: { ...typography.bodySmall, color: colors.primary, marginLeft: spacing.sm },
  
  actionButtons: { marginBottom: spacing.lg },
  actionButton: { marginBottom: spacing.sm },
  timelineSection: { marginBottom: spacing.lg },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, marginBottom: spacing.lg },
  deleteButtonText: { ...typography.body, color: colors.error, marginLeft: spacing.xs },
  
  // Camera styles
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, backgroundColor: 'transparent' },
  cameraHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  cameraCloseButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  cameraTitle: { ...typography.h3, color: '#fff' },
  cameraGuide: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraFrame: { width: 280, height: 200, borderWidth: 2, borderColor: '#fff', borderRadius: borderRadius.lg, opacity: 0.7 },
  cameraHint: { ...typography.body, color: '#fff', marginTop: spacing.md, opacity: 0.8 },
  cameraControls: { alignItems: 'center', paddingBottom: spacing.xl },
  captureButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});
