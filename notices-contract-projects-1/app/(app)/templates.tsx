import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ProjectTemplate, US_STATES } from '../../lib/supabase';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';

interface TemplateFormData {
  template_name: string;
  state: string;
  general_contractor_name: string;
  general_contractor_address: string;
  lender_name: string;
  lender_address: string;
  description: string;
  is_default: boolean;
}

const initialFormData: TemplateFormData = {
  template_name: '',
  state: '',
  general_contractor_name: '',
  general_contractor_address: '',
  lender_name: '',
  lender_address: '',
  description: '',
  is_default: false,
};

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

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
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (template: ProjectTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      state: template.state || '',
      general_contractor_name: template.general_contractor_name || '',
      general_contractor_address: template.general_contractor_address || '',
      lender_name: template.lender_name || '',
      lender_address: template.lender_address || '',
      description: template.description || '',
      is_default: template.is_default,
    });
    setShowModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!formData.template_name.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from('project_templates')
          .update({ is_default: false })
          .eq('user_id', user?.id);
      }

      const templateData = {
        user_id: user?.id,
        template_name: formData.template_name.trim(),
        state: formData.state || null,
        general_contractor_name: formData.general_contractor_name.trim() || null,
        general_contractor_address: formData.general_contractor_address.trim() || null,
        lender_name: formData.lender_name.trim() || null,
        lender_address: formData.lender_address.trim() || null,
        description: formData.description.trim() || null,
        is_default: formData.is_default,
        updated_at: new Date().toISOString(),
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('project_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        Alert.alert('Success', 'Template updated successfully');
      } else {
        const { error } = await supabase
          .from('project_templates')
          .insert([templateData]);

        if (error) throw error;
        Alert.alert('Success', 'Template created successfully');
      }

      setShowModal(false);
      fetchTemplates();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = (template: ProjectTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.template_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('project_templates')
                .delete()
                .eq('id', template.id);

              if (error) throw error;
              fetchTemplates();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (template: ProjectTemplate) => {
    try {
      // Unset all defaults first
      await supabase
        .from('project_templates')
        .update({ is_default: false })
        .eq('user_id', user?.id);

      // Set this one as default
      await supabase
        .from('project_templates')
        .update({ is_default: true })
        .eq('id', template.id);

      fetchTemplates();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to set default template');
    }
  };

  const renderTemplateCard = (template: ProjectTemplate) => (
    <View key={template.id} style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <View style={styles.templateTitleRow}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
          <Text style={styles.templateName}>{template.template_name}</Text>
          {template.is_default && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <View style={styles.templateActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(template)}
          >
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteTemplate(template)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.templateDetails}>
        {template.state && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.gray500} />
            <Text style={styles.detailText}>{template.state}</Text>
          </View>
        )}
        {template.general_contractor_name && (
          <View style={styles.detailRow}>
            <Ionicons name="construct-outline" size={16} color={colors.gray500} />
            <Text style={styles.detailText} numberOfLines={1}>
              GC: {template.general_contractor_name}
            </Text>
          </View>
        )}
        {template.lender_name && (
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={16} color={colors.gray500} />
            <Text style={styles.detailText} numberOfLines={1}>
              Lender: {template.lender_name}
            </Text>
          </View>
        )}
        {template.description && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={16} color={colors.gray500} />
            <Text style={styles.detailText} numberOfLines={2}>
              {template.description}
            </Text>
          </View>
        )}
      </View>

      {!template.is_default && (
        <TouchableOpacity
          style={styles.setDefaultButton}
          onPress={() => handleSetDefault(template)}
        >
          <Ionicons name="star-outline" size={16} color={colors.primary} />
          <Text style={styles.setDefaultText}>Set as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerIcon}>
            <Ionicons name="copy" size={32} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Project Templates</Text>
          <Text style={styles.headerSubtitle}>
            Save frequently used project configurations to speed up data entry
          </Text>
        </View>

        {/* Templates List */}
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="documents-outline" size={64} color={colors.gray300} />
            <Text style={styles.emptyTitle}>No Templates Yet</Text>
            <Text style={styles.emptyText}>
              Create templates for common contractors, lenders, or work descriptions
              to save time when creating new projects.
            </Text>
            <Button
              title="Create First Template"
              onPress={openCreateModal}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <View style={styles.templatesContainer}>
            {templates.map(renderTemplateCard)}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {templates.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </TouchableOpacity>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Input
              label="Template Name"
              placeholder="e.g., ABC Construction Projects"
              value={formData.template_name}
              onChangeText={(text) => setFormData({ ...formData, template_name: text })}
              leftIcon="bookmark-outline"
              required
            />

            <Text style={styles.inputLabel}>State (optional)</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowStatePicker(true)}
            >
              <Ionicons name="location-outline" size={20} color={colors.gray400} />
              <Text
                style={[
                  styles.selectButtonText,
                  !formData.state && styles.selectButtonPlaceholder,
                ]}
              >
                {formData.state || 'Select a state'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.gray400} />
            </TouchableOpacity>

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>General Contractor</Text>
            </View>

            <Input
              label="Contractor Name"
              placeholder="ABC Construction"
              value={formData.general_contractor_name}
              onChangeText={(text) =>
                setFormData({ ...formData, general_contractor_name: text })
              }
              leftIcon="construct-outline"
            />

            <Input
              label="Contractor Address"
              placeholder="123 Builder St, City, State ZIP"
              value={formData.general_contractor_address}
              onChangeText={(text) =>
                setFormData({ ...formData, general_contractor_address: text })
              }
              leftIcon="location-outline"
            />

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Lender</Text>
            </View>

            <Input
              label="Lender Name"
              placeholder="First National Bank"
              value={formData.lender_name}
              onChangeText={(text) => setFormData({ ...formData, lender_name: text })}
              leftIcon="business-outline"
            />

            <Input
              label="Lender Address"
              placeholder="456 Finance Ave, City, State ZIP"
              value={formData.lender_address}
              onChangeText={(text) =>
                setFormData({ ...formData, lender_address: text })
              }
              leftIcon="location-outline"
            />

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Work Description</Text>
            </View>

            <Input
              label="Description of Work"
              placeholder="Labor and materials for..."
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              leftIcon="document-text-outline"
              multiline
            />

            <TouchableOpacity
              style={styles.defaultToggle}
              onPress={() =>
                setFormData({ ...formData, is_default: !formData.is_default })
              }
            >
              <View style={styles.defaultToggleLeft}>
                <Ionicons
                  name={formData.is_default ? 'star' : 'star-outline'}
                  size={24}
                  color={formData.is_default ? colors.warning : colors.gray400}
                />
                <View style={styles.defaultToggleText}>
                  <Text style={styles.defaultToggleTitle}>Set as Default</Text>
                  <Text style={styles.defaultToggleSubtitle}>
                    Auto-fill new projects with this template
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.checkbox,
                  formData.is_default && styles.checkboxChecked,
                ]}
              >
                {formData.is_default && (
                  <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                )}
              </View>
            </TouchableOpacity>

            <Button
              title={editingTemplate ? 'Update Template' : 'Save Template'}
              onPress={handleSaveTemplate}
              loading={saving}
              style={styles.saveButton}
            />
          </ScrollView>
        </SafeAreaView>

        {/* State Picker Modal */}
        <Modal
          visible={showStatePicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.clearStateButton}
              onPress={() => {
                setFormData({ ...formData, state: '' });
                setShowStatePicker(false);
              }}
            >
              <Text style={styles.clearStateText}>Clear Selection</Text>
            </TouchableOpacity>
            <FlatList
              data={US_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.stateItem,
                    formData.state === item && styles.stateItemSelected,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, state: item });
                    setShowStatePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.stateItemText,
                      formData.state === item && styles.stateItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {formData.state === item && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>
      </Modal>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  emptyButton: {
    minWidth: 200,
  },
  templatesContainer: {
    gap: spacing.md,
  },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    marginBottom: spacing.md,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  defaultBadgeText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  templateActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  setDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: spacing.xs,
  },
  setDefaultText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
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
    backgroundColor: colors.surface,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  inputLabel: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  selectButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  selectButtonPlaceholder: {
    color: colors.gray400,
  },
  sectionDivider: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  defaultToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  defaultToggleText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  defaultToggleTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  defaultToggleSubtitle: {
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
  saveButton: {
    marginTop: spacing.md,
  },
  clearStateButton: {
    padding: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  clearStateText: {
    ...typography.body,
    color: colors.error,
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  stateItemSelected: {
    backgroundColor: colors.primaryLight + '10',
  },
  stateItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  stateItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
