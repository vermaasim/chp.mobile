import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

interface InfoPlaceholderProps {
  title: string;
}

export function InfoPlaceholder({ title }: InfoPlaceholderProps) {
  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.contentWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>This page is in making.</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingVertical: 26,
    paddingHorizontal: 20,
    minHeight: 180,
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: themeColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
