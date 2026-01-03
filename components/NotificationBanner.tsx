import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { useNotifications } from '../contexts/NotificationContext';

interface NotificationBannerProps {
  onDismiss?: () => void;
}

export default function NotificationBanner({ onDismiss }: NotificationBannerProps) {
  const { permissionStatus, requestPermissions } = useNotifications();

  const handleEnableNotifications = async () => {
    if (Platform.OS === 'web') {
      // Web cannot open system settings; inform user
      return;
    }

    if (permissionStatus === 'denied') {
      // If denied, open settings
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }
    } else {
      await requestPermissions();
    }
  };

  // Don't show if already granted or still loading
  if (permissionStatus === 'granted' || permissionStatus === 'loading') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="notifications" size={24} color={colors.warning} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>
          {permissionStatus === 'denied' 
            ? 'Notifications Disabled' 
            : 'Enable Deadline Reminders'}
        </Text>
        <Text style={styles.description}>
          {permissionStatus === 'denied'
            ? 'Open settings to enable notifications and never miss a filing deadline.'
            : 'Get reminders 7, 3, and 1 day before your preliminary notice deadlines.'}
        </Text>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.enableButton}
            onPress={handleEnableNotifications}
          >
            <Text style={styles.enableButtonText}>
              {permissionStatus === 'denied' ? 'Open Settings' : 'Enable'}
            </Text>
          </TouchableOpacity>
          
          {onDismiss && (
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>Not Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {onDismiss && (
        <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
          <Ionicons name="close" size={20} color={colors.gray400} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  enableButton: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  enableButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textInverse,
  },
  dismissButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  dismissButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
