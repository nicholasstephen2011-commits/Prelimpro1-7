import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usePlan } from '../../contexts/PlanContext';
import { useDisclaimer } from '../../contexts/DisclaimerContext';
import { supabase, Project } from '../../lib/supabase';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import ProjectCard from '../../components/ProjectCard';
import Button from '../../components/Button';
import DisclaimerFooter from '../../components/DisclaimerFooter';
import NotificationBanner from '../../components/NotificationBanner';
import UpgradeModal from '../../components/UpgradeModal';
import FirstUseDisclaimerModal from '../../components/FirstUseDisclaimerModal';

export default function DashboardScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { user, signOut, isEmailVerified } = useAuth();
  const { permissionStatus, reminders } = useNotifications();
  const { plan, refreshPlan, canCreateNotice } = usePlan();
  const { hasAcknowledgedDisclaimer, isLoading: disclaimerLoading, acknowledgeDisclaimer } = useDisclaimer();
  const router = useRouter();

  // Redirect to verify-email if not verified
  useEffect(() => {
    if (user && !isEmailVerified) {
      router.replace('/(auth)/verify-email');
    }
  }, [user, isEmailVerified, router]);

  // Refresh plan when screen is focused
  useFocusEffect(
    useCallback(() => {
      refreshPlan();
    }, [refreshPlan])
  );

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
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
    refreshPlan();
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const handleProjectPress = (project: Project) => {
    router.push(`/(app)/project/${project.id}`);
  };

  const handleNotificationsPress = () => {
    router.push('/(app)/notifications');
  };

  const handleNewProject = () => {
    if (!canCreateNotice()) {
      setShowUpgradeModal(true);
      return;
    }
    router.push('/(app)/new-project');
  };

  const handleDisclaimerAccept = async () => {
    await acknowledgeDisclaimer();
  };

  const renderPlanBanner = () => {
    if (!plan) return null;

    const isPro = plan.isPro;
    const noticesRemaining = plan.noticesAvailable;

    return (
      <TouchableOpacity 
        style={[
          styles.planBanner,
          isPro ? styles.planBannerPro : styles.planBannerFree
        ]}
        onPress={() => router.push('/(app)/pricing')}
        activeOpacity={0.8}
      >
        <View style={styles.planBannerLeft}>
          <Ionicons 
            name={isPro ? 'star' : 'document-text'} 
            size={20} 
            color={isPro ? colors.warning : colors.primary} 
          />
          <View style={styles.planBannerText}>
            <Text style={styles.planBannerTitle}>
              {isPro ? 'Pro Plan' : 'Free Plan'}
            </Text>
            <Text style={styles.planBannerSubtitle}>
              {isPro 
                ? 'Unlimited notices' 
                : `${noticesRemaining} notice${noticesRemaining !== 1 ? 's' : ''} remaining`
              }
            </Text>
          </View>
        </View>
        {!isPro && (
          <View style={styles.upgradeBadge}>
            <Text style={styles.upgradeBadgeText}>Upgrade</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textInverse} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="folder-open-outline" size={64} color={colors.gray300} />
      </View>
      <Text style={styles.emptyTitle}>No Projects Yet</Text>
      <Text style={styles.emptyText}>
        Create your first project to generate a preliminary notice and protect your lien rights.
      </Text>
      <Button
        title="Create Your First Project"
        onPress={handleNewProject}
        size="lg"
        style={styles.emptyButton}
      />
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* Plan Banner */}
      {renderPlanBanner()}

      {/* Notification Banner */}
      {showNotificationBanner && permissionStatus !== 'granted' && (
        <NotificationBanner 
          onDismiss={() => setShowNotificationBanner(false)} 
        />
      )}
      
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
          <Text style={styles.statNumber}>{projects.length}</Text>
          <Text style={styles.statLabel}>Total Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="alert-circle" size={24} color={colors.warning} />
          <Text style={styles.statNumber}>
            {projects.filter(p => p.status === 'draft').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="notifications" size={24} color={colors.success} />
          <Text style={styles.statNumber}>{reminders.length}</Text>
          <Text style={styles.statLabel}>Reminders</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => router.push('/(app)/templates')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="copy-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickActionText}>Templates</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => router.push('/(app)/export')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickActionText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => router.push('/(app)/pricing')}
        >
          <View style={styles.quickActionIcon}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickActionText}>Pricing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Show loading while checking disclaimer status
  if (disclaimerLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* First Use Disclaimer Modal - Cannot be dismissed */}
      <FirstUseDisclaimerModal 
        visible={!hasAcknowledgedDisclaimer}
        onAccept={handleDisclaimerAccept}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/694c0f1ba40221f0cf4c61ac_1766599383355_ba484813.jpg' }}
            style={styles.headerLogo}
          />
          <View>
            <Text style={styles.headerTitle}>Prelimpro</Text>
            <Text style={styles.headerSubtitle}>
              {user?.email?.split('@')[0] || 'Welcome'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={handleNotificationsPress} 
            style={styles.headerButton}
          >
            <Ionicons 
              name={permissionStatus === 'granted' ? 'notifications' : 'notifications-outline'} 
              size={24} 
              color={permissionStatus === 'granted' ? colors.primary : colors.gray500} 
            />
            {reminders.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {reminders.length > 9 ? '9+' : reminders.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/(app)/settings')} 
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={24} color={colors.gray500} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.headerButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.gray500} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard 
            project={item} 
            onPress={() => handleProjectPress(item)} 
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={[
          styles.listContent,
          projects.length === 0 && styles.emptyListContent
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      {/* FAB - New Project Button */}
      {projects.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleNewProject}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color={colors.textInverse} />
        </TouchableOpacity>
      )}

      <DisclaimerFooter />

      {/* Upgrade Modal */}
      <UpgradeModal 
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  headerButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textInverse,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  planBannerFree: {
    backgroundColor: colors.primaryLight + '15',
    borderWidth: 1,
    borderColor: colors.primaryLight + '30',
  },
  planBannerPro: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  planBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planBannerText: {
    gap: 2,
  },
  planBannerTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  planBannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  upgradeBadgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
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
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    minWidth: 250,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 80,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  quickActionText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
