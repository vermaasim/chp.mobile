import { useEffect, useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SpeechEnabledMultilineInput } from './SpeechEnabledMultilineInput';
import { loadMyAssignedServices } from '../api/worklist';
import {
  loadWorklistDateFilterPreference,
  saveWorklistDateFilterPreference,
  type WorklistDateFilterOption,
} from '../storage/worklistFilter';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import type { AssignedService } from '../types/worklist';

interface MyTasksPanelProps {
  token: string;
  facilityId: string;
  onOpenTaskDetails: (taskId: string) => void;
}

const RECORD_TYPES = ['Document', 'LabReport', 'XRay', 'Photo', 'Video', 'Other'];
const FILTER_OPTIONS: Array<{ key: WorklistDateFilterOption; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'lastWeek', label: 'Last Week' },
  { key: 'nextWeek', label: 'Next Week' },
  { key: 'custom', label: 'Custom' },
];

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const date = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function toUtcIsoRange(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T23:59:59.999`);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function parseDateInput(value: string) {
  const [year, month, date] = value.split('-').map((part) => Number(part));

  if (!year || !month || !date) {
    return new Date();
  }

  return new Date(year, month - 1, date);
}

function addDays(baseDate: Date, days: number) {
  const copy = new Date(baseDate);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getRangeForOption(option: WorklistDateFilterOption) {
  const today = new Date();

  if (option === 'yesterday') {
    const target = addDays(today, -1);
    const value = formatDateInput(target);
    return { fromDate: value, toDate: value };
  }

  if (option === 'lastWeek') {
    return {
      fromDate: formatDateInput(addDays(today, -7)),
      toDate: formatDateInput(addDays(today, -1)),
    };
  }

  if (option === 'nextWeek') {
    return {
      fromDate: formatDateInput(addDays(today, 1)),
      toDate: formatDateInput(addDays(today, 7)),
    };
  }

  const value = formatDateInput(today);
  return { fromDate: value, toDate: value };
}

function getFilterLabel(option: WorklistDateFilterOption) {
  const item = FILTER_OPTIONS.find((filterOption) => filterOption.key === option);
  return item?.label ?? 'Today';
}

function isValidDateRange(fromDate: string, toDate: string) {
  const from = Date.parse(`${fromDate}T00:00:00`);
  const to = Date.parse(`${toDate}T23:59:59.999`);

  return !Number.isNaN(from) && !Number.isNaN(to) && from <= to;
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
  const [draftFilterOption, setDraftFilterOption] = useState<WorklistDateFilterOption>('today');
  const [draftCustomFromDate, setDraftCustomFromDate] = useState(initialRange.fromDate);
  const [draftCustomToDate, setDraftCustomToDate] = useState(initialRange.toDate);
  const [isFilterAccordionOpen, setIsFilterAccordionOpen] = useState(false);
  const [filterErrorMessage, setFilterErrorMessage] = useState<string | null>(null);
  const [tasks, setTasks] = useState<AssignedService[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<'dialogFrom' | 'dialogTo' | null>(null);
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [iosPickerDate, setIosPickerDate] = useState(new Date());

  const showAndroidDatePicker = Platform.OS === 'android' && datePickerTarget !== null;

  const pickerValue = useMemo(() => {
    if (datePickerTarget === 'dialogFrom') {
      return parseDateInput(draftCustomFromDate);
    }

    if (datePickerTarget === 'dialogTo') {
      return parseDateInput(draftCustomToDate);
    }

    return new Date();
  }, [datePickerTarget, draftCustomFromDate, draftCustomToDate]);

  const isCustomRangeValid = isValidDateRange(draftCustomFromDate, draftCustomToDate);

  const applyPickedDate = (target: 'dialogFrom' | 'dialogTo', selectedDate: Date) => {
    const nextValue = formatDateInput(selectedDate);

    if (target === 'dialogFrom') {
      setDraftCustomFromDate(nextValue);
      return;
    }

    if (target === 'dialogTo') {
      setDraftCustomToDate(nextValue);
      return;
    }
  };

  const openDatePicker = (target: 'dialogFrom' | 'dialogTo') => {
    setDatePickerTarget(target);

    if (Platform.OS === 'ios') {
      setIosPickerDate(
        target === 'dialogFrom' ? parseDateInput(draftCustomFromDate) : parseDateInput(draftCustomToDate)
      );
      setIosPickerVisible(true);
    }
  };

  const closeIosPicker = () => {
    setIosPickerVisible(false);
    setDatePickerTarget(null);
  };

  const confirmIosPicker = () => {
    if (datePickerTarget) {
      applyPickedDate(datePickerTarget, iosPickerDate);
    }

    closeIosPicker();
  };

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

  const toggleFilterAccordion = () => {
    setIsFilterAccordionOpen((previousValue) => {
      const nextValue = !previousValue;

      if (nextValue) {
        setFilterErrorMessage(null);
        setDraftFilterOption(selectedFilterOption);
        setDraftCustomFromDate(fromDate);
        setDraftCustomToDate(toDate);
      }

      return nextValue;
    });
  };

  const applyDateFilter = async () => {
    const nextOption = draftFilterOption;
    const nextRange =
      nextOption === 'custom'
        ? {
            fromDate: draftCustomFromDate,
            toDate: draftCustomToDate,
          }
        : getRangeForOption(nextOption);

    if (nextOption === 'custom' && !isValidDateRange(nextRange.fromDate, nextRange.toDate)) {
      setFilterErrorMessage('The start date must be on or before the end date.');
      return;
    }

    setFilterErrorMessage(null);
    setSelectedFilterOption(nextOption);
    setFromDate(nextRange.fromDate);
    setToDate(nextRange.toDate);
    setIsFilterAccordionOpen(false);

    await saveWorklistDateFilterPreference({
      option: nextOption,
      fromDate: nextRange.fromDate,
      toDate: nextRange.toDate,
    });

    await refreshTasks(nextRange.fromDate, nextRange.toDate);
  };

  const onDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      if (selectedDate) {
        setIosPickerDate(selectedDate);
      }
      return;
    }

    if (event.type === 'dismissed') {
      setDatePickerTarget(null);
      return;
    }

    if (!selectedDate || !datePickerTarget) {
      setDatePickerTarget(null);
      return;
    }

    applyPickedDate(datePickerTarget, selectedDate);

    setDatePickerTarget(null);
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
      setDraftFilterOption(nextOption);
      setFromDate(nextFromDate);
      setToDate(nextToDate);
      setDraftCustomFromDate(nextFromDate);
      setDraftCustomToDate(nextToDate);

      await refreshTasks(nextFromDate, nextToDate);
    };

    void bootstrapFilter();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.filterCard}>
        <View style={styles.selectedFilterSummary}>
          <Pressable accessibilityRole="button" onPress={toggleFilterAccordion} style={styles.accordionHeader}>
            <View style={styles.accordionHeaderTextWrap}>
              <View style={styles.filterSummaryRow}>
                <Feather name="calendar" size={13} color={themeColors.textSecondary} />
                <Text style={styles.selectedFilterLabel}>Tasks for</Text>
              </View>
              <View style={styles.filterSummaryValueRow}>
                <Text style={styles.selectedFilterValue}>{getFilterLabel(selectedFilterOption)}</Text>
                <Text style={styles.selectedFilterDates}>{fromDate} to {toDate}</Text>
              </View>
            </View>
            <Feather
              name={isFilterAccordionOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={themeColors.textSecondary}
            />
          </Pressable>

          {isFilterAccordionOpen ? (
            <View style={styles.accordionContent}>
              <View style={styles.filterChipGroup}>
                {FILTER_OPTIONS.map((option) => {
                  const isSelected = draftFilterOption === option.key;

                  return (
                    <Pressable
                      key={option.key}
                      accessibilityRole="button"
                      onPress={() => setDraftFilterOption(option.key)}
                      style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
                    >
                      <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {draftFilterOption === 'custom' ? (
                <View style={styles.customRangeWrap}>
                  <View style={styles.customRangeRow}>
                    <View style={styles.customRangeField}>
                      <Text style={styles.label}>From</Text>
                      <Pressable style={styles.datePickerButton} onPress={() => openDatePicker('dialogFrom')}>
                        <Text style={styles.datePickerText}>{draftCustomFromDate}</Text>
                        <Feather name="calendar" size={14} color={themeColors.primary} />
                      </Pressable>
                    </View>

                    <View style={styles.customRangeField}>
                      <Text style={styles.label}>To</Text>
                      <Pressable style={styles.datePickerButton} onPress={() => openDatePicker('dialogTo')}>
                        <Text style={styles.datePickerText}>{draftCustomToDate}</Text>
                        <Feather name="calendar" size={14} color={themeColors.primary} />
                      </Pressable>
                    </View>
                  </View>

                  {filterErrorMessage ? <Text style={styles.filterErrorText}>{filterErrorMessage}</Text> : null}
                </View>
              ) : null}

              <View style={styles.dialogActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel date filter changes"
                  onPress={toggleFilterAccordion}
                  style={styles.dialogCancelButton}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Apply date filter"
                  onPress={() => void applyDateFilter()}
                  disabled={draftFilterOption === 'custom' && !isCustomRangeValid}
                  style={[
                    styles.dialogApplyButton,
                    draftFilterOption === 'custom' && !isCustomRangeValid ? styles.dialogApplyButtonDisabled : null,
                  ]}
                >
                  <Text style={styles.dialogApplyText}>Apply</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
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

      {showAndroidDatePicker ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          onChange={onDatePickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' && iosPickerVisible && datePickerTarget ? (
        <Modal animationType="fade" transparent visible onRequestClose={closeIosPicker}>
          <View style={styles.pickerModalOverlay}>
            <Pressable style={styles.pickerModalBackdrop} onPress={closeIosPicker} />
            <View style={styles.pickerModalCard}>
              <Text style={styles.pickerModalTitle}>Select Date</Text>
              <DateTimePicker
                value={iosPickerDate}
                mode="date"
                display="spinner"
                onChange={onDatePickerChange}
              />
              <View style={styles.pickerModalActions}>
                <Pressable style={styles.dialogCancelButton} onPress={closeIosPicker}>
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.dialogApplyButton} onPress={confirmIosPicker}>
                  <Text style={styles.dialogApplyText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

    </View>
  );
}

const styles = allStyles;
