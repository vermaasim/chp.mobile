import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppMapHandle, AppMapProps } from './AppMap.types';

export const AppMap = forwardRef<AppMapHandle, AppMapProps>(function AppMap(
  { allowedLocations, userLocation },
  ref,
) {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {
      // No-op on web fallback implementation.
    },
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map preview is not available on web yet.</Text>
      <Text style={styles.subtitle}>Run on iOS or Android to view interactive maps.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allowed locations: {allowedLocations.length}</Text>
        {allowedLocations.slice(0, 3).map((location) => (
          <Text key={location.id} style={styles.row}>
            {location.name} ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})
          </Text>
        ))}
      </View>

      {userLocation ? (
        <Text style={styles.row}>
          You: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 200,
    width: '100%',
    backgroundColor: '#111B2D',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 6,
  },
  title: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#93A3BB',
    fontSize: 12,
    marginBottom: 6,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: '#D8E0EC',
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    color: '#93A3BB',
    fontSize: 12,
  },
});
