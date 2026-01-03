import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

export default function DisclaimerFooter() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Tool only • Not legal advice • Consult attorney
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray100,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  text: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
