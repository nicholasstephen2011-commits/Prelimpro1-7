import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  supabase, 
  US_STATES, 
  isNoticeRequired, 
  calculateDeadline,
  STATE_DEADLINES,
  Project,
  ProjectTemplate
} from '../../lib/supabase';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import DisclaimerFooter from '../../components/DisclaimerFooter';
import DatePicker from '../../components/DatePicker';
import { scheduleDeadlineReminders } from '../../lib/notifications';

type Step = 1 | 2 | 3;

interface FormData {
  projectName: string;
  state: string;
  jobStartDate: Date;
  propertyAddress: string;
  propertyOwnerName: string;
  propertyOwnerAddress: string;
  generalContractorName: string;
  generalContractorAddress: string;
  lenderName: string;
  lenderAddress: string;
  description: string;
  contractAmount: string;
  enableReminders: boolean;
  signature: string;
}

export default function NewProjectScreen() {
  const [step, setStep] = useState<Step>(1);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    projectName: '',
    state: '',
    jobStartDate: new Date(),
    propertyAddress: '',
    propertyOwnerName: '',
    propertyOwnerAddress: '',
    generalContractorName: '',
    generalContractorAddress: '',
    lenderName: '',
    lenderAddress: '',
    description: '',
    contractAmount: '',
    enableReminders: true,
    signature: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const { user } = useAuth();
  const { refreshReminders } = useNotifications();
  const router = useRouter();

  // Fetch templates on mount
  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('template_name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);

      // Auto-apply default template if exists
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate) {
        applyTemplate(defaultTemplate);
        setSelectedTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchTemplates();
    }, [fetchTemplates])
  );

  const applyTemplate = (template: ProjectTemplate) => {
    setFormData(prev => ({
      ...prev,
      state: template.state || prev.state,
      generalContractorName: template.general_contractor_name || prev.generalContractorName,
      generalContractorAddress: template.general_contractor_address || prev.generalContractorAddress,
      lenderName: template.lender_name || prev.lenderName,
      lenderAddress: template.lender_address || prev.lenderAddress,
      description: template.description || prev.description,
    }));
    setSelectedTemplate(template);
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setFormData(prev => ({
      ...prev,
      generalContractorName: '',
      generalContractorAddress: '',
      lenderName: '',
      lenderAddress: '',
      description: '',
    }));
  };

  const noticeRequired = useMemo(() => 
    formData.state ? isNoticeRequired(formData.state) : null, 
    [formData.state]
  );

  const deadline = useMemo(() => {
    if (formData.state && noticeRequired) {
      return calculateDeadline(formData.state, formData.jobStartDate);
    }
    return null;
  }, [formData.state, formData.jobStartDate, noticeRequired]);

  const deadlineDays = useMemo(() => 
    formData.state ? STATE_DEADLINES[formData.state] : null,
    [formData.state]
  );

  const updateFormData = (key: keyof FormData, value: string | Date | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateStep1 = () => {
    const newErrors: typeof errors = {};
    if (!formData.projectName) newErrors.projectName = 'Project name is required';
    if (!formData.state) newErrors.state = 'Please select a state';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: typeof errors = {};
    if (!formData.propertyAddress) newErrors.propertyAddress = 'Property address is required';
    if (!formData.propertyOwnerName) newErrors.propertyOwnerName = 'Owner name is required';
    if (!formData.propertyOwnerAddress) newErrors.propertyOwnerAddress = 'Owner address is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.contractAmount) newErrors.contractAmount = 'Contract amount is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignature = () => {
    const newErrors: typeof errors = {};
    if (!formData.signature) newErrors.signature = 'Signature is required';
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      router.back();
    }
  };

  // FEATURE 2: Use Current Location with expo-location
  const handleUseCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        // Format the address
        const formattedAddress = [
          address.streetNumber,
          address.street,
          address.city,
          address.region,
          address.postalCode,
        ]
          .filter(Boolean)
          .join(', ');

        updateFormData('propertyAddress', formattedAddress);
        
        // Also try to detect state
        if (address.region) {
          const matchedState = US_STATES.find(
            state => state.toLowerCase() === address.region?.toLowerCase() ||
                     state.includes(address.region || '')
          );
          if (matchedState && !formData.state) {
            updateFormData('state', matchedState);
          }
        }

        Alert.alert('Success', 'Address filled from your current location!');
      } else {
        Alert.alert('Error', 'Could not determine address from location');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get current location';
      console.error('Location error:', error);
      Alert.alert('Error', message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSaveAsTemplate = () => {
    Alert.prompt(
      'Save as Template',
      'Enter a name for this template:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (templateName) => {
            if (!templateName?.trim()) {
              Alert.alert('Error', 'Please enter a template name');
              return;
            }
            
            try {
              const templateData = {
                user_id: user?.id,
                template_name: templateName.trim(),
                state: formData.state || null,
                general_contractor_name: formData.generalContractorName || null,
                general_contractor_address: formData.generalContractorAddress || null,
                lender_name: formData.lenderName || null,
                lender_address: formData.lenderAddress || null,
                description: formData.description || null,
                is_default: false,
              };

              const { error } = await supabase
                .from('project_templates')
                .insert([templateData]);

              if (error) throw error;
              
              Alert.alert('Success', 'Template saved successfully');
              fetchTemplates();
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'Failed to save template';
              Alert.alert('Error', message);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleSaveProject = async () => {
    if (!validateSignature()) {
      Alert.alert('Signature Required', 'Please sign before saving your project.');
      return;
    }

    setLoading(true);
    try {
      const projectData = {
        user_id: user?.id,
        project_name: formData.projectName,
        state: formData.state,
        status: 'draft' as const,
        deadline: deadline?.toISOString() || null,
        job_start_date: formData.jobStartDate.toISOString(),
        property_address: formData.propertyAddress,
        property_owner_name: formData.propertyOwnerName,
        property_owner_address: formData.propertyOwnerAddress,
        general_contractor_name: formData.generalContractorName || null,
        general_contractor_address: formData.generalContractorAddress || null,
        lender_name: formData.lenderName || null,
        lender_address: formData.lenderAddress || null,
        description: formData.description,
        contract_amount: parseFloat(formData.contractAmount.replace(/[^0-9.]/g, '')) || 0,
        notice_required: noticeRequired,
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();
        
      if (error) throw error;

      // Schedule reminders if enabled and notice is required
      if (formData.enableReminders && noticeRequired && data) {
        const project: Project = {
          ...data,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };
        
        await scheduleDeadlineReminders(project);
        await refreshReminders();
      }

      Alert.alert(
        'Project Created', 
        formData.enableReminders && noticeRequired 
          ? 'Your project has been saved and deadline reminders have been scheduled.'
          : 'Your project has been saved.',
        [{ text: 'OK', onPress: () => router.replace('/(app)/dashboard') }]
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save project';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const renderTemplateSelector = () => (
    <View style={styles.templateSelector}>
      <View style={styles.templateSelectorHeader}>
        <View style={styles.templateSelectorLeft}>
          <Ionicons name="copy" size={20} color={colors.primary} />
          <Text style={styles.templateSelectorTitle}>Template</Text>
        </View>
        {selectedTemplate ? (
          <View style={styles.templateSelectorActions}>
            <TouchableOpacity 
              style={styles.templateBadge}
              onPress={() => setShowTemplatePicker(true)}
            >
              <Text style={styles.templateBadgeText} numberOfLines={1}>
                {selectedTemplate.template_name}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearTemplate} style={styles.clearTemplateButton}>
              <Ionicons name="close-circle" size={20} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.selectTemplateButton}
            onPress={() => setShowTemplatePicker(true)}
          >
            <Text style={styles.selectTemplateText}>
              {templates.length > 0 ? 'Select Template' : 'No Templates'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {templates.length === 0 && (
        <Text style={styles.templateHint}>
          Create templates in Settings to speed up project creation
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {step} of 3</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <>
              {/* Template Selector */}
              {renderTemplateSelector()}

              <Input label="Project Name" placeholder="e.g., Smith Residence" value={formData.projectName}
                onChangeText={(text) => updateFormData('projectName', text)} leftIcon="folder-outline" error={errors.projectName} required />

              <Text style={styles.inputLabel}>State <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={[styles.selectButton, errors.state && styles.selectButtonError]} onPress={() => setShowStatePicker(true)}>
                <Ionicons name="location-outline" size={20} color={colors.gray400} />
                <Text style={[styles.selectButtonText, !formData.state && styles.selectButtonPlaceholder]}>
                  {formData.state || 'Select a state'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.gray400} />
              </TouchableOpacity>
              {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}

              {formData.state && (
                <View style={[styles.noticeBanner, noticeRequired ? styles.noticeBannerWarning : styles.noticeBannerSuccess]}>
                  <Ionicons name={noticeRequired ? 'alert-circle' : 'checkmark-circle'} size={24} color={noticeRequired ? colors.warning : colors.success} />
                  <View style={styles.noticeBannerContent}>
                    <Text style={[styles.noticeBannerTitle, !noticeRequired && { color: colors.success }]}>
                      {noticeRequired ? 'Preliminary Notice REQUIRED' : 'No Notice Required'}
                    </Text>
                    <Text style={styles.noticeBannerText}>
                      {noticeRequired ? `Send within ${deadlineDays} days to preserve lien rights.` : 'Lien rights preserved automatically.'}
                    </Text>
                  </View>
                </View>
              )}

              <Modal visible={showStatePicker} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select State</Text>
                    <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                      <Ionicons name="close" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  <FlatList data={US_STATES} keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={[styles.stateItem, formData.state === item && styles.stateItemSelected]}
                        onPress={() => { updateFormData('state', item); setShowStatePicker(false); }}>
                        <Text style={[styles.stateItemText, formData.state === item && styles.stateItemTextSelected]}>{item}</Text>
                        {formData.state === item && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    )}
                  />
                </SafeAreaView>
              </Modal>

              {/* Template Picker Modal */}
              <Modal visible={showTemplatePicker} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Template</Text>
                    <TouchableOpacity onPress={() => setShowTemplatePicker(false)}>
                      <Ionicons name="close" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  {templates.length === 0 ? (
                    <View style={styles.emptyTemplates}>
                      <Ionicons name="documents-outline" size={48} color={colors.gray300} />
                      <Text style={styles.emptyTemplatesTitle}>No Templates</Text>
                      <Text style={styles.emptyTemplatesText}>
                        Create templates from the Templates screen to quickly fill in project details.
                      </Text>
                      <Button 
                        title="Go to Templates" 
                        variant="outline"
                        onPress={() => {
                          setShowTemplatePicker(false);
                          router.push('/(app)/templates');
                        }}
                        style={styles.goToTemplatesButton}
                      />
                    </View>
                  ) : (
                    <FlatList 
                      data={templates} 
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={[
                            styles.templateItem, 
                            selectedTemplate?.id === item.id && styles.templateItemSelected
                          ]}
                          onPress={() => { 
                            applyTemplate(item); 
                            setShowTemplatePicker(false); 
                          }}
                        >
                          <View style={styles.templateItemContent}>
                            <View style={styles.templateItemHeader}>
                              <Text style={styles.templateItemName}>{item.template_name}</Text>
                              {item.is_default && (
                                <View style={styles.defaultBadge}>
                                  <Text style={styles.defaultBadgeText}>Default</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.templateItemDetails}>
                              {item.state && (
                                <Text style={styles.templateItemDetail}>
                                  <Ionicons name="location-outline" size={12} color={colors.gray500} /> {item.state}
                                </Text>
                              )}
                              {item.general_contractor_name && (
                                <Text style={styles.templateItemDetail} numberOfLines={1}>
                                  <Ionicons name="construct-outline" size={12} color={colors.gray500} /> {item.general_contractor_name}
                                </Text>
                              )}
                            </View>
                          </View>
                          {selectedTemplate?.id === item.id && (
                            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </SafeAreaView>
              </Modal>
            </>
          )}

          {step === 2 && (
            <>
              <DatePicker label="Job Start Date" value={formData.jobStartDate} onChange={(date) => updateFormData('jobStartDate', date)} required />
              
              {deadline && noticeRequired && (
                <View style={styles.deadlineBox}>
                  <Ionicons name="time-outline" size={20} color={colors.error} />
                  <Text style={styles.deadlineText}>Deadline: <Text style={styles.deadlineDate}>{deadline.toLocaleDateString()}</Text></Text>
                </View>
              )}

              {/* Property Address with Location Button */}
              <View style={styles.addressInputContainer}>
                <View style={styles.addressInputWrapper}>
                  <Input 
                    label="Property Address" 
                    placeholder="123 Main St, City, State ZIP" 
                    value={formData.propertyAddress}
                    onChangeText={(text) => updateFormData('propertyAddress', text)} 
                    leftIcon="home-outline" 
                    error={errors.propertyAddress} 
                    required 
                  />
                </View>
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={handleUseCurrentLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={18} color={colors.primary} />
                      <Text style={styles.locationButtonText}>Use GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Input label="Property Owner Name" placeholder="John Smith" value={formData.propertyOwnerName}
                onChangeText={(text) => updateFormData('propertyOwnerName', text)} leftIcon="person-outline" error={errors.propertyOwnerName} required />
              <Input label="Owner Mailing Address" placeholder="456 Oak Ave" value={formData.propertyOwnerAddress}
                onChangeText={(text) => updateFormData('propertyOwnerAddress', text)} leftIcon="mail-outline" error={errors.propertyOwnerAddress} required />
              <Input label="General Contractor (optional)" placeholder="ABC Construction" value={formData.generalContractorName}
                onChangeText={(text) => updateFormData('generalContractorName', text)} leftIcon="construct-outline" />
              {formData.generalContractorName && (
                <Input label="GC Address" placeholder="789 Builder Blvd" value={formData.generalContractorAddress}
                  onChangeText={(text) => updateFormData('generalContractorAddress', text)} leftIcon="location-outline" />
              )}
              <Input label="Lender (optional)" placeholder="First National Bank" value={formData.lenderName}
                onChangeText={(text) => updateFormData('lenderName', text)} leftIcon="business-outline" />
              {formData.lenderName && (
                <Input label="Lender Address" placeholder="321 Finance Ave" value={formData.lenderAddress}
                  onChangeText={(text) => updateFormData('lenderAddress', text)} leftIcon="location-outline" />
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Input label="Description of Work" placeholder="Describe labor/materials..." value={formData.description}
                onChangeText={(text) => updateFormData('description', text)} leftIcon="document-text-outline" error={errors.description} multiline required />
              <Input label="Contract Amount" placeholder="$0.00" value={formData.contractAmount}
                onChangeText={(text) => updateFormData('contractAmount', text.replace(/[^0-9.]/g, ''))}
                leftIcon="cash-outline" keyboardType="numeric" error={errors.contractAmount} required />

              <Input
                label="Signature"
                placeholder="Type your full name to sign"
                value={formData.signature}
                onChangeText={(text) => updateFormData('signature', text)}
                leftIcon="create-outline"
                error={errors.signature}
                required
              />

              {/* Reminder Toggle */}
              {noticeRequired && (
                <TouchableOpacity 
                  style={styles.reminderToggle}
                  onPress={() => updateFormData('enableReminders', !formData.enableReminders)}
                >
                  <View style={styles.reminderToggleLeft}>
                    <Ionicons 
                      name={formData.enableReminders ? 'notifications' : 'notifications-outline'} 
                      size={24} 
                      color={formData.enableReminders ? colors.primary : colors.gray400} 
                    />
                    <View style={styles.reminderToggleText}>
                      <Text style={styles.reminderToggleTitle}>Deadline Reminders</Text>
                      <Text style={styles.reminderToggleSubtitle}>
                        Get notified 7, 3, and 1 day before deadline
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.checkbox,
                    formData.enableReminders && styles.checkboxChecked
                  ]}>
                    {formData.enableReminders && (
                      <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Save as Template Button */}
              <TouchableOpacity 
                style={styles.saveTemplateButton}
                onPress={handleSaveAsTemplate}
              >
                <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
                <Text style={styles.saveTemplateText}>Save as Template</Text>
              </TouchableOpacity>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <Text style={styles.summaryText}>Project: {formData.projectName}</Text>
                <Text style={styles.summaryText}>State: {formData.state}</Text>
                <Text style={styles.summaryText}>Start: {formData.jobStartDate.toLocaleDateString()}</Text>
                {deadline && <Text style={[styles.summaryText, { color: colors.error }]}>Deadline: {deadline.toLocaleDateString()}</Text>}
                <Text style={styles.summaryText}>Amount: ${parseFloat(formData.contractAmount || '0').toLocaleString()}</Text>
                {noticeRequired && (
                  <Text style={[styles.summaryText, { color: formData.enableReminders ? colors.success : colors.gray400 }]}>
                    Reminders: {formData.enableReminders ? 'Enabled' : 'Disabled'}
                  </Text>
                )}
                {selectedTemplate && (
                  <Text style={[styles.summaryText, { color: colors.primary }]}>
                    Template: {selectedTemplate.template_name}
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Button title="Back" onPress={handleBack} variant="outline" style={styles.backButton} />
          {step < 3 ? (
            <Button title="Next" onPress={handleNext} style={styles.nextButton} />
          ) : (
            <Button title="Save Project" onPress={handleSaveProject} loading={loading} style={styles.nextButton} />
          )}
        </View>
      </KeyboardAvoidingView>
      <DisclaimerFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  progressContainer: { padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  progressBar: { height: 4, backgroundColor: colors.gray200, borderRadius: 2, marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  progressText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
  scrollContent: { padding: spacing.lg },
  inputLabel: { ...typography.bodySmall, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.xs },
  required: { color: colors.error },
  selectButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.gray300, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  selectButtonError: { borderColor: colors.error },
  selectButtonText: { ...typography.body, color: colors.textPrimary, flex: 1, marginLeft: spacing.sm },
  selectButtonPlaceholder: { color: colors.gray400 },
  errorText: { ...typography.caption, color: colors.error, marginTop: -spacing.sm, marginBottom: spacing.md },
  noticeBanner: { flexDirection: 'row', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md },
  noticeBannerWarning: { backgroundColor: colors.warningLight },
  noticeBannerSuccess: { backgroundColor: colors.successLight },
  noticeBannerContent: { flex: 1, marginLeft: spacing.sm },
  noticeBannerTitle: { ...typography.body, fontWeight: '600', color: colors.warning, marginBottom: spacing.xs },
  noticeBannerText: { ...typography.bodySmall, color: colors.textSecondary },
  deadlineBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorLight, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md },
  deadlineText: { ...typography.body, color: colors.textPrimary, marginLeft: spacing.sm },
  deadlineDate: { fontWeight: '700', color: colors.error },
  
  // Location button styles
  addressInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  addressInputWrapper: { 
    flex: 1,
    marginBottom: 0,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginLeft: spacing.sm,
    marginTop: 28, // Align with input field
    minWidth: 90,
    height: 48,
  },
  locationButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  reminderToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderToggleText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  reminderToggleTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reminderToggleSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  summaryCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginTop: spacing.md, ...shadows.md },
  summaryTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  summaryText: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xs },
  buttonContainer: { flexDirection: 'row', padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.gray100 },
  backButton: { flex: 1, marginRight: spacing.sm },
  nextButton: { flex: 2 },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  stateItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  stateItemSelected: { backgroundColor: colors.primaryLight + '10' },
  stateItemText: { ...typography.body, color: colors.textPrimary },
  stateItemTextSelected: { color: colors.primary, fontWeight: '600' },
  // Template Selector Styles
  templateSelector: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  templateSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  templateSelectorTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  templateSelectorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  templateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    maxWidth: 150,
    gap: spacing.xs,
  },
  templateBadgeText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  clearTemplateButton: {
    padding: spacing.xs,
  },
  selectTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectTemplateText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  templateHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  // Template Picker Modal Styles
  emptyTemplates: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTemplatesTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyTemplatesText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  goToTemplatesButton: {
    minWidth: 180,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  templateItemSelected: {
    backgroundColor: colors.primaryLight + '10',
  },
  templateItemContent: {
    flex: 1,
  },
  templateItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  templateItemName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  defaultBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  defaultBadgeText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  templateItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  templateItemDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  saveTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  saveTemplateText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
  },
});
