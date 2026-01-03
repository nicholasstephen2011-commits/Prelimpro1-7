/**
 * Push Notifications - Phase 2 Implementation
 * 
 * This module handles push notification token management and 
 * integration with backend services for server-initiated notifications.
 * 
 * REQUIREMENTS:
 * - Development build using EAS (not Expo Go)
 * - Android: FCM v1 credentials configured
 * - iOS: APNs credentials configured
 * - Backend: Supabase with user_push_tokens table
 */

import { supabase } from './supabase';

// Types for push notification management
export interface PushToken {
  user_id: string;
  expo_push_token: string;
  device_id: string;
  platform: 'ios' | 'android' | 'web';
  updated_at: string;
  is_valid: boolean;
}

export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

export interface PushNotificationResult {
  success: boolean;
  ticketId?: string;
  error?: string;
}

// Expo Push API endpoint
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification via Expo Push API
 * This can be called from a backend Edge Function
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<PushNotificationResult[]> {
  try {
    const messages = Array.isArray(payload.to) 
      ? payload.to.map(token => ({
          to: token,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: payload.sound || 'default',
          priority: payload.priority || 'high',
          channelId: payload.channelId || 'deadline-reminders',
        }))
      : [{
          to: payload.to,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: payload.sound || 'default',
          priority: payload.priority || 'high',
          channelId: payload.channelId || 'deadline-reminders',
        }];

    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const data = await response.json();
    
    if (data.errors) {
      return data.errors.map((error: { message?: string }) => ({
        success: false,
        error: error?.message || 'Unknown error',
      }));
    }

    return data.data.map((ticket: { status?: string; id?: string; message?: string }) => ({
      success: ticket.status === 'ok',
      ticketId: ticket.id,
      error: ticket.message,
    }));
  } catch (error) {
    console.error('Error sending push notification:', error);
    return [{
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }];
  }
}

/**
 * Get all push tokens for a user
 */
export async function getUserPushTokens(userId: string): Promise<PushToken[]> {
  try {
    const { data, error } = await supabase
      .from('user_push_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_valid', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user push tokens:', error);
    return [];
  }
}

/**
 * Mark a push token as invalid (e.g., after receiving DeviceNotRegistered error)
 */
export async function invalidatePushToken(token: string): Promise<void> {
  try {
    await supabase
      .from('user_push_tokens')
      .update({ is_valid: false, updated_at: new Date().toISOString() })
      .eq('expo_push_token', token);
  } catch (error) {
    console.error('Error invalidating push token:', error);
  }
}

/**
 * Delete a push token
 */
export async function deletePushToken(userId: string, deviceId: string): Promise<void> {
  try {
    await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId);
  } catch (error) {
    console.error('Error deleting push token:', error);
  }
}

/**
 * Send deadline reminder to all user devices
 */
export async function sendDeadlineReminder(
  userId: string,
  projectName: string,
  daysRemaining: number
): Promise<PushNotificationResult[]> {
  const tokens = await getUserPushTokens(userId);
  
  if (tokens.length === 0) {
    return [{ success: false, error: 'No valid push tokens found' }];
  }

  const urgencyLevel = daysRemaining <= 1 ? 'CRITICAL' : daysRemaining <= 3 ? 'Urgent' : '';
  const title = daysRemaining === 1 
    ? 'FINAL REMINDER: 1 Day Left!'
    : daysRemaining === 3
    ? '3 Days Until Deadline'
    : '7 Days Until Deadline';

  const body = daysRemaining === 1
    ? `CRITICAL: Your preliminary notice for "${projectName}" is due TOMORROW! File now to avoid losing your lien rights!`
    : daysRemaining === 3
    ? `Urgent: Your preliminary notice for "${projectName}" is due in 3 days. Take action now to protect your lien rights!`
    : `Your preliminary notice for "${projectName}" is due in 7 days. Don't miss your filing deadline!`;

  return sendPushNotification({
    to: tokens.map(t => t.expo_push_token),
    title,
    body,
    data: {
      type: 'deadline-reminder',
      daysRemaining,
      urgencyLevel,
    },
    priority: daysRemaining <= 1 ? 'high' : 'normal',
  });
}

/**
 * Handle push notification receipts to check for errors
 * Call this periodically to clean up invalid tokens
 */
export async function checkPushReceipts(ticketIds: string[]): Promise<void> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: ticketIds }),
    });

    const data = await response.json();
    
    for (const [, receipt] of Object.entries(data.data)) {
      const receiptDetails = receipt as { status?: string; details?: { error?: string } };
      if (receiptDetails.status === 'error') {
        if (receiptDetails.details?.error === 'DeviceNotRegistered') {
          // Token is no longer valid, mark it
          // Note: You'd need to track which token corresponds to which ticket
          console.log('Device not registered, should invalidate token');
        }
      }
    }
  } catch (error) {
    console.error('Error checking push receipts:', error);
  }
}

// SQL for creating the user_push_tokens table in Supabase:
/*
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Index for faster lookups
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_token ON user_push_tokens(expo_push_token);

-- RLS policies
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens"
  ON user_push_tokens
  FOR ALL
  USING (auth.uid() = user_id);
*/
