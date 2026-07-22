import { useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
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
import { canStartService, loadMyAssignedServices, updateServiceStatus, uploadMedicalRecord } from '../api/worklist';
import { ContextActionBar, type ContextActionBarAction } from './ContextActionBar';
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

function formatPatientName(service: AssignedService) {
  return [service.patientPrefix, service.patientFirstName, service.patientLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function statusColor(status: string) {
  if (status === 'Completed') {
    return '#2E7D32';
  }

  if (status === 'InProgress') {
    return '#FF914D';
  }

  return '#5C7476';
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
  const [tasks, setTasks] = useState<AssignedService[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [recordTaskId, setRecordTaskId] = useState<string | null>(null);
  const [recordName, setRecordName] = useState('');
  const [recordDate, setRecordDate] = useState(initialRange.fromDate);
  const [recordType, setRecordType] = useState('Document');
  const [recordDescription, setRecordDescription] = useState('');
  const [recordFile, setRecordFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'dialogFrom' | 'dialogTo' | 'record' | null>(null);
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

    if (datePickerTarget === 'record') {
      return parseDateInput(recordDate);
    }

    return new Date();
  }, [datePickerTarget, draftCustomFromDate, draftCustomToDate, recordDate]);

  const selectedTasks = useMemo(
    () => tasks.filter((task) => selectedTaskIds.includes(task.id)),
    [tasks, selectedTaskIds]
  );
  const isSelectionMode = selectedTaskIds.length > 0;
  const singleSelectedTask = selectedTasks.length === 1 ? selectedTasks[0] : null;

  const applyPickedDate = (target: 'dialogFrom' | 'dialogTo' | 'record', selectedDate: Date) => {
    const nextValue = formatDateInput(selectedDate);

    if (target === 'dialogFrom') {
      setDraftCustomFromDate(nextValue);
      return;
    }

    if (target === 'dialogTo') {
      setDraftCustomToDate(nextValue);
      return;
    }

    setRecordDate(nextValue);
  };

  const openDatePicker = (target: 'dialogFrom' | 'dialogTo' | 'record') => {
    setDatePickerTarget(target);

    if (Platform.OS === 'ios') {
      setIosPickerDate(
        target === 'dialogFrom'
          ? parseDateInput(draftCustomFromDate)
          : target === 'dialogTo'
          ? parseDateInput(draftCustomToDate)
          : parseDateInput(recordDate)
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

  const clearSelection = () => {
    setSelectedTaskIds([]);
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((previousValue) =>
      previousValue.includes(taskId)
        ? previousValue.filter((selectedId) => selectedId !== taskId)
        : [...previousValue, taskId]
    );
  };

  const handleTaskPress = (task: AssignedService) => {
    if (isSelectionMode) {
      toggleTaskSelection(task.id);
      return;
    }

    onOpenTaskDetails(task.id);
  };

  const handleTaskLongPress = (task: AssignedService) => {
    setSelectedTaskIds((previousValue) =>
      previousValue.includes(task.id) ? previousValue : [...previousValue, task.id]
    );
  };

  const runBulkStatusUpdate = async (
    nextStatusForTask: (task: AssignedService) => 'NotStarted' | 'InProgress' | 'Completed' | null,
    failureMessage: string
  ) => {
    const tasksToUpdate = selectedTasks
      .map((task) => ({ task, nextStatus: nextStatusForTask(task) }))
      .filter((item): item is { task: AssignedService; nextStatus: 'NotStarted' | 'InProgress' | 'Completed' } => item.nextStatus !== null);

    if (tasksToUpdate.length === 0) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await Promise.all(
        tasksToUpdate.map(({ task, nextStatus }) =>
          updateServiceStatus(token, {
            serviceId: task.id,
            status: nextStatus,
          })
        )
      );

      clearSelection();
      await refreshTasks();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : failureMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (task: AssignedService) => {
    try {
      await updateServiceStatus(token, {
        serviceId: task.id,
        status: 'InProgress',
      });
      clearSelection();
      await refreshTasks();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start service.');
    }
  };

  const handleCompleteTask = async (task: AssignedService) => {
    try {
      await updateServiceStatus(token, {
        serviceId: task.id,
        status: 'Completed',
      });

      clearSelection();
      await refreshTasks();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete service.');
    }
  };

  const handleUndoStatus = async (task: AssignedService) => {
    const nextStatus = task.status === 'Completed' ? 'InProgress' : task.status === 'InProgress' ? 'NotStarted' : null;

    if (!nextStatus) {
      return;
    }

    try {
      await updateServiceStatus(token, {
        serviceId: task.id,
        status: nextStatus,
      });

      clearSelection();
      await refreshTasks();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to undo service status.');
    }
  };

  const toggleFilterAccordion = () => {
    setIsFilterAccordionOpen((previousValue) => {
      const nextValue = !previousValue;

      if (nextValue) {
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

  const openAddMedicalRecord = (task: AssignedService) => {
    clearSelection();
    setRecordTaskId(task.id);
    setRecordName('');
    setRecordDate(formatDateInput(new Date()));
    setRecordType('Document');
    setRecordDescription('');
    setRecordFile(null);
    setRecordModalVisible(true);
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

  useEffect(() => {
    setSelectedTaskIds((previousValue) => previousValue.filter((taskId) => tasks.some((task) => task.id === taskId)));
  }, [tasks]);

  const contextActions = useMemo<ContextActionBarAction[]>(() => {
    if (!selectedTasks.length) {
      return [];
    }

    const canShowDetails = selectedTasks.length === 1;
    const canShowAddRecord = selectedTasks.length === 1 && selectedTasks[0].status === 'InProgress';
    const canBulkStart = selectedTasks.every((task) => canStartService(task.status));
    const canBulkComplete = selectedTasks.every((task) => task.status === 'InProgress');
    const canBulkUndo = selectedTasks.every((task) => task.status === 'InProgress' || task.status === 'Completed');

    return [
      canShowDetails
        ? {
            key: 'details',
            label: 'Details',
            icon: 'info',
            onPress: () => {
              if (singleSelectedTask) {
                clearSelection();
                onOpenTaskDetails(singleSelectedTask.id);
              }
            },
          }
        : null,
      canShowAddRecord
        ? {
            key: 'add-record',
            label: 'Add Record',
            icon: 'file-plus',
            onPress: () => {
              if (singleSelectedTask) {
                openAddMedicalRecord(singleSelectedTask);
              }
            },
          }
        : null,
      canBulkStart
        ? {
            key: 'start',
            label: 'Start',
            icon: 'play',
            onPress: () => void runBulkStatusUpdate(() => 'InProgress', 'Unable to start service.'),
          }
        : null,
      canBulkComplete
        ? {
            key: 'complete',
            label: 'Complete',
            icon: 'check-circle',
            onPress: () => void runBulkStatusUpdate(() => 'Completed', 'Unable to complete service.'),
          }
        : null,
      canBulkUndo
        ? {
            key: 'undo',
            label: 'Undo',
            icon: 'corner-up-left',
            onPress: () =>
              void runBulkStatusUpdate(
                (task) => (task.status === 'Completed' ? 'InProgress' : task.status === 'InProgress' ? 'NotStarted' : null),
                'Unable to undo service status.'
              ),
          }
        : null,
    ].filter((action): action is ContextActionBarAction => action !== null);
  }, [onOpenTaskDetails, selectedTasks, singleSelectedTask]);

  const selectRecordFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    setRecordFile(result.assets[0]);
  };

  const submitMedicalRecord = async () => {
    if (!recordTaskId || !recordName.trim() || !recordDate || !recordType || !recordFile) {
      setErrorMessage('Please fill all medical record fields and attach a file.');
      return;
    }

    setSavingRecord(true);

    try {
      await uploadMedicalRecord(token, {
        availedServiceId: recordTaskId,
        name: recordName.trim(),
        recordDate,
        recordType,
        description: recordDescription,
        fileUri: recordFile.uri,
        fileName: recordFile.name,
        mimeType: recordFile.mimeType ?? 'application/octet-stream',
      });

      setRecordModalVisible(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save medical record.');
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterCard}>
        <View style={styles.selectedFilterSummary}>
          <Pressable accessibilityRole="button" onPress={toggleFilterAccordion} style={styles.accordionHeader}>
            <View style={styles.accordionHeaderTextWrap}>
              <Text style={styles.selectedFilterLabel}>Tasks for </Text>
              <Text style={styles.selectedFilterDates}>{getFilterLabel(selectedFilterOption)} ({fromDate} to {toDate})</Text>
                </View>
            <Feather
              name={isFilterAccordionOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={themeColors.textOnBrand}
            />
          </Pressable>

          {isFilterAccordionOpen ? (
            <View style={styles.accordionContent}>
              <View style={styles.radioGroup}>
                {FILTER_OPTIONS.map((option) => {
                  const isSelected = draftFilterOption === option.key;

                  return (
                    <Pressable
                      key={option.key}
                      accessibilityRole="button"
                      onPress={() => setDraftFilterOption(option.key)}
                      style={styles.radioRow}
                    >
                      <View style={[styles.radioOuter, isSelected ? styles.radioOuterSelected : null]}>
                        {isSelected ? <View style={styles.radioInner} /> : null}
                      </View>
                      <Text style={styles.radioLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {draftFilterOption === 'custom' ? (
                <View style={styles.customRangeWrap}>
                  <Text style={styles.label}>From</Text>
                  <Pressable style={styles.datePickerButton} onPress={() => openDatePicker('dialogFrom')}>
                    <Text style={styles.datePickerText}>{draftCustomFromDate}</Text>
                    <Feather name="calendar" size={14} color={themeColors.primary} />
                  </Pressable>

                  <Text style={styles.label}>To</Text>
                  <Pressable style={styles.datePickerButton} onPress={() => openDatePicker('dialogTo')}>
                    <Text style={styles.datePickerText}>{draftCustomToDate}</Text>
                    <Feather name="calendar" size={14} color={themeColors.primary} />
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.dialogActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={toggleFilterAccordion}
                  style={styles.dialogCancelButton}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </Pressable>

                <Pressable accessibilityRole="button" onPress={() => void applyDateFilter()} style={styles.dialogApplyButton}>
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
          <ActivityIndicator size="small" color={themeColors.primary} />
        </View>
      ) : null}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {tasks.map((task) => {
          const isSelected = selectedTaskIds.includes(task.id);

          return (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              onPress={() => handleTaskPress(task)}
              onLongPress={() => handleTaskLongPress(task)}
              style={[styles.taskCard, isSelected ? styles.taskCardSelected : null]}
            >
              <View style={styles.taskTopRow}>
                <View style={styles.taskNameWrap}>
                  {isSelectionMode ? (
                    <View style={[styles.selectionIndicator, isSelected ? styles.selectionIndicatorSelected : null]}>
                      {isSelected ? <Feather name="check" size={12} color={themeColors.textOnBrand} /> : null}
                    </View>
                  ) : null}
                  <Text style={styles.taskName}>{formatPatientName(task) || 'Unnamed Patient'}</Text>
                </View>
                <View style={styles.statusActionsWrap}>
                  <Text style={[styles.statusBadge, { color: statusColor(task.status) }]}>{task.status}</Text>

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

              <Text style={styles.taskMeta}>Service: {task.serviceName || '-'}</Text>
              <Text style={styles.taskMeta}>Task ID: {task.displayId || task.id}</Text>
              <Text style={styles.taskMeta}>Scheduled: {task.scheduledStartDateTime || '-'}</Text>

              {/* {!isSelectionMode ? <View style={styles.taskActions}>
                <Pressable style={styles.actionButton} onPress={() => void handleViewTask(task)}>
                  <Feather name="info" size={14} color={themeColors.textOnBrand} />
                  <Text style={styles.actionButtonText}>Details</Text>
                </Pressable>

                <Pressable
                  style={[styles.secondaryActionButton, !inProgress ? styles.disabledSecondaryButton : null]}
                  disabled={!inProgress}
                  onPress={() => openAddMedicalRecord(task)}
                >
                  <Feather name="file-plus" size={14} color={themeColors.textPrimary} />
                  <Text style={styles.secondaryActionButtonText}>Add Record</Text>
                </Pressable>
              </View> : null} */}
            </Pressable>
          );
        })}

        {!loading && tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No assigned services found for this date range.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal animationType="slide" visible={recordModalVisible} onRequestClose={() => setRecordModalVisible(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Medical Record</Text>
            <Pressable onPress={() => setRecordModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.label}>Record Name</Text>
            <TextInput value={recordName} onChangeText={setRecordName} style={styles.input} placeholder="Record name" />

            <Text style={styles.label}>Record Date</Text>
            <Pressable style={styles.datePickerButton} onPress={() => openDatePicker('record')}>
              <Text style={styles.datePickerText}>{recordDate}</Text>
              <Feather name="calendar" size={14} color={themeColors.primary} />
            </Pressable>

            <Text style={styles.label}>Record Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {RECORD_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[styles.typeChip, recordType === type ? styles.typeChipActive : null]}
                  onPress={() => setRecordType(type)}
                >
                  <Text style={[styles.typeChipText, recordType === type ? styles.typeChipTextActive : null]}>{type}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Description</Text>
            <SpeechEnabledMultilineInput
              value={recordDescription}
              onChangeText={setRecordDescription}
              numberOfLines={4}
              placeholder="Optional notes"
            />

            <Pressable style={styles.secondaryActionButton} onPress={() => void selectRecordFile()}>
              <Feather name="upload" size={14} color={themeColors.textPrimary} />
              <Text style={styles.secondaryActionButtonText}>Choose File</Text>
            </Pressable>

            <Text style={styles.fileNameText}>{recordFile?.name ?? 'No file selected'}</Text>

            <Pressable
              style={[styles.filterButton, savingRecord ? styles.disabledButton : null]}
              disabled={savingRecord}
              onPress={() => void submitMedicalRecord()}
            >
              <Text style={styles.filterButtonText}>{savingRecord ? 'Saving...' : 'Save Medical Record'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

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

      <ContextActionBar
        visible={isSelectionMode}
        selectedCount={selectedTaskIds.length}
        actions={contextActions}
        onClearSelection={clearSelection}
      />
    </View>
  );
}

const styles = allStyles;
