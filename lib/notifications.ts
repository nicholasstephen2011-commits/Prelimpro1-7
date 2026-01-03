import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, Project } from './supabase';

// Check if we're running on a native platform (not web)
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Conditionally import expo-notifications and expo-device only on native
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

const loadNativeModules = async () => {
  if (!isNative || (Notifications && Device)) {
    return { Notifications, Device };
  }

  try {
    const [notificationsModule, deviceModule] = await Promise.all([
      import('expo-notifications'),
      import('expo-device'),
    ]);
    Notifications = notificationsModule;
    Device = deviceModule;
  } catch (error) {
    console.warn('Failed to load native notification modules:', error);
    Notifications = null;
    Device = null;
  }

  return { Notifications, Device };
};

// Types
export interface ScheduledReminder {
  id: string;
  projectId: string;
  projectName: string;
  deadline: string;
  notificationIds: {
    sevenDay?: string;
    threeDay?: string;
    oneDay?: string;
  };
  createdAt: string;
}

export interface PushTokenInfo {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  updatedAt: string;
}

// Storage keys
const REMINDERS_STORAGE_KEY = '@prelimpro_reminders';
const PUSH_TOKEN_STORAGE_KEY = '@prelimpro_push_token';

// Configure notification handler - ONLY on native platforms
void loadNativeModules().then(({ Notifications }) => {
  if (isNative && Notifications) {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        }),
      });
    } catch (error) {
      console.warn('Failed to set notification handler:', error);
    }
  }
});

/**
 * Initialize notifications - request permissions and set up Android channel
 */
export async function initializeNotifications(): Promise<boolean> {
  // Skip initialization on web
  await loadNativeModules();
  if (!isNative || !Notifications) {
    console.log('Notifications not supported on web');
    return false;
  }

  try {
    // Create Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('deadline-reminders', {
        name: 'Deadline Reminders',
        description: 'Reminders for upcoming preliminary notice deadlines',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E40AF',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    return true;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Web doesn't support expo-notifications permissions the same way
  await loadNativeModules();
  if (!isNative || !Notifications || !Device) {
    console.log('Notification permissions not available on web');
    return false;
  }

  try {
    // Check if running on a physical device
    if (!Device.isDevice) {
      console.log('Notifications require a physical device');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Get the current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  // Return 'denied' for web since notifications aren't supported
  await loadNativeModules();
  if (!isNative || !Notifications) {
    return 'denied';
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    console.error('Error getting permission status:', error);
    return 'undetermined';
  }
}

/**
 * Schedule deadline reminders for a project (7 days, 3 days, 1 day before)
 */
export async function scheduleDeadlineReminders(project: Project): Promise<ScheduledReminder | null> {
  if (!project.deadline || !project.notice_required) {
    return null;
  }

  // Skip scheduling on web
  await loadNativeModules();
  if (!isNative || !Notifications) {
    console.log('Cannot schedule notifications on web');
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Cannot schedule reminders - no permission');
      return null;
    }

    const deadline = new Date(project.deadline);
    const now = new Date();
    const notificationIds: ScheduledReminder['notificationIds'] = {};

    // Calculate reminder dates
    const sevenDaysBefore = new Date(deadline);
    sevenDaysBefore.setDate(deadline.getDate() - 7);
    sevenDaysBefore.setHours(9, 0, 0, 0); // 9 AM

    const threeDaysBefore = new Date(deadline);
    threeDaysBefore.setDate(deadline.getDate() - 3);
    threeDaysBefore.setHours(9, 0, 0, 0);

    const oneDayBefore = new Date(deadline);
    oneDayBefore.setDate(deadline.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0);

    // Schedule 7-day reminder
    if (sevenDaysBefore > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '7 Days Until Deadline',
          body: `Your preliminary notice for "${project.project_name}" is due in 7 days. Don't miss your filing deadline!`,
          data: { projectId: project.id, type: 'deadline-reminder', daysRemaining: 7 },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: sevenDaysBefore,
          channelId: 'deadline-reminders',
        },
      });
      notificationIds.sevenDay = id;
    }

    // Schedule 3-day reminder
    if (threeDaysBefore > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '3 Days Until Deadline',
          body: `Urgent: Your preliminary notice for "${project.project_name}" is due in 3 days. Take action now to protect your lien rights!`,
          data: { projectId: project.id, type: 'deadline-reminder', daysRemaining: 3 },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: threeDaysBefore,
          channelId: 'deadline-reminders',
        },
      });
      notificationIds.threeDay = id;
    }

    // Schedule 1-day reminder
    if (oneDayBefore > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'FINAL REMINDER: 1 Day Left!',
          body: `CRITICAL: Your preliminary notice for "${project.project_name}" is due TOMORROW! File now to avoid losing your lien rights!`,
          data: { projectId: project.id, type: 'deadline-reminder', daysRemaining: 1 },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneDayBefore,
          channelId: 'deadline-reminders',
        },
      });
      notificationIds.oneDay = id;
    }

    // Create reminder record
    const reminder: ScheduledReminder = {
      id: `reminder-${project.id}`,
      projectId: project.id,
      projectName: project.project_name,
      deadline: project.deadline,
      notificationIds,
      createdAt: new Date().toISOString(),
    };

    // Save to local storage
    await saveReminder(reminder);

    return reminder;
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    return null;
  }
}

/**
 * Cancel all reminders for a project
 */
export async function cancelProjectReminders(projectId: string): Promise<void> {
  await loadNativeModules();
  try {
    const reminders = await getStoredReminders();
    const reminder = reminders.find(r => r.projectId === projectId);

    if (reminder && isNative && Notifications) {
      // Cancel all scheduled notifications - only on native
      const { sevenDay, threeDay, oneDay } = reminder.notificationIds;
      if (sevenDay) await Notifications.cancelScheduledNotificationAsync(sevenDay);
      if (threeDay) await Notifications.cancelScheduledNotificationAsync(threeDay);
      if (oneDay) await Notifications.cancelScheduledNotificationAsync(oneDay);
    }

    // Remove from storage regardless of platform
    if (reminder) {
      await removeReminder(projectId);
    }
  } catch (error) {
    console.error('Error canceling reminders:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Array<import('expo-notifications').NotificationRequest>> {
  await loadNativeModules();
  // Return empty array on web
  if (!isNative || !Notifications) {
    return [];
  }

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await loadNativeModules();
    if (isNative && Notifications) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    await AsyncStorage.removeItem(REMINDERS_STORAGE_KEY);
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

// ============================================
// LOCAL STORAGE FUNCTIONS FOR REMINDERS
// ============================================

async function getStoredReminders(): Promise<ScheduledReminder[]> {
  try {
    const data = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting stored reminders:', error);
    return [];
  }
}

async function saveReminder(reminder: ScheduledReminder): Promise<void> {
  try {
    const reminders = await getStoredReminders();
    const existingIndex = reminders.findIndex(r => r.projectId === reminder.projectId);
    
    if (existingIndex >= 0) {
      reminders[existingIndex] = reminder;
    } else {
      reminders.push(reminder);
    }
    
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.error('Error saving reminder:', error);
  }
}

async function removeReminder(projectId: string): Promise<void> {
  try {
    const reminders = await getStoredReminders();
    const filtered = reminders.filter(r => r.projectId !== projectId);
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing reminder:', error);
  }
}

export async function getProjectReminder(projectId: string): Promise<ScheduledReminder | null> {
  const reminders = await getStoredReminders();
  return reminders.find(r => r.projectId === projectId) || null;
}

export async function getAllReminders(): Promise<ScheduledReminder[]> {
  return getStoredReminders();
}

// ============================================
// PHASE 2: PUSH NOTIFICATION FUNCTIONS
// ============================================

/**
 * Get Expo Push Token for push notifications
 * Note: Requires a development build (EAS), not Expo Go
 */
export async function getExpoPushToken(): Promise<string | null> {
  // Push tokens not available on web
  if (!isNative || !Notifications || !Device) {
    console.log('Push tokens not available on web');
    return null;
  }

  try {
    if (!Device.isDevice) {
      console.log('Push tokens require a physical device');
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Register push token with backend
 */
export async function registerPushToken(userId: string): Promise<boolean> {
  // Skip on web
  if (!isNative || !Device) {
    return false;
  }

  try {
    const token = await getExpoPushToken();
    if (!token) {
      return false;
    }

    const deviceId = Device.deviceName || `${Platform.OS}-${Date.now()}`;
    const platform = Platform.OS as 'ios' | 'android' | 'web';

    // Save to Supabase
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: userId,
        expo_push_token: token,
        device_id: deviceId,
        platform,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,device_id',
      });

    if (error) {
      console.error('Error saving push token:', error);
      return false;
    }

    // Save locally
    const tokenInfo: PushTokenInfo = {
      token,
      deviceId,
      platform,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, JSON.stringify(tokenInfo));

    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
}

/**
 * Unregister push token (e.g., on logout)
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    const storedData = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (!storedData) return;

    const tokenInfo: PushTokenInfo = JSON.parse(storedData);

    // Remove from Supabase
    await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', tokenInfo.deviceId);

    // Remove locally
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Error unregistering push token:', error);
  }
}

/**
 * Get stored push token info
 */
export async function getStoredPushToken(): Promise<PushTokenInfo | null> {
  try {
    const data = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting stored push token:', error);
    return null;
  }
}

// ============================================
// NOTIFICATION LISTENERS
// ============================================

// Define a type for event subscriptions that works on both platforms
interface EventSubscription {
  remove: () => void;
}

/**
 * Add listener for received notifications (foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: import('expo-notifications').Notification) => void
): EventSubscription {
  // On web, return a dummy subscription that does nothing
  if (!isNative || !Notifications) {
    return {
      remove: () => {},
    };
  }
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for notification responses (user tapped notification)
 */
export function addNotificationResponseListener(
  callback: (response: import('expo-notifications').NotificationResponse) => void
): EventSubscription {
  // On web, return a dummy subscription that does nothing
  if (!isNative || !Notifications) {
    return {
      remove: () => {},
    };
  }
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the last notification response (if app was opened from notification)
 */
export async function getLastNotificationResponse(): Promise<import('expo-notifications').NotificationResponse | null> {
  // This method is not available on web
  if (!isNative || !Notifications) {
    return null;
  }
  
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (error) {
    console.error('Error getting last notification response:', error);
    return null;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format remaining time until deadline
 */
export function formatTimeUntilDeadline(deadline: string): string {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return '1 day remaining';
  } else {
    return `${diffDays} days remaining`;
  }
}

/**
 * Check if reminders are scheduled for a project
 */
export async function hasScheduledReminders(projectId: string): Promise<boolean> {
  const reminder = await getProjectReminder(projectId);
  if (!reminder) return false;

  const { sevenDay, threeDay, oneDay } = reminder.notificationIds;
  return !!(sevenDay || threeDay || oneDay);
}

/**
 * Reschedule reminders for a project (e.g., after deadline change)
 */
export async function rescheduleReminders(project: Project): Promise<ScheduledReminder | null> {
  await cancelProjectReminders(project.id);
  return scheduleDeadlineReminders(project);
}
