import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { 
  AuditLog, 
  AuditActionType,
  getProjectAuditLogs, 
  getActionDescription, 
  getActionIcon, 
  getActionColor,
  AuditEvent,
  AuditEventType,
} from '../lib/audit';

// Filter types
export type EventFilterType = 'all' | 'notices' | 'deliveries' | 'proofs' | 'signatures' | 'status';

interface AuditTimelineProps {
  projectId: string;
  events?: AuditEvent[];
  loading?: boolean;
  onRefresh?: () => void;
}

// Icon configuration for each event type (legacy support)
const eventIconConfig: Record<AuditEventType, { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }> = {
  notice: { icon: 'document-text', color: colors.info, bgColor: colors.infoLight },
  delivery: { icon: 'send', color: colors.primary, bgColor: colors.primaryLight + '30' },
  proof: { icon: 'shield-checkmark', color: colors.success, bgColor: colors.successLight },
  signature: { icon: 'create', color: '#8B5CF6', bgColor: '#EDE9FE' },
  update: { icon: 'refresh', color: colors.warning, bgColor: colors.warningLight },
  created: { icon: 'add-circle', color: colors.gray500, bgColor: colors.gray100 },
};

// Icon configuration for new action types
const actionIconConfig: Record<AuditActionType, { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }> = {
  create: { icon: 'add-circle', color: '#10B981', bgColor: '#D1FAE5' },
  update: { icon: 'create', color: '#3B82F6', bgColor: '#DBEAFE' },
  delete: { icon: 'trash', color: '#EF4444', bgColor: '#FEE2E2' },
  status_change: { icon: 'swap-horizontal', color: '#8B5CF6', bgColor: '#EDE9FE' },
  delivery_confirmed: { icon: 'checkmark-circle', color: '#10B981', bgColor: '#D1FAE5' },
  document_generated: { icon: 'document-text', color: '#F59E0B', bgColor: '#FEF3C7' },
  document_modified: { icon: 'document', color: '#F59E0B', bgColor: '#FEF3C7' },
  email_sent: { icon: 'mail', color: '#06B6D4', bgColor: '#CFFAFE' },
  reminder_sent: { icon: 'notifications', color: '#EC4899', bgColor: '#FCE7F3' },
  notice: { icon: 'document-text', color: colors.info, bgColor: colors.infoLight },
  delivery: { icon: 'send', color: colors.primary, bgColor: colors.primaryLight + '30' },
  proof: { icon: 'shield-checkmark', color: colors.success, bgColor: colors.successLight },
  signature: { icon: 'pencil', color: '#8B5CF6', bgColor: '#EDE9FE' },
};

// Filter options
const filterOptions: { key: EventFilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'notices', label: 'Notices' },
  { key: 'deliveries', label: 'Deliveries' },
  { key: 'proofs', label: 'Proofs' },
  { key: 'signatures', label: 'Signatures' },
  { key: 'status', label: 'Status' },
];

// Map filter to event types
const filterToEventTypes: Record<EventFilterType, AuditEventType[]> = {
  all: ['notice', 'delivery', 'proof', 'signature', 'update', 'created'],
  notices: ['notice'],
  deliveries: ['delivery'],
  proofs: ['proof'],
  signatures: ['signature'],
  status: ['update'],
};


export default function AuditTimeline({ projectId, events: propEvents, loading = false, onRefresh }: AuditTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<EventFilterType>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Use mock data if no events provided
  const events = propEvents || generateMockEvents(projectId);

  // Filter events based on selected filter and date range
  const filteredEvents = events.filter((event) => {
    // Filter by event type
    const allowedTypes = filterToEventTypes[selectedFilter];
    if (!allowedTypes.includes(event.event_type)) {
      return false;
    }

    // Filter by date range
    if (dateRange.start || dateRange.end) {
      const eventDate = new Date(event.created_at);
      if (dateRange.start && eventDate < dateRange.start) return false;
      if (dateRange.end && eventDate > dateRange.end) return false;
    }

    return true;
  });

  // Sort by newest first
  const sortedEvents = [...filteredEvents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleViewDocument = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening document:', error);
    }
  }, []);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const clearDateFilter = () => {
    setDateRange({ start: null, end: null });
    setShowDateFilter(false);
  };

  const setQuickDateFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRange({ start, end });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="time" size={22} color={colors.primary} />
          <Text style={styles.headerTitle}>Activity Timeline</Text>
        </View>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <View style={styles.filterTabs}>
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.filterTabActive,
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === filter.key && styles.filterTabTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Filter Toggle */}
        <TouchableOpacity
          style={[styles.dateFilterButton, showDateFilter && styles.dateFilterButtonActive]}
          onPress={() => setShowDateFilter(!showDateFilter)}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={showDateFilter ? colors.primary : colors.gray500}
          />
        </TouchableOpacity>
      </View>

      {/* Date Range Filter */}
      {showDateFilter && (
        <View style={styles.dateRangeContainer}>
          <Text style={styles.dateRangeLabel}>Quick Filters:</Text>
          <View style={styles.dateRangeButtons}>
            <TouchableOpacity
              style={styles.dateRangeButton}
              onPress={() => setQuickDateFilter(7)}
            >
              <Text style={styles.dateRangeButtonText}>Last 7 days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateRangeButton}
              onPress={() => setQuickDateFilter(30)}
            >
              <Text style={styles.dateRangeButtonText}>Last 30 days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateRangeButton}
              onPress={() => setQuickDateFilter(90)}
            >
              <Text style={styles.dateRangeButtonText}>Last 90 days</Text>
            </TouchableOpacity>
            {(dateRange.start || dateRange.end) && (
              <TouchableOpacity
                style={[styles.dateRangeButton, styles.clearButton]}
                onPress={clearDateFilter}
              >
                <Ionicons name="close" size={14} color={colors.error} />
                <Text style={[styles.dateRangeButtonText, styles.clearButtonText]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsCount}>
        <Text style={styles.resultsCountText}>
          {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}
          {selectedFilter !== 'all' && ` in ${filterOptions.find(f => f.key === selectedFilter)?.label}`}
        </Text>
      </View>

      {/* Timeline */}
      {sortedEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.gray300} />
          <Text style={styles.emptyStateTitle}>No events found</Text>
          <Text style={styles.emptyStateText}>
            {selectedFilter !== 'all'
              ? 'Try changing the filter to see more events'
              : 'Activity will appear here as you work on this project'}
          </Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {sortedEvents.map((event, index) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isExpanded={expandedIds.has(event.id)}
              onToggle={() => toggleExpanded(event.id)}
              onViewDocument={handleViewDocument}
              isFirst={index === 0}
              isLast={index === sortedEvents.length - 1}
              formatTimestamp={formatTimestamp}
              formatRelativeTime={formatRelativeTime}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface TimelineEventProps {
  event: AuditEvent;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDocument: (url: string) => void;
  isFirst: boolean;
  isLast: boolean;
  formatTimestamp: (timestamp: string) => string;
  formatRelativeTime: (timestamp: string) => string;
}

function TimelineEvent({
  event,
  isExpanded,
  onToggle,
  onViewDocument,
  isFirst,
  isLast,
  formatTimestamp,
  formatRelativeTime,
}: TimelineEventProps) {
  const config = eventIconConfig[event.event_type] || eventIconConfig.update;

  return (
    <View style={styles.eventContainer}>
      {/* Timeline Line */}
      <View style={styles.timelineLineContainer}>
        {!isFirst && <View style={styles.timelineLineTop} />}
        <View style={[styles.eventIcon, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>
        {!isLast && <View style={styles.timelineLineBottom} />}
      </View>

      {/* Event Card */}
      <TouchableOpacity
        style={[styles.eventCard, isExpanded && styles.eventCardExpanded]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventHeaderLeft}>
            <Text style={styles.eventType}>
              {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
            </Text>
            <Text style={styles.eventTime}>{formatRelativeTime(event.created_at)}</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.gray400}
          />
        </View>

        <Text style={styles.eventDescription} numberOfLines={isExpanded ? undefined : 2}>
          {event.description}
        </Text>

        {isExpanded && (
          <View style={styles.eventDetails}>
            {/* Full Timestamp */}
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.gray400} />
              <Text style={styles.detailText}>{formatTimestamp(event.created_at)}</Text>
            </View>

            {/* User Info */}
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={colors.gray400} />
              <Text style={styles.detailText}>
                {event.user_name}
                {event.user_email && (
                  <Text style={styles.detailTextMuted}> ({event.user_email})</Text>
                )}
              </Text>
            </View>

            {/* Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <View style={styles.metadataContainer}>
                {Object.entries(event.metadata).map(([key, value]) => (
                  <View key={key} style={styles.metadataRow}>
                    <Text style={styles.metadataKey}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:
                    </Text>
                    <Text style={styles.metadataValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* View Document Button */}
            {event.document_url && (
              <TouchableOpacity
                style={styles.viewDocumentButton}
                onPress={() => onViewDocument(event.document_url!)}
              >
                <Ionicons name="document-outline" size={18} color={colors.surface} />
                <Text style={styles.viewDocumentText}>View Document</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Generate mock events for demonstration
function generateMockEvents(projectId: string): AuditEvent[] {
  const now = new Date();
  
  return [
    {
      id: '1',
      project_id: projectId,
      event_type: 'created',
      description: 'Project was created and saved as draft',
      user_name: 'John Smith',
      user_email: 'john@example.com',
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      project_id: projectId,
      event_type: 'notice',
      description: 'Preliminary notice document was generated using California state template',
      user_name: 'John Smith',
      user_email: 'john@example.com',
      document_url: 'https://example.com/notice.pdf',
      metadata: {
        template_version: '2.1',
        state: 'California',
      },
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      project_id: projectId,
      event_type: 'delivery',
      description: 'Notice sent via certified mail to property owner at 123 Main St, Los Angeles, CA',
      user_name: 'John Smith',
      user_email: 'john@example.com',
      metadata: {
        delivery_method: 'Certified Mail',
        tracking_number: '9400111899223456789012',
        recipient: 'Property Owner',
      },
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      project_id: projectId,
      event_type: 'proof',
      description: 'Proof of service uploaded - USPS delivery confirmation received',
      user_name: 'John Smith',
      user_email: 'john@example.com',
      document_url: 'https://example.com/proof.pdf',
      metadata: {
        delivery_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        signed_by: 'J. Doe',
      },
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      project_id: projectId,
      event_type: 'update',
      description: 'Project status updated from "Sent" to "Delivered"',
      user_name: 'System',
      metadata: {
        previous_status: 'Sent',
        new_status: 'Delivered',
      },
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    },
    {
      id: '6',
      project_id: projectId,
      event_type: 'signature',
      description: 'Electronic signature received from property owner via DocuSign',
      user_name: 'Jane Doe',
      user_email: 'jane.doe@email.com',
      document_url: 'https://example.com/signed.pdf',
      metadata: {
        signature_provider: 'DocuSign',
        ip_address: '192.168.1.xxx',
      },
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  loadingContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterTabs: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  filterTabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  dateFilterButton: {
    marginLeft: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  dateFilterButtonActive: {
    backgroundColor: colors.primaryLight + '30',
  },
  dateRangeContainer: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateRangeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dateRangeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dateRangeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  dateRangeButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: colors.errorLight,
    backgroundColor: colors.errorLight,
  },
  clearButtonText: {
    color: colors.error,
    marginLeft: 4,
  },
  resultsCount: {
    marginBottom: spacing.md,
  },
  resultsCountText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyStateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  timeline: {
    paddingTop: spacing.sm,
  },
  eventContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLineContainer: {
    width: 40,
    alignItems: 'center',
  },
  timelineLineTop: {
    width: 2,
    height: 12,
    backgroundColor: colors.gray200,
  },
  timelineLineBottom: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray200,
    marginTop: 4,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCard: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  eventCardExpanded: {
    backgroundColor: colors.surface,
    borderColor: colors.gray200,
    ...shadows.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  eventHeaderLeft: {
    flex: 1,
  },
  eventType: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  eventTime: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  eventDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  eventDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailText: {
    ...typography.caption,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  detailTextMuted: {
    color: colors.textMuted,
  },
  metadataContainer: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metadataKey: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  metadataValue: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  viewDocumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  viewDocumentText: {
    ...typography.bodySmall,
    color: colors.surface,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});
