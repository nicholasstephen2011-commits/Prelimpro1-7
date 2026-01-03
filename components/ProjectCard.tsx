import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { Project } from '../lib/supabase';
import { getProjectReminder } from '../lib/notifications';
import { ComplianceCompactBadge } from './ComplianceStatusBadge';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

const statusConfig = {
  draft: { label: 'Draft', color: colors.gray500, bg: colors.gray100, icon: 'document-outline' as const },
  pending: { label: 'Pending', color: colors.warning, bg: colors.warningLight, icon: 'time-outline' as const },
  sent: { label: 'Sent', color: colors.info, bg: colors.infoLight, icon: 'send-outline' as const },
  delivered: { label: 'Delivered', color: colors.success, bg: colors.successLight, icon: 'checkmark-circle-outline' as const },
  signed: { label: 'Signed', color: colors.success, bg: colors.successLight, icon: 'shield-checkmark-outline' as const },
};

export default function ProjectCard({ project, onPress }: ProjectCardProps) {
  const [hasReminders, setHasReminders] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const reminder = await getProjectReminder(project.id);
      if (cancelled) return;
      setHasReminders(Boolean(reminder));
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const status = statusConfig[project.status];
    const deadlineDate = project.deadline ? new Date(project.deadline) : null;
    const now = new Date();
    const isOverdue = deadlineDate && deadlineDate < now && project.status === 'draft';
    const daysUntilDeadline = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="folder-outline" size={20} color={colors.primary} />
          <Text style={styles.title} numberOfLines={1}>{project.project_name}</Text>
        </View>
        <View style={styles.headerRight}>
          {hasReminders && (
            <View style={styles.reminderIndicator}>
              <Ionicons name="notifications" size={14} color={colors.primary} />
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.gray400} />
          <Text style={styles.detailText}>{project.state}</Text>
        </View>
        
        {project.notice_required && deadlineDate && (
          <View style={styles.detailRow}>
            <Ionicons 
              name="calendar-outline" 
              size={16} 
              color={isOverdue ? colors.error : colors.gray400} 
            />
            <Text style={[styles.detailText, isOverdue && styles.overdueText]}>
              {isOverdue 
                ? `Overdue by ${Math.abs(daysUntilDeadline!)} days`
                : daysUntilDeadline === 0 
                  ? 'Due today'
                  : daysUntilDeadline === 1
                    ? 'Due tomorrow'
                    : `${daysUntilDeadline} days left`
              }
            </Text>
          </View>
        )}

        {!project.notice_required && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.detailText, { color: colors.success }]}>
              No notice required
            </Text>
          </View>
        )}
      </View>

      {/* Compliance Status Badge */}
      {project.notice_required && (
        <View style={styles.complianceRow}>
          <ComplianceCompactBadge projectId={project.id} />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.amount}>
          ${project.contract_amount.toLocaleString()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reminderIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    marginLeft: 4,
  },
  details: {
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  overdueText: {
    color: colors.error,
    fontWeight: '600',
  },
  complianceRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  amount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
