import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DateRangeFilterCard } from './DateRangeFilterCard';
import { loadMyAssignedServices } from '../api/worklist';
import {
  loadWorklistDateFilterPreference,
  saveWorklistDateFilterPreference,
  type WorklistDateFilterOption,
} from '../storage/worklistFilter';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import type { AssignedService } from '../types/worklist';
import { getRangeForOption, toUtcIsoRange } from '../utils/dateRangeFilter';

interface MyTasksPanelProps {
  token: string;
  facilityId: string;
  onOpenTaskDetails: (taskId: string) => void;
}

type TaskStatusFilterKey = 'NotStarted' | 'InProgress' | 'Completed';

const TASK_STATUS_FILTERS: Array<{ key: TaskStatusFilterKey; label: string }> = [
  { key: 'NotStarted', label: 'Not Started' },
  { key: 'InProgress', label: 'In Progress' },
  { key: 'Completed', label: 'Completed' },
];

function formatPatientName(service: AssignedService) {
  return [service.patientPrefix, service.patientFirstName, service.patientLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
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

function getStatusLabel(status: string) {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function getTaskStatusTone(status: string) {
  if (status === 'Completed') {
    return {
      badgeStyle: styles.statusBadgeCompleted,
      textStyle: styles.statusBadgeCompletedText,
    };
  }

  if (status === 'InProgress') {
    return {
      badgeStyle: styles.statusBadgeInProgress,
      textStyle: styles.statusBadgeInProgressText,
    };
  }

  return {
    badgeStyle: styles.statusBadgeNotStarted,
    textStyle: styles.statusBadgeNotStartedText,
  };
}

function normalizeTaskStatus(status?: string): TaskStatusFilterKey {
  const normalized = (status ?? '').replace(/\s+/g, '').toLowerCase();

  if (normalized === 'completed') {
    return 'Completed';
  }

  if (normalized === 'inprogress') {
    return 'InProgress';
  }

  return 'NotStarted';
}

function formatTaskSchedule(value?: string | null) {
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

export function MyTasksPanel({ token, facilityId, onOpenTaskDetails }: MyTasksPanelProps) {
  const initialRange = useMemo(() => getRangeForOption('today'), []);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [selectedFilterOption, setSelectedFilterOption] = useState<WorklistDateFilterOption>('today');
  const [allTasks, setAllTasks] = useState<AssignedService[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatusFilterKey[]>(TASK_STATUS_FILTERS.map((item) => item.key));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const visibleTasks = useMemo(() => {
    return allTasks.filter((task) => selectedStatuses.includes(normalizeTaskStatus(task.status)));
  }, [allTasks, selectedStatuses]);

  const metrics = useMemo(() => {
    return visibleTasks.reduce(
      (accumulator, task) => {
        const status = normalizeTaskStatus(task.status);
        accumulator.total += 1;

        if (status === 'Completed') {
          accumulator.done += 1;
          return accumulator;
        }

        if (status === 'InProgress') {
          accumulator.inProgress += 1;
          return accumulator;
        }

        accumulator.notStarted += 1;
        return accumulator;
      },
      { total: 0, notStarted: 0, inProgress: 0, done: 0 },
    );
  }, [visibleTasks]);

  const refreshTasks = async (nextFromDate = fromDate, nextToDate = toDate) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const range = toUtcIsoRange(nextFromDate, nextToDate);
      const items = await loadMyAssignedServices(token, facilityId, range.from, range.to);
      setAllTasks(items ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load tasks.');
      setAllTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (status: TaskStatusFilterKey) => {
    const exists = selectedStatuses.includes(status);
    const next = exists ? selectedStatuses.filter((item) => item !== status) : [...selectedStatuses, status];

    if (next.length === 0) {
      return;
    }

    setSelectedStatuses(next);
  };

  const handleTaskPress = (task: AssignedService) => {
    onOpenTaskDetails(task.id);
  };

  const applyDateFilter = async (selection: {
    option: WorklistDateFilterOption;
    fromDate: string;
    toDate: string;
  }) => {
    setSelectedFilterOption(selection.option);
    setFromDate(selection.fromDate);
    setToDate(selection.toDate);

    await saveWorklistDateFilterPreference({
      option: selection.option,
      fromDate: selection.fromDate,
      toDate: selection.toDate,
    });

    await refreshTasks(selection.fromDate, selection.toDate);
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapFilter = async () => {
      const savedPreference = await loadWorklistDateFilterPreference();

      if (!isMounted) {
        return;
      }

      if (!savedPreference) {
        await refreshTasks(initialRange.fromDate, initialRange.toDate);
        return;
      }

      const nextOption = savedPreference.option ?? 'today';
      const nextFromDate = savedPreference.fromDate ?? initialRange.fromDate;
      const nextToDate = savedPreference.toDate ?? initialRange.toDate;

      setSelectedFilterOption(nextOption);
      setFromDate(nextFromDate);
      setToDate(nextToDate);

      await refreshTasks(nextFromDate, nextToDate);
    };

    void bootstrapFilter();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <DateRangeFilterCard
        summaryLabel="Tasks"
        selectedOption={selectedFilterOption}
        fromDate={fromDate}
        toDate={toDate}
        onApply={applyDateFilter}
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
          {TASK_STATUS_FILTERS.map((status) => {
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
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        </View>
      ) : null}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {visibleTasks.map((task) => {
          const normalizedStatus = normalizeTaskStatus(task.status);
          const statusTone = getTaskStatusTone(normalizedStatus);
          const patientName = formatPatientName(task) || 'Unnamed Patient';

          return (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              onPress={() => handleTaskPress(task)}
              style={styles.taskCard}
            >
              <View style={styles.taskTopRow}>
                <View style={styles.taskIdentityWrap}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLabel}>{toInitials(patientName)}</Text>
                  </View>
                  <View style={styles.taskNameWrap}>
                    <Text style={styles.taskName}>{patientName}</Text>
                    <Text numberOfLines={1} style={styles.taskServiceText}>{`${task.serviceName || '-'} · ${formatTaskSchedule(task.scheduledStartDateTime)}`}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, statusTone.badgeStyle]}>
                  <Text style={[styles.statusBadgeText, statusTone.textStyle]}>{getStatusLabel(normalizedStatus)}</Text>
                </View>
              </View>

              <Text numberOfLines={1} style={styles.taskMetaText}>{`ID: ${task.displayId || task.id}`}</Text>
            </Pressable>
          );
        })}

        {!loading && visibleTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={18} color={themeColors.textSecondary} />
            <Text style={styles.emptyText}>{allTasks.length === 0 ? 'No assigned services for this date range' : 'No tasks match the selected status filters'}</Text>
            <Text style={styles.emptySubText}>{allTasks.length === 0 ? 'Try switching the date filter to view other tasks.' : 'Try selecting another status to see matching tasks.'}</Text>
          </View>
        ) : null}
      </ScrollView>
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
    marginTop: 10,
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
  statusBadgeNotStarted: {
    backgroundColor: themeColors.statusNotStartedSurface,
  },
  statusBadgeNotStartedText: {
    color: themeColors.statusNotStartedText,
  },
  statusBadgeInProgress: {
    backgroundColor: themeColors.statusInProgressSurface,
  },
  statusBadgeInProgressText: {
    color: themeColors.statusInProgressText,
  },
  statusBadgeCompleted: {
    backgroundColor: themeColors.statusCompletedSurface,
  },
  statusBadgeCompletedText: {
    color: themeColors.statusCompletedText,
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
});
