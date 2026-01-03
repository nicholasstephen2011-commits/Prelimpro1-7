import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { 
  getProjectReminder, 
  scheduleDeadlineReminders, 
  cancelProjectReminders,
  ScheduledReminder 
} from '../lib/notifications';
import { Project } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';

interface ReminderStatusProps {
  project: Project;
  compact?: boolean;
  onReminderChange?: () => void;
}

export default function ReminderStatus({ project, compact = false, onReminderChange }: ReminderStatusProps) {
  const [reminder, setReminder] = useState<ScheduledReminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  
  const { permissionStatus, requestPermissions } = useNotifications();

  const loadReminder = React.useCallback(async () => {
    setLoading(true);
    const storedReminder = await getProjectReminder(project.id);
    setReminder(storedReminder);
    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    loadReminder();
  }, [loadReminder]);

  const handleToggleReminders = async () => {
    if (toggling) return;
    
    setToggling(true);
    
    try {
      if (reminder) {
        // Cancel existing reminders
        await cancelProjectReminders(project.id);
        setReminder(null);
      } else {
        // Check permission first
        if (permissionStatus !== 'granted') {
          const granted = await requestPermissions();
          if (!granted) {
            setToggling(false);
            return;
          }
        }
        
        // Schedule new reminders
        const newReminder = await scheduleDeadlineReminders(project);
        setReminder(newReminder);
      }
      
      onReminderChange?.();
    } catch (error) {
      console.error('Error toggling reminders:', error);
    } finally {
      setToggling(false);
    }
  };

  // Don't show for projects without deadlines or notice requirements
  if (!project.deadline || !project.notice_required) {
    return null;
  }

  // Check if deadline has passed
  const deadlineDate = new Date(project.deadline);
  if (deadlineDate < new Date()) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const hasReminders = !!reminder;
  const scheduledCount = reminder 
    ? Object.values(reminder.notificationIds).filter(Boolean).length 
    : 0;

  if (compact) {
    return (
      <TouchableOpacity 
        style={[
          styles.compactButton,
          hasReminders && styles.compactButtonActive
        ]}
        onPress={handleToggleReminders}
        disabled={toggling}
      >
        {toggling ? (
          <ActivityIndicator size="small" color={hasReminders ? colors.primary : colors.gray400} />
        ) : (
          <Ionicons 
            name={hasReminders ? 'notifications' : 'notifications-outline'} 
            size={18} 
            color={hasReminders ? colors.primary : colors.gray400} 
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={hasReminders ? 'notifications' : 'notifications-outline'} 
            size={20} 
            color={hasReminders ? colors.primary : colors.gray400} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Deadline Reminders</Text>
          <Text style={styles.subtitle}>
            {hasReminders 
              ? `${scheduledCount} reminder${scheduledCount !== 1 ? 's' : ''} scheduled`
              : 'No reminders set'}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.toggleButton, hasReminders && styles.toggleButtonActive]}
          onPress={handleToggleReminders}
          disabled={toggling}
        >
          {toggling ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Text style={styles.toggleButtonText}>
              {hasReminders ? 'Disable' : 'Enable'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      {hasReminders && reminder && (
        <View style={styles.reminderDetails}>
          {reminder.notificationIds.sevenDay && (
            <View style={styles.reminderItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.reminderItemText}>7 days before</Text>
            </View>
          )}
          {reminder.notificationIds.threeDay && (
            <View style={styles.reminderItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.reminderItemText}>3 days before</Text>
            </View>
          )}
          {reminder.notificationIds.oneDay && (
            <View style={styles.reminderItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.reminderItemText}>1 day before</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  containerCompact: {
    padding: spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  toggleButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.gray400,
  },
  toggleButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textInverse,
  },
  reminderDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  reminderItemText: {
    ...typography.caption,
    color: colors.success,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  compactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonActive: {
    backgroundColor: colors.primaryLight + '20',
  },
});
