import { Pressable, StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { themeColors } from '../theme/colors';

export interface ContextActionBarAction {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}

interface ContextActionBarProps {
  visible: boolean;
  selectedCount: number;
  actions: ContextActionBarAction[];
  onClearSelection: () => void;
}

export function ContextActionBar({
  visible,
  selectedCount,
  actions,
  onClearSelection,
}: ContextActionBarProps) {
  if (!visible) {
    return null;
  }

  return (
    <Surface style={styles.container} elevation={3}>
      <View style={styles.headerRow}>
        <Text style={styles.selectionText}>{selectedCount} selected</Text>
        <Pressable accessibilityRole="button" onPress={onClearSelection} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            disabled={action.disabled}
            onPress={action.onPress}
            style={[styles.actionButton, action.disabled ? styles.actionButtonDisabled : null]}
          >
            <Feather name={action.icon} size={16} color={themeColors.textOnBrand} />
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 16,
    backgroundColor: themeColors.textPrimary,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectionText: {
    color: themeColors.textOnBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  clearButton: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  clearText: {
    color: themeColors.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: themeColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: themeColors.textOnBrand,
    fontSize: 12,
    fontWeight: '700',
  },
});