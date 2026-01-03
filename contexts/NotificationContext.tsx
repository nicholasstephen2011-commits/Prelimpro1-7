import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthContext';
import {
  initializeNotifications,
  requestNotificationPermissions,
  getNotificationPermissionStatus,
  registerPushToken,
  unregisterPushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
  getAllReminders,
  ScheduledReminder,
} from '../lib/notifications';

// Check if we're running on a native platform
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Define a simplified notification type for our context
// This avoids importing expo-notifications directly which can cause issues on web
interface SimpleNotification {
  request: {
    content: {
      title: string | null;
      body: string | null;
        data: Record<string, unknown>;
    };
    identifier: string;
  };
  date: number;
}

interface NotificationContextType {
  // Permission state
  permissionStatus: 'granted' | 'denied' | 'undetermined' | 'loading';
  requestPermissions: () => Promise<boolean>;
  
  // Push token state
  pushTokenRegistered: boolean;
  registerForPush: () => Promise<boolean>;
  unregisterFromPush: () => Promise<void>;
  
  // Reminders
  reminders: ScheduledReminder[];
  refreshReminders: () => Promise<void>;
  
  // Notification received in foreground
  lastNotification: SimpleNotification | null;
  
  // Initialization
  isInitialized: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | 'loading'>('loading');
  const [pushTokenRegistered, setPushTokenRegistered] = useState(false);
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [lastNotification, setLastNotification] = useState<SimpleNotification | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isMountedRef = useRef(true);
  
  const { user } = useAuth();
  const router = useRouter();

  // Initialize notifications on mount
  useEffect(() => {
    const init = async () => {
      // Only initialize on native platforms
      if (isNative) {
        await initializeNotifications();
      }
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      setIsInitialized(true);
    };
    init();
  }, []);

  // Load reminders
  const refreshReminders = useCallback(async () => {
    const storedReminders = await getAllReminders();
    if (!isMountedRef.current) return;
    setReminders(storedReminders);
  }, []);

  useEffect(() => {
    const load = async () => {
      await refreshReminders();
    };
    load();
    return () => {
      isMountedRef.current = false;
    };
  }, [refreshReminders]);

  // Register push token when user logs in
  useEffect(() => {
    if (user && permissionStatus === 'granted' && isNative) {
      registerPushToken(user.id).then(success => {
        setPushTokenRegistered(success);
      });
    }
  }, [user, permissionStatus]);

  // Handle notification received in foreground - only on native
  useEffect(() => {
    if (!isNative) return;

    const subscription = addNotificationReceivedListener((notification: {
      request?: {
        content?: { title?: string | null; body?: string | null; data?: Record<string, unknown> };
        identifier?: string;
      };
      date?: number;
    }) => {
      // Convert to our simplified type
      setLastNotification({
        request: {
          content: {
            title: notification.request?.content?.title || null,
            body: notification.request?.content?.body || null,
            data: notification.request?.content?.data || {},
          },
          identifier: notification.request?.identifier || '',
        },
        date: notification.date || Date.now(),
      });
    });

    return () => subscription.remove();
  }, []);

  // Handle notification tap (user interaction) - only on native
  useEffect(() => {
    if (!isNative) return;

    const subscription = addNotificationResponseListener((response: {
      notification?: {
        request?: { content?: { data?: Record<string, unknown> } };
      };
    }) => {
      const data = response?.notification?.request?.content?.data;
      
      if (data?.projectId && data?.type === 'deadline-reminder') {
        // Navigate to project details
        router.push(`/(app)/project/${data.projectId}`);
      }
    });

    return () => subscription.remove();
  }, [router]);

  // Check for notification that opened the app - only on native
  useEffect(() => {
    if (!isNative) return;

    const checkInitialNotification = async () => {
      try {
        const response = await getLastNotificationResponse();
        if (response) {
          const data = response.notification?.request?.content?.data;
          if (data?.projectId && data?.type === 'deadline-reminder') {
            router.push(`/(app)/project/${data.projectId}`);
          }
        }
      } catch (error) {
        // Silently handle errors on web or if the method is unavailable
        console.log('Could not get last notification response:', error);
      }
    };

    if (isInitialized) {
      checkInitialNotification();
    }
  }, [isInitialized, router]);

  // Refresh permission status when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const status = await getNotificationPermissionStatus();
        setPermissionStatus(status);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    const granted = await requestNotificationPermissions();
    const status = await getNotificationPermissionStatus();
    setPermissionStatus(status);
    return granted;
  }, []);

  const registerForPush = useCallback(async (): Promise<boolean> => {
    if (!user || !isNative) return false;
    const success = await registerPushToken(user.id);
    setPushTokenRegistered(success);
    return success;
  }, [user]);

  const unregisterFromPush = useCallback(async (): Promise<void> => {
    if (!user) return;
    await unregisterPushToken(user.id);
    setPushTokenRegistered(false);
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        permissionStatus,
        requestPermissions,
        pushTokenRegistered,
        registerForPush,
        unregisterFromPush,
        reminders,
        refreshReminders,
        lastNotification,
        isInitialized,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
