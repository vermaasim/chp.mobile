import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Checkbox, IconButton, Surface, Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

export interface BottomBarPreferenceOption {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
}

interface BottomBarPreferencesModalProps {
  visible: boolean;
  options: BottomBarPreferenceOption[];
  selectedKeys: string[];
  maxSelection?: number;
  onClose: () => void;
  onSave: (selectedKeys: string[]) => void;
}

export function BottomBarPreferencesModal({
  visible,
  options,
  selectedKeys,
  maxSelection = 3,
  onClose,
  onSave,
}: BottomBarPreferencesModalProps) {
  const [draftSelectedKeys, setDraftSelectedKeys] = useState<string[]>(selectedKeys);

  useEffect(() => {
    if (visible) {
      setDraftSelectedKeys(selectedKeys);
    }
  }, [visible, selectedKeys]);

  const selectedSet = useMemo(() => new Set(draftSelectedKeys), [draftSelectedKeys]);
  const canSelectMore = draftSelectedKeys.length < maxSelection;

  const toggleOption = (key: string) => {
    setDraftSelectedKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }

      if (current.length >= maxSelection) {
        return current;
      }

      return [...current, key];
    });
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Surface style={styles.sheet} elevation={2}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Bottom bar preferences</Text>
              <Text style={styles.subtitle}>Home stays fixed. Choose up to {maxSelection} more modules.</Text>
            </View>
            <IconButton icon="close" size={18} onPress={onClose} style={styles.closeButton} />
          </View>

          <View style={styles.counterWrap}>
            <Text style={styles.counterText}>{draftSelectedKeys.length} of {maxSelection} selected</Text>
          </View>

          <ScrollView contentContainerStyle={styles.optionList} showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const selected = selectedSet.has(option.key);
              const disabled = !selected && !canSelectMore;

              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  onPress={() => toggleOption(option.key)}
                  style={[styles.optionRow, selected ? styles.optionRowSelected : null, disabled ? styles.optionRowDisabled : null]}
                >
                  <View style={styles.optionIconWrap}>
                    <IconButton icon={option.icon} size={18} iconColor={selected ? themeColors.primary : themeColors.textSecondary} style={styles.optionIcon} />
                  </View>

                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>

                  <Checkbox.Android
                    status={selected ? 'checked' : 'unchecked'}
                    color={themeColors.primary}
                    uncheckedColor={themeColors.textSecondary}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footerRow}>
            <Button mode="text" onPress={onClose} textColor={themeColors.textSecondary}>
              Cancel
            </Button>
            <Button mode="contained" onPress={() => onSave(draftSelectedKeys)} buttonColor={themeColors.primary}>
              Save
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    maxHeight: '78%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
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
    lineHeight: 18,
  },
  closeButton: {
    margin: -6,
  },
  counterWrap: {
    marginTop: 12,
    marginBottom: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: themeColors.surfaceMuted,
  },
  counterText: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  optionList: {
    gap: 10,
    paddingBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  optionRowSelected: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.successSurface,
  },
  optionRowDisabled: {
    opacity: 0.58,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surfaceMuted,
  },
  optionIcon: {
    margin: 0,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  optionSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  footerRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});