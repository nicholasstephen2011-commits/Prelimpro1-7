import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../constants/theme';

interface DisclaimerFooterProps {
  showLinks?: boolean;
}

export default function DisclaimerFooter({ showLinks = true }: DisclaimerFooterProps) {
  const router = useRouter();

  const handleTermsPress = () => {
    // Navigate to terms screen or open external link
    Linking.openURL('https://prelimpro.com/terms');
  };

  const handlePrivacyPress = () => {
    // Navigate to privacy screen or open external link
    Linking.openURL('https://prelimpro.com/privacy');
  };

  return (
    <View style={styles.container}>
      {/* Main Disclaimer - Bold and Prominent */}
      <Text style={styles.mainDisclaimer}>
        Tool only • Not legal advice • Consult an attorney
      </Text>
      
      {/* Links */}
      {showLinks && (
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={handleTermsPress}>
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>|</Text>
          <TouchableOpacity onPress={handlePrivacyPress}>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray800,
    borderTopWidth: 1,
    borderTopColor: colors.gray700,
  },
  mainDisclaimer: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.warningLight,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  link: {
    ...typography.caption,
    color: colors.gray400,
    textDecorationLine: 'underline',
  },
  separator: {
    ...typography.caption,
    color: colors.gray500,
    marginHorizontal: spacing.sm,
  },
});
