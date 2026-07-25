import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { themeColors } from '../../theme/colors';

export interface TodaySummaryCardItem {
  key: string;
  label: string;
  value: string;
}

interface TodaySummaryCardsProps {
  items: TodaySummaryCardItem[];
}

export function TodaySummaryCards({ items }: TodaySummaryCardsProps) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.key} style={styles.pill}>
          <Text style={styles.label}>{item.label}</Text>
          <Text numberOfLines={1} style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 10,
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
});
