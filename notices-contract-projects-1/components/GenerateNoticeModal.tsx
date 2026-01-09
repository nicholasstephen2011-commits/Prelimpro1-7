import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import Button from './Button';

interface GenerateNoticeModalProps {
  visible: boolean;
  onAccept: () => void;
  onCancel: () => void;
  actionType?: 'generate' | 'preview' | 'send';
}

export default function GenerateNoticeModal({ 
  visible, 
  onAccept, 
  onCancel,
  actionType = 'generate'
}: GenerateNoticeModalProps) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      setAccepted(false); // Reset for next time
      onAccept();
    }
  };

  const handleCancel = () => {
    setAccepted(false); // Reset for next time
    onCancel();
  };

  const getActionText = () => {
    switch (actionType) {
      case 'preview':
        return 'preview this notice';
      case 'send':
        return 'send this notice';
      default:
        return 'generate this notice';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Warning Header */}
            <View style={styles.warningHeader}>
              <View style={styles.warningIconContainer}>
                <Ionicons name="warning" size={32} color={colors.warning} />
              </View>
              <Text style={styles.warningTitle}>Important Notice</Text>
            </View>

            {/* Warning Message */}
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                This generates a <Text style={styles.bold}>template only</Text>.
              </Text>
              
              <View style={styles.warningDivider} />
              
              <Text style={styles.warningText}>
                Verify all information and current law before use.
              </Text>
              
              <View style={styles.warningDivider} />
              
              <Text style={[styles.warningText, styles.emphasisText]}>
                We make no guarantees of validity or lien rights.
              </Text>
            </View>

            {/* Responsibility Checklist */}
            <View style={styles.checklistContainer}>
              <Text style={styles.checklistTitle}>Before proceeding, ensure you have:</Text>
              
              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.gray400} />
                <Text style={styles.checklistText}>Verified all entered information is accurate</Text>
              </View>
              
              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.gray400} />
                <Text style={styles.checklistText}>Confirmed current state law requirements</Text>
              </View>
              
              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.gray400} />
                <Text style={styles.checklistText}>Understood your filing deadlines</Text>
              </View>
              
              <View style={styles.checklistItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.gray400} />
                <Text style={styles.checklistText}>Consulted an attorney if needed</Text>
              </View>
            </View>

            {/* Acceptance Checkbox */}
            <TouchableOpacity 
              style={[styles.acceptanceContainer, accepted && styles.acceptanceContainerChecked]}
              onPress={() => setAccepted(!accepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                {accepted && <Ionicons name="checkmark" size={18} color={colors.textInverse} />}
              </View>
              <Text style={styles.acceptanceText}>
                I accept full responsibility for verifying this notice and its use
              </Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={handleCancel}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title={`Proceed to ${actionType === 'preview' ? 'Preview' : actionType === 'send' ? 'Send' : 'Generate'}`}
                onPress={handleAccept}
                disabled={!accepted}
                style={styles.proceedButton}
              />
            </View>

            {/* Footer Note */}
            <Text style={styles.footerNote}>
              This acknowledgment is required each time you {getActionText()}.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
    ...shadows.lg,
  },
  warningHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  warningTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  warningCard: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningText: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  warningDivider: {
    height: 1,
    backgroundColor: colors.warning + '30',
    marginVertical: spacing.sm,
  },
  bold: {
    fontWeight: '700',
  },
  emphasisText: {
    fontWeight: '700',
    color: colors.warning,
  },
  checklistContainer: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  checklistTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  checklistText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  acceptanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gray200,
  },
  acceptanceContainerChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.gray300,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  acceptanceText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  proceedButton: {
    flex: 2,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
});
