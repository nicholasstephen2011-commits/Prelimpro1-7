import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Project } from '../../lib/supabase';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Button from '../../components/Button';
import { exportCSV, exportPDFReport, exportSingleProjectPDF } from '../../lib/exportUtils';

type ExportFormat = 'csv' | 'pdf';
type ExportScope = 'single' | 'selected' | 'all';

export default function ExportScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string }>();

  useEffect(() => {
    // If a specific project ID is passed, set scope to single
    if (params.projectId) {
      setExportScope('single');
      setSelectedIds(new Set([params.projectId]));
    }
  }, [params.projectId]);

  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [user])
  );

  const toggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedIds(newSelected);
    
    // Auto-switch to selected scope when selecting projects
    if (newSelected.size > 0 && exportScope === 'all') {
      setExportScope('selected');
    }
  };

  const selectAll = () => {
    setSelectedIds(new Set(projects.map(p => p.id)));
    setExportScope('selected');
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setExportScope('all');
  };

  const getProjectsToExport = (): Project[] => {
    switch (exportScope) {
      case 'single':
        if (params.projectId) {
          return projects.filter(p => p.id === params.projectId);
        }
        return selectedIds.size === 1 
          ? projects.filter(p => selectedIds.has(p.id))
          : [];
      case 'selected':
        return projects.filter(p => selectedIds.has(p.id));
      case 'all':
      default:
        return projects;
    }
  };

  const handleExport = async () => {
    const projectsToExport = getProjectsToExport();
    
    if (projectsToExport.length === 0) {
      Alert.alert('No Projects', 'Please select at least one project to export.');
      return;
    }

    setExporting(true);
    
    try {
      let result;
      
      if (exportFormat === 'csv') {
        result = await exportCSV(projectsToExport);
      } else {
        // PDF export
        if (exportScope === 'single' && projectsToExport.length === 1) {
          result = await exportSingleProjectPDF(projectsToExport[0]);
        } else {
          const title = exportScope === 'all' 
            ? 'All Projects Report' 
            : `Selected Projects Report (${projectsToExport.length})`;
          result = await exportPDFReport(projectsToExport, title);
        }
      }
      
      if (result.success) {
        Alert.alert(
          'Export Successful',
          `Your ${exportFormat.toUpperCase()} file has been created and shared.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Export Failed', result.error || 'An error occurred during export.');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'An unexpected error occurred.');
    } finally {
      setExporting(false);
    }
  };

  const projectsToExport = getProjectsToExport();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Export Format Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Format</Text>
          <View style={styles.formatOptions}>
            <TouchableOpacity
              style={[
                styles.formatOption,
                exportFormat === 'pdf' && styles.formatOptionSelected
              ]}
              onPress={() => setExportFormat('pdf')}
            >
              <View style={[
                styles.formatIcon,
                exportFormat === 'pdf' && styles.formatIconSelected
              ]}>
                <Ionicons 
                  name="document-text" 
                  size={28} 
                  color={exportFormat === 'pdf' ? colors.primary : colors.gray400} 
                />
              </View>
              <Text style={[
                styles.formatLabel,
                exportFormat === 'pdf' && styles.formatLabelSelected
              ]}>PDF Report</Text>
              <Text style={styles.formatDescription}>
                Professional formatted report with all project details
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.formatOption,
                exportFormat === 'csv' && styles.formatOptionSelected
              ]}
              onPress={() => setExportFormat('csv')}
            >
              <View style={[
                styles.formatIcon,
                exportFormat === 'csv' && styles.formatIconSelected
              ]}>
                <Ionicons 
                  name="grid" 
                  size={28} 
                  color={exportFormat === 'csv' ? colors.primary : colors.gray400} 
                />
              </View>
              <Text style={[
                styles.formatLabel,
                exportFormat === 'csv' && styles.formatLabelSelected
              ]}>CSV Spreadsheet</Text>
              <Text style={styles.formatDescription}>
                Data file for Excel, Google Sheets, or other apps
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Export Scope Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Scope</Text>
          <View style={styles.scopeOptions}>
            {params.projectId && (
              <TouchableOpacity
                style={[
                  styles.scopeOption,
                  exportScope === 'single' && styles.scopeOptionSelected
                ]}
                onPress={() => setExportScope('single')}
              >
                <View style={styles.scopeRadio}>
                  {exportScope === 'single' && <View style={styles.scopeRadioInner} />}
                </View>
                <View style={styles.scopeContent}>
                  <Text style={styles.scopeLabel}>Single Project</Text>
                  <Text style={styles.scopeDescription}>
                    Export the current project only
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.scopeOption,
                exportScope === 'selected' && styles.scopeOptionSelected
              ]}
              onPress={() => setExportScope('selected')}
            >
              <View style={styles.scopeRadio}>
                {exportScope === 'selected' && <View style={styles.scopeRadioInner} />}
              </View>
              <View style={styles.scopeContent}>
                <Text style={styles.scopeLabel}>Selected Projects</Text>
                <Text style={styles.scopeDescription}>
                  {selectedIds.size} project{selectedIds.size !== 1 ? 's' : ''} selected
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.scopeOption,
                exportScope === 'all' && styles.scopeOptionSelected
              ]}
              onPress={() => setExportScope('all')}
            >
              <View style={styles.scopeRadio}>
                {exportScope === 'all' && <View style={styles.scopeRadioInner} />}
              </View>
              <View style={styles.scopeContent}>
                <Text style={styles.scopeLabel}>All Projects</Text>
                <Text style={styles.scopeDescription}>
                  Export all {projects.length} project{projects.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Project Selection */}
        {exportScope === 'selected' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Projects</Text>
              <View style={styles.selectionActions}>
                <TouchableOpacity onPress={selectAll} style={styles.selectionButton}>
                  <Text style={styles.selectionButtonText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={deselectAll} style={styles.selectionButton}>
                  <Text style={styles.selectionButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {projects.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color={colors.gray300} />
                <Text style={styles.emptyText}>No projects available</Text>
              </View>
            ) : (
              <View style={styles.projectList}>
                {projects.map((project) => (
                  <TouchableOpacity
                    key={project.id}
                    style={[
                      styles.projectItem,
                      selectedIds.has(project.id) && styles.projectItemSelected
                    ]}
                    onPress={() => toggleProjectSelection(project.id)}
                  >
                    <View style={[
                      styles.checkbox,
                      selectedIds.has(project.id) && styles.checkboxSelected
                    ]}>
                      {selectedIds.has(project.id) && (
                        <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                      )}
                    </View>
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectName}>{project.project_name}</Text>
                      <Text style={styles.projectMeta}>
                        {project.state} • ${project.contract_amount.toLocaleString()} • {project.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Export Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.summaryTitle}>Export Summary</Text>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Format:</Text>
              <Text style={styles.summaryValue}>
                {exportFormat === 'pdf' ? 'PDF Report' : 'CSV Spreadsheet'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Projects:</Text>
              <Text style={styles.summaryValue}>
                {projectsToExport.length} project{projectsToExport.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {projectsToExport.length > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Value:</Text>
                <Text style={styles.summaryValue}>
                  ${projectsToExport.reduce((sum, p) => sum + p.contract_amount, 0).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Export Info */}
        <View style={styles.infoCard}>
          <Ionicons name="document-attach-outline" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            {exportFormat === 'pdf' 
              ? 'The PDF report will include project name, state, deadline, status, contract amount, property details, and all party information in a professional format.'
              : 'The CSV file can be opened in Excel, Google Sheets, or any spreadsheet application. All project fields will be included as columns.'}
          </Text>
        </View>

      </ScrollView>

      {/* Export Button */}
      <View style={styles.footer}>
        <Button
          title={exporting ? 'Exporting...' : `Export ${projectsToExport.length} Project${projectsToExport.length !== 1 ? 's' : ''}`}
          onPress={handleExport}
          disabled={exporting || projectsToExport.length === 0}
          loading={exporting}
          fullWidth
          size="lg"
        />
      </View>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectionButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  formatOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formatOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray200,
    ...shadows.sm,
  },
  formatOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  formatIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  formatIconSelected: {
    backgroundColor: colors.primaryLight + '30',
  },
  formatLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formatLabelSelected: {
    color: colors.primary,
  },
  formatDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scopeOptions: {
    gap: spacing.sm,
  },
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  scopeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  scopeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  scopeRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  scopeContent: {
    flex: 1,
  },
  scopeLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scopeDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  projectList: {
    gap: spacing.sm,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  projectItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  projectMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  summaryContent: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    ...shadows.lg,
  },
});
