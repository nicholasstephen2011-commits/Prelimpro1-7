import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { stateResources } from '../../constants/stateResources';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

export default function StateResourcesScreen() {
  const router = useRouter();

  const openDetail = (item: (typeof stateResources)[number]) => {
    router.push(`/states/${item.abbr.toLowerCase()}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>State Preliminary Notice Resources</Text>
        <Text style={styles.subtitle}>
          Tap a state abbreviation for the official preliminary notice form (if provided) or the mechanics lien statute. Government sources only.
        </Text>

        <FlatList
          data={stateResources}
          numColumns={3}
          keyExtractor={(item) => item.abbr}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openDetail(item)}
              style={styles.card}
              activeOpacity={0.8}
            >
              <Text style={styles.abbr}>{item.abbr}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.gray50,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  abbr: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '800',
  },
  name: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
