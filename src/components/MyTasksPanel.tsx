import { useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { canStartService, loadMyAssignedServices, loadServiceDetails, updateServiceStatus, uploadMedicalRecord } from '../api/worklist';
import {
  loadWorklistDateFilterPreference,
  saveWorklistDateFilterPreference,
  type WorklistDateFilterOption,
} from '../storage/worklistFilter';
import { themeColors } from '../theme/colors';
import type { AssignedService } from '../types/worklist';

interface MyTasksPanelProps {
  token: string;
  facilityId: string;
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

export function MyTasksPanel({ token, facilityId }: MyTasksPanelProps) {
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
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AssignedService | null>(null);

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

  const handleViewTask = async (task: AssignedService) => {
    setSelectedTask(task);
    setDetailsVisible(true);
    setDetailsLoading(true);

    try {
      const detailedTask = await loadServiceDetails(token, task.id);
      setSelectedTask(detailedTask);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load service details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStartTask = async (task: AssignedService) => {
    try {
      await updateServiceStatus(token, {
        serviceId: task.id,
        status: 'InProgress',
      });
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
          const canStart = canStartService(task.status);
          const inProgress = task.status === 'InProgress';
          const canUndo = task.status === 'InProgress' || task.status === 'Completed';
          const canAdvanceStatus = task.status === 'NotStarted' || task.status === 'InProgress';
          const advanceIconName = task.status === 'InProgress' ? 'check-circle' : 'play';
          const advanceStatusLabel = task.status === 'InProgress' ? 'Complete' : 'Start';

          return (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskTopRow}>
                <Text style={styles.taskName}>{formatPatientName(task) || 'Unnamed Patient'}</Text>
                <View style={styles.statusActionsWrap}>
                  <Text style={[styles.statusBadge, { color: statusColor(task.status) }]}>{task.status}</Text>

                  {canAdvanceStatus ? (
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
                  ) : null}

                  {canUndo ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Undo"
                      style={styles.headerSecondaryIconAction}
                      onPress={() => void handleUndoStatus(task)}
                    >
                      <Feather name="corner-up-left" size={14} color={themeColors.textPrimary} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <Text style={styles.taskMeta}>Service: {task.serviceName || '-'}</Text>
              <Text style={styles.taskMeta}>Task ID: {task.displayId || task.id}</Text>
              <Text style={styles.taskMeta}>Scheduled: {task.scheduledStartDateTime || '-'}</Text>

              <View style={styles.taskActions}>
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
              </View>
            </View>
          );
        })}

        {!loading && tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No assigned services found for this date range.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal animationType="slide" visible={detailsVisible} onRequestClose={() => setDetailsVisible(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Service Details</Text>
            <Pressable onPress={() => setDetailsVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          {detailsLoading ? (
            <ActivityIndicator size="small" color={themeColors.primary} />
          ) : (
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.detailRow}>Patient: {selectedTask ? formatPatientName(selectedTask) : '-'}</Text>
              <Text style={styles.detailRow}>Service: {selectedTask?.serviceName || '-'}</Text>
              <Text style={styles.detailRow}>Status: {selectedTask?.status || '-'}</Text>
              <Text style={styles.detailRow}>Task ID: {selectedTask?.displayId || selectedTask?.id || '-'}</Text>
              <Text style={styles.detailRow}>Visit: {selectedTask?.visitDisplayId || '-'}</Text>
              <Text style={styles.detailRow}>Assigned To: {selectedTask?.assignedToUserName || '-'}</Text>
              <Text style={styles.detailRow}>Patient Phone: {selectedTask?.patientMobileNo || '-'}</Text>
              <Text style={styles.detailRow}>Patient Email: {selectedTask?.patientEmailId || '-'}</Text>
              <Text style={styles.detailRow}>Scheduled: {selectedTask?.scheduledStartDateTime || '-'}</Text>
            </ScrollView>
          )}
        </View>
      </Modal>

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
            <TextInput
              value={recordDescription}
              onChangeText={setRecordDescription}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    backgroundColor: themeColors.surface,
    borderWidth: 2,
    borderColor: themeColors.primary,
    padding: 0,
    minHeight: 320,
  },
  filterCard: {
    borderTopEndRadius: 4,
    borderTopStartRadius: 4,
    borderWidth: 1,
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
    padding: 0,
    marginBottom: 10,
  },
  sectionTitle: {
    color: themeColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  selectedFilterSummary: {
    borderRadius: 10,
    borderColor: themeColors.border,
    backgroundColor: themeColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  accordionHeaderTextWrap: {
    flex: 1,
  },
  accordionContent: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    padding: 10,
  },
  selectedFilterLabel: {
    color: themeColors.textOnBrand,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectedFilterValue: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  selectedFilterDates: {
    color: themeColors.textOnBrand,
    fontSize: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateField: {
    flex: 1,
  },
  label: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    color: themeColors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
  },
  datePickerButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterButton: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  filterButtonText: {
    color: themeColors.textOnBrand,
    fontWeight: '700',
  },
  loadingWrap: {
    paddingVertical: 10,
  },
  errorText: {
    color: '#B42318',
    fontSize: 12,
    marginBottom: 8,
  },
  list: {
    //maxHeight: 460,
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
    paddingHorizontal: 10,
  },
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 12,
    backgroundColor: themeColors.surface,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  statusActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskName: {
    flex: 1,
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerIconAction: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: themeColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSecondaryIconAction: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskMeta: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  taskActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: themeColors.secondary,
    alignItems: 'center',
  },
  actionButtonText: {
    color: themeColors.textOnBrand,
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: themeColors.border,
    alignItems: 'center',
    backgroundColor: themeColors.surfaceMuted,
  },
  secondaryActionButtonText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledSecondaryButton: {
    opacity: 0.5,
  },
  emptyState: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: themeColors.appBackground,
  },
  modalHeader: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.surface,
  },
  modalTitle: {
    color: themeColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeText: {
    color: themeColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBody: {
    padding: 14,
    gap: 8,
  },
  detailRow: {
    color: themeColors.textPrimary,
    fontSize: 13,
    marginBottom: 4,
  },
  typeRow: {
    gap: 8,
    paddingVertical: 4,
  },
  typeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: themeColors.surface,
  },
  typeChipActive: {
    borderColor: themeColors.secondary,
    backgroundColor: '#FFF1E8',
  },
  typeChipText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: themeColors.secondary,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  fileNameText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  radioGroup: {
    gap: 8,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: themeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: themeColors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.primary,
  },
  radioLabel: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  customRangeWrap: {
    marginTop: 10,
    gap: 4,
  },
  dialogActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dialogCancelButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: themeColors.surface,
  },
  dialogCancelText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  dialogApplyButton: {
    borderRadius: 10,
    backgroundColor: themeColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dialogApplyText: {
    color: themeColors.textOnBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pickerModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pickerModalCard: {
    borderRadius: 14,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  pickerModalTitle: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  pickerModalActions: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
