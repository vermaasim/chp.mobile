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

function toInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'NA';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
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

  const metrics = useMemo(() => {
    return visits.reduce(
      (accumulator, visit) => {
        const status = getVisitStatus(visit.visitStatus ?? visit.status);
        accumulator.total += 1;

        if (status === 'Completed') {
          accumulator.done += 1;
          return accumulator;
        }

        if (status === 'InProgress' || status === 'CheckedIn') {
          accumulator.inProgress += 1;
          return accumulator;
        }

        if (status === 'Scheduled') {
          accumulator.notStarted += 1;
        }

        return accumulator;
      },
      { total: 0, notStarted: 0, inProgress: 0, done: 0 },
    );
  }, [visits]);

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
    <View style={[styles.container, styles.panelRoot]}>
      <DateRangeFilterCard
        summaryLabel="Visits"
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

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{metrics.total}</Text>
          <Text style={styles.metricLabel}>Total</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValueMuted}>{metrics.notStarted}</Text>
          <Text style={styles.metricLabel}>Not started</Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardInProgress]}>
          <Text style={styles.metricValueInProgress}>{metrics.inProgress}</Text>
          <Text style={styles.metricLabel}>In progress</Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardDone]}>
          <Text style={styles.metricValueDone}>{metrics.done}</Text>
          <Text style={styles.metricLabel}>Done</Text>
        </View>
      </View>

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

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={themeColors.primary} />
            <Text style={styles.loadingText}>Loading visits...</Text>
          </View>
        </View>
      ) : null}

      <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, styles.listContentWithFab]}>
        {visits.map((visit) => {
          const status = getVisitStatus(visit.visitStatus ?? visit.status);
          const tone = getStatusTone(status);
          const patientName = formatPatientName(visit);

          return (
            <Pressable
              key={visit.id}
              accessibilityRole="button"
              onPress={() => onOpenVisitDetails(visit.id)}
              style={styles.taskCard}
            >
              <View style={styles.taskTopRow}>
                <View style={styles.taskIdentityWrap}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLabel}>{toInitials(patientName)}</Text>
                  </View>
                  <View style={styles.taskNameWrap}>
                    <Text style={styles.taskName}>{patientName}</Text>
                    <Text numberOfLines={1} style={styles.taskServiceText}>{`${visit.primaryServiceName || '-'} · ${formatVisitDate(visit.scheduledStartDateTime)}`}</Text>
                    <Text numberOfLines={1} style={styles.taskServiceText}>{`Physician: ${formatPhysicianName(visit)}`}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, tone.badgeStyle]}>
                  <Text style={[styles.statusBadgeText, tone.textStyle]}>{status.replace(/([a-z])([A-Z])/g, '$1 $2')}</Text>
                </View>
              </View>

              <Text numberOfLines={1} style={styles.taskMetaText}>{`ID: ${visit.displayId || visit.visitDisplayId || visit.id}`}</Text>
            </Pressable>
          );
        })}

        {!loading && visits.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={18} color={themeColors.textSecondary} />
            <Text style={styles.emptyText}>No visits found for this filter</Text>
            <Text style={styles.emptySubText}>Try changing date or status filters.</Text>
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
  container: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    padding: 10,
  },
  panelRoot: {
    position: 'relative',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    marginTop: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F2F5F5',
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  metricCardInProgress: {
    backgroundColor: '#FBEFE7',
  },
  metricCardDone: {
    backgroundColor: '#E0F4F1',
  },
  metricValue: {
    color: themeColors.textPrimary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
  },
  metricValueMuted: {
    color: '#7C8284',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
  },
  metricValueInProgress: {
    color: '#F8893D',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
  },
  metricValueDone: {
    color: themeColors.primary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#7B7A76',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusChipRow: {
    gap: 6,
    paddingRight: 4,
  },
  loadingWrap: {
    paddingVertical: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#B42318',
    fontSize: 12,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 0,
    paddingBottom: 24,
  },
  listContentWithFab: {
    paddingBottom: 144,
  },
  taskCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DF',
    paddingVertical: 14,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskIdentityWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: '#5F6466',
    fontSize: 14,
    fontWeight: '700',
  },
  taskNameWrap: {
    flex: 1,
    gap: 2,
  },
  taskName: {
    color: themeColors.textPrimary,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  taskServiceText: {
    color: '#7C8284',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  taskMetaText: {
    color: '#9B9A96',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 52,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingVertical: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  emptyText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
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
