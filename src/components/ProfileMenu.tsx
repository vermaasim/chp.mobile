import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Divider, Surface, Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

interface ProfileMenuProps {
  visible: boolean;
  displayName: string;
  email: string;
  onViewAttendance: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

export function ProfileMenu({
  visible,
  displayName,
  email,
  onViewAttendance,
  onSignOut,
  onClose,
}: ProfileMenuProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Surface style={styles.menuCard} elevation={2}>
          <Text style={styles.sectionLabel}>Account</Text>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>

          <Divider style={styles.divider} />

          <Button
            mode="outlined"
            onPress={onViewAttendance}
            style={styles.attendanceButton}
            contentStyle={styles.attendanceButtonContent}
            labelStyle={styles.attendanceButtonLabel}
          >
            View attendance
          </Button>

          <Button
            mode="contained"
            onPress={onSignOut}
            buttonColor={themeColors.secondary}
            style={styles.signOutButton}
            contentStyle={styles.signOutButtonContent}
            labelStyle={styles.signOutButtonLabel}
          >
            Sign out
          </Button>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  menuCard: {
    position: 'absolute',
    top: 94,
    right: 18,
    width: 260,
    borderRadius: 14,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionLabel: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  name: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    color: themeColors.textSecondary,
    fontSize: 13,
    marginBottom: 10,
  },
  divider: {
    marginBottom: 12,
    backgroundColor: themeColors.border,
  },
  attendanceButton: {
    marginBottom: 10,
    borderColor: themeColors.primary,
  },
  attendanceButtonContent: {
    minHeight: 42,
  },
  attendanceButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.primary,
  },
  signOutButton: {
    marginTop: 2,
  },
  signOutButtonContent: {
    minHeight: 42,
  },
  signOutButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
