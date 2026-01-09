import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  getAllScheduledNotifications, 
  cancelAllNotifications,
  getAllReminders,
  ScheduledReminder,
  formatTimeUntilDeadline
} from '../../lib/notifications';
import Button from '../../components/Button';

export default function NotificationsScreen() {
  const { 
    permissionStatus, 
    requestPermissions, 
    pushTokenRegistered,
    registerForPush,
    refreshReminders,
    reminders
  } = useNotifications();
  
  const [scheduledCount, setScheduledCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadScheduledCount();
  }, [reminders]);

  const loadScheduledCount = async () => {
    const notifications = await getAllScheduledNotifications();
    setScheduledCount(notifications.length);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshReminders();
    await loadScheduledCount();
    setRefreshing(false);
  };

  const handleEnableNotifications = async () => {
    if (permissionStatus === 'denied') {
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }
    } else {
      await requestPermissions();
    }
  };

  const handleCancelAllReminders = () => {
    Alert.alert(
      'Cancel All Reminders',
      'Are you sure you want to cancel all scheduled deadline reminders? You can re-enable them from individual project pages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Cancel All',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            await refreshReminders();
            await loadScheduledCount();
            Alert.alert('Success', 'All reminders have been cancelled.');
          },
        },
      ]
    );
  };

  const handleRegisterPush = async () => {
    const success = await registerForPush();
    if (success) {
      Alert.alert('Success', 'Push notifications have been enabled for this device.');
    } else {
      Alert.alert('Error', 'Failed to register for push notifications. Make sure you are using a development build.');
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Disabled';
      case 'undetermined':
        return 'Not Set';
      default:
        return 'Loading...';
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return colors.success;
      case 'denied':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Permission Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Permissions</Text>
          
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Ionicons 
                  name={permissionStatus === 'granted' ? 'notifications' : 'notifications-off'} 
                  size={24} 
                  color={getPermissionStatusColor()} 
                />
                <View style={styles.statusText}>
                  <Text style={styles.statusLabel}>Notification Status</Text>
                  <Text style={[styles.statusValue, { color: getPermissionStatusColor() }]}>
                    {getPermissionStatusText()}
                  </Text>
                </View>
              </View>
              
              {permissionStatus !== 'granted' && (
                <TouchableOpacity 
                  style={styles.enableButton}
                  onPress={handleEnableNotifications}
                >
                  <Text style={styles.enableButtonText}>
                    {permissionStatus === 'denied' ? 'Settings' : 'Enable'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.statusDescription}>
              {permissionStatus === 'granted'
                ? 'You will receive deadline reminders 7, 3, and 1 day before your preliminary notice deadlines.'
                : permissionStatus === 'denied'
                ? 'Notifications are disabled. Open Settings to enable them and never miss a deadline.'
                : 'Enable notifications to receive deadline reminders and protect your lien rights.'}
            </Text>
          </View>
        </View>

        {/* Scheduled Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scheduled Reminders</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{reminders.length}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{scheduledCount}</Text>
              <Text style={styles.statLabel}>Reminders</Text>
            </View>
          </View>

          {reminders.length > 0 ? (
            <View style={styles.remindersList}>
              {reminders.map((reminder) => (
                <ReminderItem key={reminder.id} reminder={reminder} />
              ))}
              
              <TouchableOpacity 
                style={styles.cancelAllButton}
                onPress={handleCancelAllReminders}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.cancelAllText}>Cancel All Reminders</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.gray300} />
              <Text style={styles.emptyTitle}>No Reminders Scheduled</Text>
              <Text style={styles.emptyText}>
                Enable reminders from your project pages to get notified before deadlines.
              </Text>
            </View>
          )}
        </View>

        {/* Push Notifications (Phase 2) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Text style={styles.sectionSubtitle}>Phase 2 - Development Build Required</Text>
          
          <View style={styles.pushCard}>
            <View style={styles.pushInfo}>
              <Ionicons 
                name={pushTokenRegistered ? 'cloud-done' : 'cloud-outline'} 
                size={24} 
                color={pushTokenRegistered ? colors.success : colors.gray400} 
              />
              <View style={styles.pushText}>
                <Text style={styles.pushLabel}>Push Token</Text>
                <Text style={styles.pushValue}>
                  {pushTokenRegistered ? 'Registered' : 'Not Registered'}
                </Text>
              </View>
            </View>
            
            {!pushTokenRegistered && permissionStatus === 'granted' && (
              <Button
                title="Register"
                onPress={handleRegisterPush}
                size="sm"
                variant="outline"
              />
            )}
          </View>
          
          <Text style={styles.pushDescription}>
            Push notifications allow the server to send you reminders even when the app is closed. 
            This feature requires a development build using EAS Build.
          </Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Local reminders are scheduled on your device and will be delivered even without an internet connection. 
            Push notifications require a backend server and are useful for team-wide alerts.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReminderItem({ reminder }: { reminder: ScheduledReminder }) {
  const scheduledCount = Object.values(reminder.notificationIds).filter(Boolean).length;
  
  return (
    <View style={styles.reminderItem}>
      <View style={styles.reminderIcon}>
        <Ionicons name="document-text" size={20} color={colors.primary} />
      </View>
      <View style={styles.reminderContent}>
        <Text style={styles.reminderName} numberOfLines={1}>
          {reminder.projectName}
        </Text>
        <Text style={styles.reminderDeadline}>
          {formatTimeUntilDeadline(reminder.deadline)} • {scheduledCount} reminder{scheduledCount !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.reminderBadge}>
        <Ionicons name="notifications" size={14} color={colors.success} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: spacing.md,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusValue: {
    ...typography.body,
    fontWeight: '600',
  },
  statusDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  enableButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  enableButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textInverse,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statNumber: {
    ...typography.h2,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  remindersList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  reminderContent: {
    flex: 1,
  },
  reminderName: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  reminderDeadline: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  reminderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  cancelAllText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pushCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  pushInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pushText: {
    marginLeft: spacing.md,
  },
  pushLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pushValue: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  pushDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    ...typography.caption,
    color: colors.info,
    lineHeight: 18,
  },
});
