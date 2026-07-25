import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Facility } from '../types/auth';
import { themeColors } from '../theme/colors';

interface FacilitySelectionScreenProps {
  facilities: Facility[];
  selectedFacilityId: string | null;
  onConfirm: (facilityId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

function formatFacilityAddress(facility: Facility) {
  return [facility.addressLine2, facility.city].filter(Boolean).join(', ');
}

export function FacilitySelectionScreen({
  facilities,
  selectedFacilityId,
  onConfirm,
  onSignOut,
}: FacilitySelectionScreenProps) {
  const defaultFacility = selectedFacilityId ?? (facilities?.length > 0 ? facilities[0]?.id : null);
  const [chosenFacilityId, setChosenFacilityId] = useState<string | null>(defaultFacility);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!chosenFacilityId && facilities.length > 0) {
      setChosenFacilityId(selectedFacilityId ?? facilities[0].id);
    }
  }, [chosenFacilityId, facilities, selectedFacilityId]);

  const selectedFacilityName = useMemo(() => {
    const selected = facilities?.find((facility) => facility.id === chosenFacilityId);
    return selected?.name ?? 'Select facility';
  }, [facilities, chosenFacilityId]);

  const submitSelection = async () => {
    if (!chosenFacilityId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(chosenFacilityId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
        <Text style={styles.kicker}>Click Health Pro</Text>
        <Text style={styles.title}>Select Facility</Text>
        <Text style={styles.subtitle}>
          You are associated with more than one facility. Choose one to continue.
        </Text>

        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeLabel}>Current selection</Text>
          <Text style={styles.selectedBadgeValue}>{selectedFacilityName}</Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {facilities?.map((facility) => {
            const isActive = facility.id === chosenFacilityId;
            const facilityAddress = formatFacilityAddress(facility);

            return (
              <Pressable
                key={facility.id}
                accessibilityRole="button"
                onPress={() => setChosenFacilityId(facility.id)}
                style={[styles.facilityRow, isActive ? styles.facilityRowActive : null]}
              >
                <View style={styles.facilityRadio}>{isActive ? <View style={styles.facilityRadioDot} /> : null}</View>
                <View style={styles.facilityInfo}>
                  <Text style={styles.facilityName}>{facility.name}</Text>
                  {facilityAddress ? <Text style={styles.facilityAddress}>{facilityAddress}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onSignOut()}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>Sign out</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!chosenFacilityId || isSubmitting}
            onPress={submitSelection}
            style={[
              styles.primaryAction,
              !chosenFacilityId || isSubmitting ? styles.primaryActionDisabled : null,
            ]}
          >
            <Text style={styles.primaryActionText}>{isSubmitting ? 'Saving...' : 'Continue'}</Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: themeColors.appBackground,
  },
  screenContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  card: {
    borderRadius: 22,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 18,
    paddingVertical: 20,
    maxHeight: '88%',
  },
  kicker: {
    color: themeColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: themeColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  selectedBadge: {
    backgroundColor: themeColors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    marginBottom: 12,
  },
  selectedBadgeLabel: {
    color: themeColors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  selectedBadgeValue: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    maxHeight: 300,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  facilityRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  facilityRowActive: {
    borderColor: themeColors.secondary,
    backgroundColor: '#FFF7F2',
  },
  facilityRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: themeColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.secondary,
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  facilityAddress: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  secondaryActionText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryAction: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: themeColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  primaryActionDisabled: {
    opacity: 0.6,
  },
  primaryActionText: {
    color: themeColors.textOnBrand,
    fontSize: 14,
    fontWeight: '700',
  },
});
