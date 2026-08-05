import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeColors } from '../../theme/colors';
import type { RecordCreateOption, RecordCreateOptionKey } from './recordFlow';

interface RecordTypeChooserSheetProps {
  visible: boolean;
  options: RecordCreateOption[];
  onClose: () => void;
  onSelect: (key: RecordCreateOptionKey) => void;
}

type SheetSection = {
  title: string;
  keys: RecordCreateOptionKey[];
  accent: string;
};

const SHEET_SECTIONS: SheetSection[] = [
  {
    title: 'Prescriptions',
    keys: ['generalRx', 'physiotherapyRx', 'frozenShoulderRx'],
    accent: themeColors.primary,
  },
  {
    title: 'Notes',
    keys: ['generalNotes', 'physiotherapyTxNotes'],
    accent: themeColors.secondary,
  },
  {
    title: 'Other',
    keys: ['diagram', 'medicalRecord'],
    accent: '#6A6F73',
  },
];

function getOptionIcon(key: RecordCreateOptionKey): keyof typeof Feather.glyphMap {
  if (key === 'generalRx') return 'file-text';
  if (key === 'physiotherapyRx') return 'activity';
  if (key === 'frozenShoulderRx') return 'shield';
  if (key === 'generalNotes') return 'edit-3';
  if (key === 'physiotherapyTxNotes') return 'clipboard';
  if (key === 'diagram') return 'pen-tool';
  return 'folder';
}

function getCompactLabel(key: RecordCreateOptionKey, fallback: string) {
  if (key === 'physiotherapyRx') return 'Physio Rx';
  if (key === 'frozenShoulderRx') return 'Frozen shoulder';
  if (key === 'generalNotes') return 'General notes';
  if (key === 'physiotherapyTxNotes') return 'Physio notes';
  if (key === 'medicalRecord') return 'Medical record';

  return fallback;
}

export function RecordTypeChooserSheet({ visible, options, onClose, onSelect }: RecordTypeChooserSheetProps) {
  const insets = useSafeAreaInsets();
  const optionMap = new Map(options.map((option) => [option.key, option]));

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View>
          <Pressable style={styles.sheetCard} onPress={() => null}>
            <View style={styles.dragHandle} />

            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Add record</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close add record sheet" onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={17} color={themeColors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {SHEET_SECTIONS.map((section) => {
                const sectionOptions = section.keys.map((key) => optionMap.get(key)).filter(Boolean) as RecordCreateOption[];

                if (sectionOptions.length === 0) {
                  return null;
                }

                return (
                  <View key={section.title} style={styles.sectionBlock}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.grid}>
                      {sectionOptions.map((option) => (
                        <Pressable
                          key={option.key}
                          accessibilityRole="button"
                          onPress={() => onSelect(option.key)}
                          style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
                        >
                          <View style={[styles.tileIconWrap, { backgroundColor: `${section.accent}1A` }]}>
                            <Feather name={getOptionIcon(option.key)} size={16} color={section.accent} />
                          </View>
                          <Text style={styles.tileLabel} numberOfLines={2}>
                            {getCompactLabel(option.key, option.label)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    paddingHorizontal: 0,
  },
  sheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E7E2D9',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 12,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#94908A',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 12,
  },
  tile: {
    width: '30.6%',
    minHeight: 84,
    borderRadius: 14,
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  tilePressed: {
    opacity: 0.88,
  },
  tileIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});
