import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Surface, Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

interface ProfileMenuProps {
  visible: boolean;
  displayName: string;
  email: string;
  onSignOut: () => void;
  onClose: () => void;
}

export function ProfileMenu({
  visible,
  displayName,
  email,
  onSignOut,
  onClose,
}: ProfileMenuProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Surface style={styles.menuCard} elevation={2}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>

          <Button mode="contained" onPress={onSignOut} buttonColor={themeColors.secondary}>
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
    top: 90,
    right: 18,
    width: 260,
    borderRadius: 16,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 14,
  },
  name: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    color: themeColors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
});
