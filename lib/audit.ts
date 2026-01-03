import { supabase } from './supabase';

// Action types for the audit trail
export type AuditActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'status_change' 
  | 'delivery_confirmed' 
  | 'document_generated' 
  | 'document_modified' 
  | 'email_sent' 
  | 'reminder_sent'
  | 'notice'
  | 'delivery'
  | 'proof'
  | 'signature';

// Entity types that can be audited
export type AuditEntityType = 'project' | 'template' | 'profile' | 'document';

export interface AuditLog {
  id: string;
  user_id: string;
  project_id: string | null;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CreateAuditLogParams {
  project_id?: string | null;
  action_type: AuditActionType;
  entity_type?: AuditEntityType;
  entity_id?: string | null;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Get the current user's ID from the session
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(params: CreateAuditLogParams): Promise<{ data: AuditLog | null; error: Error | null }> {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      console.warn('No authenticated user found for audit logging');
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        project_id: params.project_id || null,
        action_type: params.action_type,
        entity_type: params.entity_type || 'project',
        entity_id: params.entity_id || null,
        field_name: params.field_name || null,
        old_value: params.old_value || null,
        new_value: params.new_value || null,
        metadata: params.metadata || {},
        ip_address: params.ip_address || null,
        user_agent: params.user_agent || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error logging audit event:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as AuditLog, error: null };
  } catch (err) {
    console.error('Exception logging audit event:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch all audit logs for a project
 */
export async function getProjectAuditLogs(projectId: string): Promise<{ data: AuditLog[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs:', error);
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data || []) as AuditLog[], error: null };
  } catch (err) {
    console.error('Exception fetching audit logs:', err);
    return { data: [], error: err as Error };
  }
}

/**
 * Fetch all audit logs for the current user
 */
export async function getUserAuditLogs(options?: {
  limit?: number;
  offset?: number;
  actionTypes?: AuditActionType[];
  startDate?: Date;
  endDate?: Date;
}): Promise<{ data: AuditLog[]; error: Error | null; count: number }> {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Filter by action types
    if (options?.actionTypes && options.actionTypes.length > 0) {
      query = query.in('action_type', options.actionTypes);
    }

    // Filter by date range
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    // Order by newest first
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching user audit logs:', error);
      return { data: [], error: new Error(error.message), count: 0 };
    }

    return { data: (data || []) as AuditLog[], error: null, count: count || 0 };
  } catch (err) {
    console.error('Exception fetching user audit logs:', err);
    return { data: [], error: err as Error, count: 0 };
  }
}

/**
 * Fetch audit logs with filtering options
 */
export async function getFilteredAuditLogs(
  projectId: string,
  options?: {
    actionTypes?: AuditActionType[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<{ data: AuditLog[]; error: Error | null }> {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('project_id', projectId);

    // Filter by action types
    if (options?.actionTypes && options.actionTypes.length > 0) {
      query = query.in('action_type', options.actionTypes);
    }

    // Filter by date range
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    // Order by newest first
    query = query.order('created_at', { ascending: false });

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching filtered audit logs:', error);
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data || []) as AuditLog[], error: null };
  } catch (err) {
    console.error('Exception fetching filtered audit logs:', err);
    return { data: [], error: err as Error };
  }
}

/**
 * Get a human-readable description for an audit action
 */
export function getActionDescription(log: AuditLog): string {
  switch (log.action_type) {
    case 'create':
      return `Project "${log.new_value || 'Unknown'}" was created`;
    case 'update':
      if (log.field_name) {
        return `${log.field_name} was updated from "${log.old_value || 'empty'}" to "${log.new_value || 'empty'}"`;
      }
      return 'Project was updated';
    case 'delete':
      return `Project "${log.old_value || 'Unknown'}" was deleted`;
    case 'status_change':
      return `Status changed from "${log.old_value || 'none'}" to "${log.new_value || 'none'}"`;
    case 'delivery_confirmed':
      return 'Delivery was confirmed';
    case 'document_generated':
      return 'Document was generated';
    case 'document_modified':
      return 'Document was modified';
    case 'email_sent':
      return 'Email notification was sent';
    case 'reminder_sent':
      return 'Reminder was sent';
    case 'notice':
      return 'Preliminary notice was generated';
    case 'delivery':
      return `Notice was delivered via ${log.metadata?.delivery_method || 'unknown method'}`;
    case 'proof':
      return 'Proof of service was uploaded';
    case 'signature':
      return `Electronic signature received from ${log.metadata?.signer_name || 'unknown'}`;
    default:
      return log.action_type;
  }
}

/**
 * Get icon name for an audit action type
 */
export function getActionIcon(actionType: AuditActionType): string {
  switch (actionType) {
    case 'create':
      return 'add-circle';
    case 'update':
      return 'create';
    case 'delete':
      return 'trash';
    case 'status_change':
      return 'swap-horizontal';
    case 'delivery_confirmed':
      return 'checkmark-circle';
    case 'document_generated':
      return 'document-text';
    case 'document_modified':
      return 'document';
    case 'email_sent':
      return 'mail';
    case 'reminder_sent':
      return 'notifications';
    case 'notice':
      return 'document-text';
    case 'delivery':
      return 'send';
    case 'proof':
      return 'shield-checkmark';
    case 'signature':
      return 'pencil';
    default:
      return 'ellipse';
  }
}

/**
 * Get color for an audit action type
 */
export function getActionColor(actionType: AuditActionType): string {
  switch (actionType) {
    case 'create':
      return '#10B981'; // green
    case 'update':
      return '#3B82F6'; // blue
    case 'delete':
      return '#EF4444'; // red
    case 'status_change':
      return '#8B5CF6'; // purple
    case 'delivery_confirmed':
      return '#10B981'; // green
    case 'document_generated':
      return '#F59E0B'; // amber
    case 'document_modified':
      return '#F59E0B'; // amber
    case 'email_sent':
      return '#06B6D4'; // cyan
    case 'reminder_sent':
      return '#EC4899'; // pink
    case 'notice':
      return '#F59E0B'; // amber
    case 'delivery':
      return '#3B82F6'; // blue
    case 'proof':
      return '#10B981'; // green
    case 'signature':
      return '#8B5CF6'; // purple
    default:
      return '#6B7280'; // gray
  }
}

// ============================================
// Helper functions for logging specific events
// ============================================

/**
 * Helper function to log a project creation event
 */
export async function logProjectCreated(
  projectId: string,
  projectName: string,
  metadata?: Record<string, unknown>
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'create',
    entity_type: 'project',
    entity_id: projectId,
    new_value: projectName,
    metadata: {
      project_name: projectName,
      ...metadata,
    },
  });
}

/**
 * Helper function to log a notice generation event
 */
export async function logNoticeGenerated(
  projectId: string,
  state: string,
  documentUrl?: string
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'document_generated',
    entity_type: 'document',
    entity_id: projectId,
    new_value: `${state} preliminary notice`,
    metadata: {
      state: state,
      document_url: documentUrl,
      template_version: '1.0',
      generated_at: new Date().toISOString(),
    },
  });
}

/**
 * Helper function to log a delivery event
 */
export async function logDelivery(
  projectId: string,
  deliveryMethod: string,
  recipientName: string,
  recipientAddress: string,
  trackingNumber?: string | null
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'delivery',
    entity_type: 'project',
    entity_id: projectId,
    new_value: deliveryMethod,
    metadata: {
      delivery_method: deliveryMethod,
      recipient: recipientName,
      recipient_address: recipientAddress,
      tracking_number: trackingNumber,
      sent_at: new Date().toISOString(),
    },
  });
}

/**
 * Helper function to log a delivery confirmation event
 */
export async function logDeliveryConfirmed(
  projectId: string,
  deliveryMethod: string,
  confirmedAt: Date
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'delivery_confirmed',
    entity_type: 'project',
    entity_id: projectId,
    new_value: confirmedAt.toISOString(),
    metadata: {
      delivery_method: deliveryMethod,
      confirmed_at: confirmedAt.toISOString(),
    },
  });
}

/**
 * Helper function to log a proof of service event
 */
export async function logProofOfService(
  projectId: string,
  proofType: string,
  documentUrl: string,
  deliveryDate: Date,
  signedBy?: string | null
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'proof',
    entity_type: 'document',
    entity_id: projectId,
    new_value: proofType,
    metadata: {
      proof_type: proofType,
      document_url: documentUrl,
      delivery_date: deliveryDate.toISOString(),
      signed_by: signedBy,
    },
  });
}

/**
 * Helper function to log a signature event
 */
export async function logSignature(
  projectId: string,
  signerName: string,
  signerEmail: string,
  signatureProvider: string,
  documentUrl?: string
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'signature',
    entity_type: 'document',
    entity_id: projectId,
    new_value: signerName,
    metadata: {
      signer_name: signerName,
      signer_email: signerEmail,
      signature_provider: signatureProvider,
      document_url: documentUrl,
      signed_at: new Date().toISOString(),
    },
  });
}

/**
 * Helper function to log a status update event
 */
export async function logStatusUpdate(
  projectId: string,
  previousStatus: string,
  newStatus: string
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'status_change',
    entity_type: 'project',
    entity_id: projectId,
    field_name: 'status',
    old_value: previousStatus,
    new_value: newStatus,
    metadata: {
      previous_status: previousStatus,
      new_status: newStatus,
      changed_at: new Date().toISOString(),
    },
  });
}

/**
 * Helper function to log a general field update event
 */
export async function logFieldUpdate(
  projectId: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null,
  metadata?: Record<string, unknown>
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'update',
    entity_type: 'project',
    entity_id: projectId,
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
    metadata: {
      field_name: fieldName,
      ...metadata,
    },
  });
}

/**
 * Helper function to log an email sent event
 */
export async function logEmailSent(
  projectId: string,
  recipientEmail: string,
  emailType: string,
  subject?: string
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'email_sent',
    entity_type: 'project',
    entity_id: projectId,
    new_value: recipientEmail,
    metadata: {
      recipient_email: recipientEmail,
      email_type: emailType,
      subject: subject,
      sent_at: new Date().toISOString(),
    },
  });
}

/**
 * Helper function to log a reminder sent event
 */
export async function logReminderSent(
  projectId: string,
  reminderType: string,
  daysUntilDeadline: number
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: projectId,
    action_type: 'reminder_sent',
    entity_type: 'project',
    entity_id: projectId,
    new_value: reminderType,
    metadata: {
      reminder_type: reminderType,
      days_until_deadline: daysUntilDeadline,
      sent_at: new Date().toISOString(),
    },
  });
}

/**
 * Helper function to log project deletion
 */
export async function logProjectDeleted(
  projectId: string,
  projectName: string,
  metadata?: Record<string, unknown>
): Promise<{ data: AuditLog | null; error: Error | null }> {
  return logAuditEvent({
    project_id: null, // Project is being deleted
    action_type: 'delete',
    entity_type: 'project',
    entity_id: projectId,
    old_value: projectName,
    metadata: {
      project_name: projectName,
      deleted_at: new Date().toISOString(),
      ...metadata,
    },
  });
}

// ============================================
// Legacy compatibility - map old types to new
// ============================================

// Legacy event type alias for backwards compatibility
export type AuditEventType = 'notice' | 'delivery' | 'proof' | 'signature' | 'update' | 'created';

export interface AuditEvent {
  id: string;
  project_id: string;
  event_type: AuditEventType;
  description: string;
  user_name: string;
  user_email?: string;
  document_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Convert AuditLog to legacy AuditEvent format
 */
export function convertToLegacyEvent(log: AuditLog): AuditEvent {
  const eventTypeMap: Record<AuditActionType, AuditEventType> = {
    'create': 'created',
    'update': 'update',
    'delete': 'update',
    'status_change': 'update',
    'delivery_confirmed': 'delivery',
    'document_generated': 'notice',
    'document_modified': 'notice',
    'email_sent': 'update',
    'reminder_sent': 'update',
    'notice': 'notice',
    'delivery': 'delivery',
    'proof': 'proof',
    'signature': 'signature',
  };

  return {
    id: log.id,
    project_id: log.project_id || '',
    event_type: eventTypeMap[log.action_type] || 'update',
    description: getActionDescription(log),
    user_name: log.metadata?.user_name || 'System',
    user_email: log.metadata?.user_email,
    document_url: log.metadata?.document_url,
    metadata: log.metadata,
    created_at: log.created_at,
  };
}

/**
 * Fetch all audit events for a project (legacy compatibility)
 */
export async function getAuditEvents(projectId: string): Promise<{ data: AuditEvent[]; error: Error | null }> {
  const { data, error } = await getProjectAuditLogs(projectId);
  return {
    data: data.map(convertToLegacyEvent),
    error,
  };
}

/**
 * Fetch audit events with filtering options (legacy compatibility)
 */
export async function getFilteredAuditEvents(
  projectId: string,
  options?: {
    eventTypes?: AuditEventType[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<{ data: AuditEvent[]; error: Error | null }> {
  // Map legacy event types to new action types
  const actionTypeMap: Record<AuditEventType, AuditActionType[]> = {
    'created': ['create'],
    'update': ['update', 'status_change', 'email_sent', 'reminder_sent'],
    'notice': ['document_generated', 'document_modified', 'notice'],
    'delivery': ['delivery', 'delivery_confirmed'],
    'proof': ['proof'],
    'signature': ['signature'],
  };

  let actionTypes: AuditActionType[] | undefined;
  if (options?.eventTypes) {
    actionTypes = options.eventTypes.flatMap(et => actionTypeMap[et] || []);
  }

  const { data, error } = await getFilteredAuditLogs(projectId, {
    actionTypes,
    startDate: options?.startDate,
    endDate: options?.endDate,
    limit: options?.limit,
  });

  return {
    data: data.map(convertToLegacyEvent),
    error,
  };
}
