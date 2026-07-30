import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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

function formatPatientName(service: AssignedService) {
  return [service.patientPrefix, service.patientFirstName, service.patientLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
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
  const [tasks, setTasks] = useState<AssignedService[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshTasks = async (nextFromDate = fromDate, nextToDate = toDate) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const range = toUtcIsoRange(nextFromDate, nextToDate);
      const items = await loadMyAssignedServices(token, facilityId, range.from, range.to);
      setTasks(items ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load tasks.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
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
        summaryLabel="Tasks for"
        selectedOption={selectedFilterOption}
        fromDate={fromDate}
        toDate={toDate}
        onApply={applyDateFilter}
      />

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
        {tasks.map((task) => {
          const statusTone = getTaskStatusTone(task.status);

          return (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              onPress={() => handleTaskPress(task)}
              style={styles.taskCard}
            >
              <View style={styles.taskTopRow}>
                <View style={styles.taskNameWrap}>
                  <Text style={styles.taskName}>{formatPatientName(task) || 'Unnamed Patient'}</Text>
                </View>
                <View style={styles.statusActionsWrap}>
                  <View style={[styles.statusBadge, statusTone.badgeStyle]}>
                    <Text style={[styles.statusBadgeText, statusTone.textStyle]}>{getStatusLabel(task.status)}</Text>
                  </View>

                  {/* {!isSelectionMode && canAdvanceStatus ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={advanceStatusLabel}
                      style={styles.headerIconAction}
                      onPress={() => {
                        if (task.status === 'InProgress') {
                          void handleCompleteTask(task);
                          return;
                        }

                        if (canStart) {
                          void handleStartTask(task);
                        }
                      }}
                    >
                      <Feather name={advanceIconName} size={14} color={themeColors.textOnBrand} />
                    </Pressable>
                  ) : null} */}

                  {/* {!isSelectionMode && canUndo ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Undo"
                      style={styles.headerSecondaryIconAction}
                      onPress={() => void handleUndoStatus(task)}
                    >
                      <Feather name="corner-up-left" size={14} color={themeColors.textPrimary} />
                    </Pressable>
                  ) : null} */}
                </View>
              </View>

              <Text numberOfLines={1} style={styles.taskServiceText}>Service: {task.serviceName || '-'}</Text>
              <View style={styles.taskMetaRow}>
                <Text numberOfLines={1} style={styles.taskMetaItem}>ID: {task.displayId || task.id}</Text>
                <Text numberOfLines={1} style={[styles.taskMetaItem, styles.taskMetaItemRight]}>
                  {formatTaskSchedule(task.scheduledStartDateTime)}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {!loading && tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={18} color={themeColors.textSecondary} />
            <Text style={styles.emptyText}>No assigned services for this date range</Text>
            <Text style={styles.emptySubText}>Try switching the date filter to view other tasks.</Text>
          </View>
        ) : null}
      </ScrollView>

    </View>
  );
}

const styles = allStyles;
