import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { themeColors } from '../../theme/colors';
import type { RecordCreateOption, RecordCreateOptionKey } from './recordFlow';

interface RecordTypeChooserSheetProps {
  visible: boolean;
  options: RecordCreateOption[];
  onClose: () => void;
  onSelect: (key: RecordCreateOptionKey) => void;
}

export function RecordTypeChooserSheet({ visible, options, onClose, onSelect }: RecordTypeChooserSheetProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheetCard}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Record</Text>
              <Text style={styles.subtitle}>Choose what you want to add for this service.</Text>
            </View>

            <View style={styles.optionsWrap}>
              {options.map((option) => (
                <Pressable key={option.key} onPress={() => onSelect(option.key)}>
                  <Card mode="outlined" style={styles.optionCard}>
                    <Card.Content style={styles.optionContent}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </Card.Content>
                  </Card>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  sheetCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    padding: 12,
    gap: 10,
    maxHeight: '82%',
  },
  header: {
    gap: 4,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  optionsWrap: {
    gap: 8,
  },
  optionCard: {
    borderRadius: 12,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
  },
  optionContent: {
    gap: 4,
    paddingVertical: 12,
  },
  optionLabel: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  optionDescription: {
    color: themeColors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  cancelButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cancelText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
