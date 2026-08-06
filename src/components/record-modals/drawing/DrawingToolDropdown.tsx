import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { themeColors } from '../../../theme/colors';

export interface DrawingToolDropdownOption<TValue extends string | number> {
  label: string;
  value: TValue;
  accentColor?: string;
}

interface DrawingToolDropdownProps<TValue extends string | number> {
  selectedValue: TValue;
  options: DrawingToolDropdownOption<TValue>[];
  onSelect: (value: TValue) => void;
  styleVariant?: 'compact' | 'default';
}

export function DrawingToolDropdown<TValue extends string | number>({
  selectedValue,
  options,
  onSelect,
  styleVariant = 'compact',
}: DrawingToolDropdownProps<TValue>) {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue) ?? options[0],
    [options, selectedValue],
  );
  const showSelectedLabel = Boolean((selectedOption?.label ?? '').trim());

  return (
    <View style={[styles.container, open ? styles.containerOpen : null]}>
      <Pressable
        accessibilityRole="button"
        style={[
          styles.trigger,
          styleVariant === 'compact' ? styles.triggerCompact : null,
          open ? styles.triggerOpen : null,
        ]}
        onPress={() => setOpen((currentValue) => !currentValue)}
      >
        <View style={styles.triggerValueRow}>
          {selectedOption?.accentColor ? <View style={[styles.colorDot, { backgroundColor: selectedOption.accentColor }]} /> : null}
          {showSelectedLabel ? <Text style={styles.triggerText}>{selectedOption?.label ?? 'Select'}</Text> : null}
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={15} color={themeColors.textSecondary} />
      </Pressable>

      {open ? (
        <View style={styles.menu}>
          <ScrollView style={styles.menuScroll} nestedScrollEnabled>
            {options.map((option) => {
              const isSelected = option.value === selectedValue;
              return (
                <Pressable
                  key={String(option.value)}
                  accessibilityRole="button"
                  style={[styles.option, isSelected ? styles.optionSelected : null]}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                >
                  <View style={styles.optionRow}>
                    {option.accentColor ? <View style={[styles.colorDot, { backgroundColor: option.accentColor }]} /> : null}
                    <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>{option.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    minWidth: 0,
    zIndex: 8,
    overflow: 'visible',
  },
  containerOpen: {
    zIndex: 60,
    elevation: 30,
  },
  trigger: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  triggerCompact: {
    minHeight: 34,
  },
  triggerOpen: {
    borderColor: themeColors.primary,
  },
  triggerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
    flex: 1,
  },
  triggerText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  menu: {
    position: 'absolute',
    top: 38,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    overflow: 'hidden',
    zIndex: 80,
    shadowColor: '#102A2B',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 25,
  },
  menuScroll: {
    maxHeight: 200,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E7F0F0',
  },
  optionSelected: {
    backgroundColor: themeColors.successSurface,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: themeColors.primary,
  },
  colorDot: {
    width: 15,
    height: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6E4E5',
  },
});