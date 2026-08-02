import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { themeColors } from '../../theme/colors';

export interface TodaySummaryCardItem {
  key: string;
  label: string;
  value: string;
  metric?: string;
}

interface TodaySummaryCardsProps {
  items: TodaySummaryCardItem[];
  onSelectItem?: (item: TodaySummaryCardItem) => void;
}

const DEFAULT_VISIBLE_ITEMS = 4;

export function TodaySummaryCards({ items, onSelectItem }: TodaySummaryCardsProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = useMemo(() => (expanded ? items : items.slice(0, DEFAULT_VISIBLE_ITEMS)), [expanded, items]);
  const shouldShowToggle = items.length > DEFAULT_VISIBLE_ITEMS;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {visibleItems.map((item) => (
          <Pressable key={item.key} style={styles.pill} onPress={() => onSelectItem?.(item)}>
            <Text style={styles.label}>{item.label}</Text>
            <Text numberOfLines={1} style={styles.value}>{item.value}</Text>
          </Pressable>
        ))}
      </View>
      {shouldShowToggle ? (
        <Pressable style={styles.toggleRow} onPress={() => setExpanded((prev) => !prev)}>
          <Text style={styles.toggleText}>{expanded ? 'View less' : 'View more'}</Text>
          <IconButton icon={expanded ? 'chevron-up' : 'chevron-down'} size={16} style={styles.toggleIcon} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    minWidth: 120,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  label: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    alignSelf: 'flex-end',
  },
  toggleText: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleIcon: {
    margin: 0,
  },
});
