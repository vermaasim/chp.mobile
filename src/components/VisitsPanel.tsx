import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateRangeFilterCard } from './DateRangeFilterCard';
import { loadFacilityVisits } from '../api/visits';
import { loadVisitsDateFilterPreference, saveVisitsDateFilterPreference } from '../storage/visitsFilter';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import type { VisitStatus, VisitSummary } from '../types/visits';
import { getRangeForOption, toUtcIsoRange, type DateFilterOption } from '../utils/dateRangeFilter';

interface VisitsPanelProps {
  token: string;
  facilityId: string;
  onOpenVisitDetails: (visitId: string) => void;
  onOpenCreateVisit: () => void;
}

const STATUS_FILTERS: Array<{ key: VisitStatus; label: string }> = [
  { key: 'Scheduled', label: 'Scheduled' },
  { key: 'CheckedIn', label: 'Checked In' },
  { key: 'InProgress', label: 'In Progress' },
  { key: 'Completed', label: 'Completed' },
  { key: 'NoShow', label: 'No Show' },
  { key: 'Cancelled', label: 'Cancelled' },
];

function getVisitStatus(status?: string): VisitStatus {
  return (status ?? 'Scheduled') as VisitStatus;
}

function formatVisitDate(value?: string) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPatientName(visit: VisitSummary) {
  return [visit.patientPrefix, visit.patientFirstName, visit.patientLastName].filter(Boolean).join(' ').trim() || 'Unnamed Patient';
}

function formatPhysicianName(visit: VisitSummary) {
  const name = [visit.physicianPrefix, visit.physicianFirstName, visit.physicianLastName].filter(Boolean).join(' ').trim();
  return name || '-';
}

function getStatusTone(status: VisitStatus) {
  if (status === 'Completed') {
    return {
      badgeStyle: allStyles.statusBadgeCompleted,
      textStyle: allStyles.statusBadgeCompletedText,
    };
  }

  if (status === 'InProgress' || status === 'CheckedIn') {
    return {
      badgeStyle: allStyles.statusBadgeInProgress,
      textStyle: allStyles.statusBadgeInProgressText,
    };
  }

  return {
    badgeStyle: allStyles.statusBadgeNotStarted,
    textStyle: allStyles.statusBadgeNotStartedText,
  };
}

export function VisitsPanel({ token, facilityId, onOpenVisitDetails, onOpenCreateVisit }: VisitsPanelProps) {
  const insets = useSafeAreaInsets();
  const initialRange = useMemo(() => getRangeForOption('today'), []);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [selectedFilterOption, setSelectedFilterOption] = useState<DateFilterOption>('today');
  const [selectedStatuses, setSelectedStatuses] = useState<VisitStatus[]>(STATUS_FILTERS.map((item) => item.key));
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshVisits = async (nextFromDate = fromDate, nextToDate = toDate, nextStatuses = selectedStatuses) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const range = toUtcIsoRange(nextFromDate, nextToDate);
      const items = await loadFacilityVisits(token, facilityId, {
        from: range.from,
        to: range.to,
        statusList: nextStatuses,
      });
      setVisits(items ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load visits.');
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapFilter = async () => {
      const savedPreference = await loadVisitsDateFilterPreference();

      if (!isMounted) {
        return;
      }

      if (!savedPreference) {
        await refreshVisits(initialRange.fromDate, initialRange.toDate);
        return;
      }

      setSelectedFilterOption(savedPreference.option);
      setFromDate(savedPreference.fromDate);
      setToDate(savedPreference.toDate);

      await refreshVisits(savedPreference.fromDate, savedPreference.toDate);
    };

    void bootstrapFilter();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleStatus = (status: VisitStatus) => {
    const exists = selectedStatuses.includes(status);
    const next = exists ? selectedStatuses.filter((item) => item !== status) : [...selectedStatuses, status];

    if (next.length === 0) {
      return;
    }

    setSelectedStatuses(next);
    void refreshVisits(fromDate, toDate, next);
  };

  return (
    <View style={[allStyles.container, styles.panelRoot]}>
      <DateRangeFilterCard
        summaryLabel="Visits for"
        selectedOption={selectedFilterOption}
        fromDate={fromDate}
        toDate={toDate}
        onApply={async (selection) => {
          setSelectedFilterOption(selection.option);
          setFromDate(selection.fromDate);
          setToDate(selection.toDate);

          await saveVisitsDateFilterPreference({
            option: selection.option,
            fromDate: selection.fromDate,
            toDate: selection.toDate,
          });

          await refreshVisits(selection.fromDate, selection.toDate);
        }}
      />

      <View style={styles.topActionRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChipRow}>
          {STATUS_FILTERS.map((status) => {
            const selected = selectedStatuses.includes(status.key);
            return (
              <Pressable
                key={status.key}
                accessibilityRole="button"
                style={[allStyles.typeChip, selected ? allStyles.typeChipActive : null]}
                onPress={() => toggleStatus(status.key)}
              >
                <Text style={[allStyles.typeChipText, selected ? allStyles.typeChipTextActive : null]}>{status.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {errorMessage ? <Text style={allStyles.errorText}>{errorMessage}</Text> : null}

      {loading ? (
        <View style={allStyles.loadingWrap}>
          <View style={allStyles.loadingRow}>
            <ActivityIndicator size="small" color={themeColors.primary} />
            <Text style={allStyles.loadingText}>Loading visits...</Text>
          </View>
        </View>
      ) : null}

      <ScrollView style={allStyles.list} contentContainerStyle={[allStyles.listContent, styles.listContentWithFab]}>
        {visits.map((visit) => {
          const status = getVisitStatus(visit.visitStatus ?? visit.status);
          const tone = getStatusTone(status);

          return (
            <Pressable
              key={visit.id}
              accessibilityRole="button"
              onPress={() => onOpenVisitDetails(visit.id)}
              style={allStyles.taskCard}
            >
              <View style={allStyles.taskTopRow}>
                <View style={allStyles.taskNameWrap}>
                  <Text style={allStyles.taskName}>{formatPatientName(visit)}</Text>
                </View>
                <View style={allStyles.statusActionsWrap}>
                  <View style={[allStyles.statusBadge, tone.badgeStyle]}>
                    <Text style={[allStyles.statusBadgeText, tone.textStyle]}>{status.replace(/([a-z])([A-Z])/g, '$1 $2')}</Text>
                  </View>
                </View>
              </View>

              <Text numberOfLines={1} style={allStyles.taskServiceText}>Service: {visit.primaryServiceName || '-'}</Text>
              <Text numberOfLines={1} style={allStyles.taskServiceText}>Physician: {formatPhysicianName(visit)}</Text>

              <View style={allStyles.taskMetaRow}>
                <Text numberOfLines={1} style={allStyles.taskMetaItem}>ID: {visit.displayId || visit.visitDisplayId || visit.id}</Text>
                <Text numberOfLines={1} style={[allStyles.taskMetaItem, allStyles.taskMetaItemRight]}>
                  {formatVisitDate(visit.scheduledStartDateTime)}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {!loading && visits.length === 0 ? (
          <View style={allStyles.emptyState}>
            <Feather name="calendar" size={18} color={themeColors.textSecondary} />
            <Text style={allStyles.emptyText}>No visits found for this filter</Text>
            <Text style={allStyles.emptySubText}>Try changing date or status filters.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create new visit"
        onPress={onOpenCreateVisit}
        style={[styles.createFab, { bottom: Math.max(20, insets.bottom + 14) }]}
      >
        <Feather name="plus" size={24} color={themeColors.textOnBrand} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panelRoot: {
    position: 'relative',
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusChipRow: {
    gap: 6,
    paddingRight: 4,
  },
  listContentWithFab: {
    paddingBottom: 144,
  },
  createFab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.pressed,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
