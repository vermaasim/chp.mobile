import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Surface, Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

export interface SideMenuItem {
  key: string;
  label: string;
  icon?: string;
  group?: string;
  disabled?: boolean;
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
  const groupedItems = items.reduce<Record<string, SideMenuItem[]>>((acc, item) => {
    const groupKey = item.group ?? 'Main';
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {});

  const groupEntries = Object.entries(groupedItems);
  const showGroupTitles = groupEntries.length > 1;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Surface style={styles.drawer} elevation={2}>
          <Text style={styles.menuTitle}>Menu</Text>

          {groupEntries.map(([groupName, groupItems]) => (
            <View key={groupName} style={styles.groupWrap}>
              {showGroupTitles ? <Text style={styles.groupTitle}>{groupName}</Text> : null}
              {groupItems.map((item) => {
                const isActive = !item.disabled && item.key === activeItemKey;

                return (
                  <Button
                    key={item.key}
                    mode={isActive ? 'contained' : 'contained-tonal'}
                    icon={item.icon}
                    disabled={item.disabled}
                    buttonColor={isActive ? themeColors.primary : themeColors.surfaceMuted}
                    textColor={isActive ? themeColors.textOnBrand : themeColors.textPrimary}
                    onPress={() => {
                      if (item.disabled) {
                        return;
                      }
                      onSelectItem(item.key);
                    }}
                    style={styles.itemButton}
                    labelStyle={styles.itemLabel}
                    contentStyle={styles.itemButtonContent}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </View>
          ))}
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
    paddingBottom: 18,
    borderRadius: 0,
  },
  menuTitle: {
    color: themeColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  menuSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  groupWrap: {
    marginBottom: 12,
  },
  groupTitle: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  itemButton: {
    borderRadius: 10,
    marginBottom: 8,
  },
  itemButtonContent: {
    minHeight: 44,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
