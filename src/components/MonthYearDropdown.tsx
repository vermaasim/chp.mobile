import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { themeColors } from '../theme/colors';

export interface MonthYearOption {
  key: string;
  label: string;
  month: number;
  year: number;
}

interface MonthYearDropdownProps {
  options: MonthYearOption[];
  selectedKey: string;
  onSelect: (option: MonthYearOption) => void;
}

export function MonthYearDropdown({ options, selectedKey, onSelect }: MonthYearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.key === selectedKey) ?? options[0] ?? null,
    [options, selectedKey],
  );

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        style={styles.trigger}
        onPress={() => setIsOpen((prev) => !prev)}
      >
        <Text style={styles.triggerText}>{selectedOption?.label ?? 'Select month'}</Text>
        <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.menu}>
          <ScrollView style={styles.menuScroll} nestedScrollEnabled>
            {options.sort((a, b) => b.key.localeCompare(a.key)).map((option) => {
              const isSelected = option.key === selectedKey;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  style={[styles.option, isSelected ? styles.optionSelected : null]}
                  onPress={() => {
                    onSelect(option);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                    {option.label}
                  </Text>
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
    width: '100%',
  },
  trigger: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  chevron: {
    color: themeColors.textSecondary,
    fontSize: 10,
  },
  menu: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    overflow: 'hidden',
  },
  menuScroll: {
    maxHeight: 220,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E7F0F0',
  },
  optionSelected: {
    backgroundColor: '#FFF1E8',
  },
  optionText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: themeColors.secondary,
  },
});
