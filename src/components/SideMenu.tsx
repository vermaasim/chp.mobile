import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Surface, Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

export interface SideMenuItem {
  key: string;
  label: string;
}

interface SideMenuProps {
  visible: boolean;
  items: SideMenuItem[];
  activeItemKey: string;
  onSelectItem: (key: string) => void;
  onClose: () => void;
}

export function SideMenu({
  visible,
  items,
  activeItemKey,
  onSelectItem,
  onClose,
}: SideMenuProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Surface style={styles.drawer} elevation={2}>
          <Text style={styles.menuTitle}>Menu</Text>

          {items.map((item) => {
            const isActive = item.key === activeItemKey;

            return (
              <Button
                key={item.key}
                mode={isActive ? 'contained' : 'contained-tonal'}
                buttonColor={isActive ? themeColors.primary : themeColors.surfaceMuted}
                textColor={isActive ? themeColors.textOnBrand : themeColors.textPrimary}
                onPress={() => onSelectItem(item.key)}
                style={styles.itemButton}
                labelStyle={styles.itemLabel}
                contentStyle={styles.itemButtonContent}
              >
                {item.label}
              </Button>
            );
          })}
        </Surface>

        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    width: 250,
    height: '100%',
    backgroundColor: themeColors.surface,
    borderRightWidth: 1,
    borderRightColor: themeColors.border,
    paddingTop: 24,
    paddingHorizontal: 16,
    borderRadius: 0,
  },
  menuTitle: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 18,
  },
  itemButton: {
    borderRadius: 12,
    marginBottom: 10,
  },
  itemButtonContent: {
    minHeight: 44,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
