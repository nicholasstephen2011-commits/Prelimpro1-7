import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Linking, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { stateResources } from '../../../constants/stateResources';
import { colors, spacing, borderRadius, typography } from '../../../constants/theme';

export default function StateDetailScreen() {
  const router = useRouter();
  const { abbr } = useLocalSearchParams<{ abbr?: string }>();

  const state = useMemo(
    () => stateResources.find((s) => s.abbr.toLowerCase() === (abbr || '').toLowerCase()),
    [abbr]
  );

  if (!abbr || Array.isArray(abbr)) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.content}>
          <Text style={styles.title}>Invalid state</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open link', 'This link is not supported on your device.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to open link';
      Alert.alert('Error', message);
    }
  };

  if (!state) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>State not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const linkItems = [
    state.formUrl ? { label: 'Form / Template', url: state.formUrl } : null,
    state.statuteUrl ? { label: 'Statute / Official Source', url: state.statuteUrl } : null,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{state.name}</Text>
        {state.noticeName ? (
          <Text style={styles.subtitle}>{state.noticeName}</Text>
        ) : null}

        {state.requiredInfo && state.requiredInfo.length > 0 && (
          <Section title="Required Information" items={state.requiredInfo} />
        )}

        {state.recipients && state.recipients.length > 0 && (
          <Section title="Who Must Receive" items={state.recipients} />
        )}

        {state.deadlines && state.deadlines.length > 0 && (
          <Section title="Deadlines" items={state.deadlines} />
        )}

        {state.wording && state.wording.length > 0 && (
          <Section title="Required Wording" items={state.wording} />
        )}

        {state.delivery && state.delivery.length > 0 && (
          <Section title="Delivery Methods" items={state.delivery} />
        )}

        {linkItems.length > 0 ? (
          <FlatList
            data={linkItems}
            keyExtractor={(item) => item.url}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.linkCard} onPress={() => openUrl(item.url)}>
                <Text style={styles.linkLabel}>{item.label}</Text>
                <Text style={styles.linkUrl} numberOfLines={2}>
                  {item.url}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            contentContainerStyle={{ paddingVertical: spacing.md }}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.body}>No links available for this state.</Text>
        )}

        <Text style={styles.disclaimer}>
          This is general information, not legal advice. Verify current requirements in the cited statutes.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  body: { ...typography.body, color: colors.textSecondary },
  linkCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  linkLabel: { ...typography.bodySmall, fontWeight: '600', color: colors.primary, marginBottom: spacing.xs },
  linkUrl: { ...typography.caption, color: colors.textSecondary },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  backText: { ...typography.body, color: colors.textPrimary },
  disclaimer: { ...typography.caption, color: colors.textMuted },
});

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ ...typography.h3, color: colors.textPrimary }}>{title}</Text>
      <View style={{ gap: spacing.xs }}>
        {items.map((item) => (
          <Text key={item} style={{ ...typography.body, color: colors.textSecondary }}>
            • {item}
          </Text>
        ))}
      </View>
    </View>
  );
}
