import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, Text } from 'react-native-paper';
import {
  deleteClinicalNote,
  deleteDrawingRecord,
  deleteMedicalRecord,
  deletePrescriptionRecord,
  downloadClinicalNoteFile,
  downloadDrawingFile,
  downloadMedicalRecordFile,
  downloadPrescriptionPdf,
  getClinicalNoteDetail,
  getDrawingDetail,
  getPrescriptionDetail,
  loadServiceLinkedRecords,
} from '../api/records';
import { mapEditingRecordToTemplate, type EditableRecordState } from './AddRecordModal';
import { canStartService, loadServiceDetails, updateServiceStatus } from '../api/worklist';
import { taskDetailsPanelStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import type { AssignedService, TaskDetailRecord, TaskDetailRecordType } from '../types/worklist';
import { DrawingCanvasEditor } from './DrawingCanvasEditor';
import { GeneralRxReadOnlyView } from './GeneralRxReadOnlyView';
import { PhysiotherapyReadOnlyView } from './PhysiotherapyReadOnlyView';
import type { PhysiotherapyPrescriptionData } from '../api/records';
import { getScopedCreateOptions, type RecordCreateOptionKey } from './record-flow/recordFlow';
import {
  getPrescriptionTemplateByType,
  isOutOfScopePrescriptionType,
  type RecordTemplateKey,
} from './record-flow/recordTemplates';
import { UnsupportedPrescriptionNotice } from './record-preview/UnsupportedPrescriptionNotice';
import {
  AddDiagramModal,
  AddDentalRxModal,
  AddFrozenShoulderRxModal,
  AddGeneralNotesModal,
  AddGeneralRxModal,
  AddLabReportModal,
  AddMedicalRecordModal,
  AddPhysiotherapyRxModal,
  AddPhysiotherapyTxNotesModal,
} from './record-modals';

interface TaskDetailsPanelProps {
  token: string;
  taskId: string;
  facilityId: string;
  refreshSeed?: number;
  allowedPrescriptionTypes?: string[];
}

interface DetailRow {
  key: string;
  value: string;
}

interface RecordGroup {
  key: TaskDetailRecordType;
  records: TaskDetailRecord[];
}

function formatPatientName(service: AssignedService) {
  return [service.patientPrefix, service.patientFirstName, service.patientLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function addOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }

  const lastDigit = day % 10;

  if (lastDigit === 1) return `${day}st`;
  if (lastDigit === 2) return `${day}nd`;
  if (lastDigit === 3) return `${day}rd`;
  return `${day}th`;
}

function formatReadableDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = addOrdinalSuffix(date.getDate());
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${day} ${month} ${year}, ${time}`;
}

function getStatusLabel(status?: string) {
  if (!status) {
    return 'Not Assigned';
  }

  return status.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function getStatusTone(status?: string) {
  if (status === 'Completed') {
    return {
      badgeStyle: taskDetailsPanelStyles.statusChipCompleted,
      textStyle: taskDetailsPanelStyles.statusChipTextCompleted,
    };
  }

  if (status === 'InProgress') {
    return {
      badgeStyle: taskDetailsPanelStyles.statusChipInProgress,
      textStyle: taskDetailsPanelStyles.statusChipTextInProgress,
    };
  }

  return {
    badgeStyle: taskDetailsPanelStyles.statusChipNotStarted,
    textStyle: taskDetailsPanelStyles.statusChipTextNotStarted,
  };
}

function getRecordList(task: AssignedService, key: TaskDetailRecordType) {
  const recordsMap: Record<TaskDetailRecordType, TaskDetailRecord[]> = {
    prescription: task.prescriptions ?? [],
    clinicalnote: task.clinicalNotes ?? [],
    medicalRecord: task.medicalRecords ?? [],
    drawing: task.drawings ?? [],
    Drawing: task.drawings ?? [],
  };

  return recordsMap[key] ?? [];
}

function pickTaskRecords(task: AssignedService) {
  const records: RecordGroup[] = [
    {
      key: 'prescription',
      records: getRecordList(task, 'prescription'),
    },
    {
      key: 'clinicalnote',
      records: getRecordList(task, 'clinicalnote'),
    },
    {
      key: 'drawing',
      records: getRecordList(task, 'drawing'),
    },
    {
      key: 'medicalRecord',
      records: getRecordList(task, 'medicalRecord'),
    },
  ];

  return records;
}

function getDisplayRecordType(record: TaskDetailRecord) {
  if (record.sourceType === 'prescription') return 'Prescription';
  if (record.sourceType === 'clinicalnote') return 'Clinical Note';
  if (record.sourceType === 'medicalRecord') return 'Medical Record';
  if (record.sourceType === 'drawing' || record.sourceType === 'Drawing') return 'Drawing';

  return record.recordType || record.noteType || record.prescriptionType || 'Record';
}

function getRecordStatusIcon(status?: string) {
  const normalizedStatus = (status || '').trim().toLowerCase();

  if (normalizedStatus === 'final' || normalizedStatus === 'finalized') {
    return {
      name: 'check-circle' as const,
      color: '#2E7D32',
      accessibilityLabel: 'Final record',
    };
  }

  if (normalizedStatus === 'draft') {
    return {
      name: 'edit-3' as const,
      color: '#FF914D',
      accessibilityLabel: 'Draft record',
    };
  }

  return {
    name: 'minus-circle' as const,
    color: themeColors.textSecondary,
    accessibilityLabel: 'Record status',
  };
}

function buildPatientInfo(task: AssignedService): DetailRow[] {
  return [
    { key: 'MRN', value: task.patientMRN || '-' },
    { key: 'Age', value: task.patientAgeInYears ? `${task.patientAgeInYears} years` : '-' },
    { key: 'Gender', value: task.patientGender || '-' },
    { key: 'Mobile', value: task.patientMobileNo || '-' },
    { key: 'Email', value: task.patientEmailId || '-' },
  ];
}

function buildVisitInfo(task: AssignedService): DetailRow[] {
  return [
    { key: 'Visit ID', value: task.visitDisplayId || '-' },
    { key: 'Service', value: task.serviceName || '-' },
    { key: 'Scheduled', value: formatReadableDateTime(task.scheduledStartDateTime) },
    { key: 'Assigned To', value: task.assignedToUserName || '-' },
    { key: 'Referred By', value: task.referredBy || '-' },
  ];
}

function isFinalizedStatus(status?: string) {
  const normalizedStatus = (status || '').trim().toLowerCase();
  return normalizedStatus === 'final' || normalizedStatus === 'finalized';
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function createPrescriptionPreviewText(payload: unknown) {
  const data = asRecord(payload);

  const lines = [
    asText(data.complaint) ? `Complaint: ${asText(data.complaint)}` : '',
    asText(data.diagnosis) ? `Diagnosis: ${asText(data.diagnosis)}` : '',
    asText(data.treatmentPlan) ? `Treatment Plan: ${asText(data.treatmentPlan)}` : '',
    asText(data.rangeOfMotion) ? `Range of Motion: ${asText(data.rangeOfMotion)}` : '',
    asText(data.painLevel) ? `Pain Level: ${asText(data.painLevel)}` : '',
    asText(data.additionalNotes) ? `Additional Notes: ${asText(data.additionalNotes)}` : '',
  ].filter(Boolean);

  if (lines.length === 0) {
    try {
      const pretty = JSON.stringify(payload ?? {}, null, 2);
      return pretty === '{}' ? 'No preview available.' : pretty;
    } catch {
      return 'No preview available.';
    }
  }

  return lines.join('\n');
}

export function TaskDetailsPanel({ token, taskId, facilityId, refreshSeed, allowedPrescriptionTypes }: TaskDetailsPanelProps) {
  const [task, setTask] = useState<AssignedService | null>(null);
  const [linkedRecords, setLinkedRecords] = useState<TaskDetailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [taskActionLoading, setTaskActionLoading] = useState(false);
  const [expandedRecordActionsId, setExpandedRecordActionsId] = useState<string | null>(null);
  const [fabOptionsVisible, setFabOptionsVisible] = useState(false);
  const [activeRecordModalTemplate, setActiveRecordModalTemplate] = useState<RecordTemplateKey | null>(null);
  const [editingRecord, setEditingRecord] = useState<EditableRecordState | null>(null);
  const [medicalRecordModalVisible, setMedicalRecordModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewDrawingJson, setPreviewDrawingJson] = useState<string | null>(null);
  const [previewPhysio, setPreviewPhysio] = useState<PhysiotherapyPrescriptionData | null>(null);
  const [previewGeneralRx, setPreviewGeneralRx] = useState<Record<string, unknown> | null>(null);
  const [showUnsupportedPrescriptionNotice, setShowUnsupportedPrescriptionNotice] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadDetails = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const detail = await loadServiceDetails(token, taskId);
        let records: TaskDetailRecord[] = [];

        try {
          records = await loadServiceLinkedRecords(token, taskId);
        } catch {
          records = [];
        }

        if (mounted) {
          setTask(detail);
          setLinkedRecords(records);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load service details.');
          setTask(null);
          setLinkedRecords([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadDetails();

    return () => {
      mounted = false;
    };
  }, [refreshSeed, token, taskId]);

  const refreshTaskSnapshot = async () => {
    const detail = await loadServiceDetails(token, taskId);
    let records: TaskDetailRecord[] = [];

    try {
      records = await loadServiceLinkedRecords(token, taskId);
    } catch {
      records = [];
    }

    setTask(detail);
    setLinkedRecords(records);
  };

  const recordGroups = useMemo(() => (task ? pickTaskRecords(task) : []), [task]);
  const fallbackRecords = useMemo(() => recordGroups.flatMap((group) => group.records), [recordGroups]);
  const displayRecords = linkedRecords.length > 0 ? linkedRecords : fallbackRecords;
  const createOptions = useMemo(() => getScopedCreateOptions(allowedPrescriptionTypes), [allowedPrescriptionTypes]);

  useEffect(() => {
    if (task?.status !== 'InProgress') {
      setFabOptionsVisible(false);
    }
  }, [task?.status]);

  const handleTaskStatusChange = async (nextStatus: 'NotStarted' | 'InProgress' | 'Completed') => {
    if (!task || taskActionLoading) {
      return;
    }

    setTaskActionLoading(true);
    setErrorMessage(null);

    try {
      await updateServiceStatus(token, {
        serviceId: task.id,
        status: nextStatus,
      });

      await refreshTaskSnapshot();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update service status.');
    } finally {
      setTaskActionLoading(false);
    }
  };

  const handleUndoTaskStatus = async () => {
    if (!task || taskActionLoading) {
      return;
    }

    const nextStatus = task.status === 'Completed' ? 'InProgress' : task.status === 'InProgress' ? 'NotStarted' : null;

    if (!nextStatus) {
      return;
    }

    await handleTaskStatusChange(nextStatus);
  };

  const refreshLinkedRecords = async () => {
    if (!task) {
      return;
    }

    try {
      const records = await loadServiceLinkedRecords(token, task.id);
      setLinkedRecords(records);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to refresh linked records.');
    }
  };

  const normalizeRecordType = (record: TaskDetailRecord): TaskDetailRecordType => {
    const sourceType = record.sourceType?.toLowerCase();

    if (sourceType === 'prescription') return 'prescription';
    if (sourceType === 'clinicalnote') return 'clinicalnote';
    if (sourceType === 'drawing') return 'drawing';
    return 'medicalRecord';
  };

  const handleViewRecord = async (record: TaskDetailRecord) => {
    const recordType = normalizeRecordType(record);
    setActionLoadingId(record.id);

    try {
      if (recordType === 'prescription') {
        const detail = await getPrescriptionDetail(token, record.id);
        setPreviewTitle(detail.displayId || record.displayId || 'Prescription');
        const prescriptionTemplate = getPrescriptionTemplateByType(detail.prescriptionType || record.prescriptionType);
        const isUnsupportedPrescription = prescriptionTemplate === 'dentalRx' || prescriptionTemplate === 'labReport';

        if (isUnsupportedPrescription) {
          setPreviewText('');
          setShowUnsupportedPrescriptionNotice(true);
          setPreviewGeneralRx(null);
        } else if (prescriptionTemplate === 'physiotherapyRx') {
          setPreviewText('');
          setShowUnsupportedPrescriptionNotice(false);
          setPreviewGeneralRx(null);
        } else if (prescriptionTemplate === 'generalRx') {
          setPreviewText('');
          setShowUnsupportedPrescriptionNotice(false);
          setPreviewGeneralRx(asRecord(detail.detailedPrescription));
        } else {
          setPreviewText(createPrescriptionPreviewText(detail.detailedPrescription));
          setShowUnsupportedPrescriptionNotice(false);
          setPreviewGeneralRx(null);
        }

        setPreviewDrawingJson(null);
        setPreviewPhysio(
          prescriptionTemplate === 'physiotherapyRx'
            ? ((detail.detailedPrescription as PhysiotherapyPrescriptionData | undefined) ?? null)
            : null
        );
      }

      if (recordType === 'clinicalnote') {
        const detail = await getClinicalNoteDetail(token, record.id);
        setPreviewTitle(record.displayId || 'Clinical Note');
        setPreviewText(detail.noteText || detail.noteJson || '');
        setShowUnsupportedPrescriptionNotice(false);
        setPreviewDrawingJson(null);
        setPreviewPhysio(null);
        setPreviewGeneralRx(null);
      }

      if (recordType === 'drawing') {
        const drawingId = record.diagramId || record.id;
        const detail = await getDrawingDetail(token, drawingId);
        setPreviewTitle(detail.name || record.displayId || 'Drawing');
        setPreviewText('');
        setShowUnsupportedPrescriptionNotice(false);
        setPreviewDrawingJson(detail.diagramJson);
        setPreviewPhysio(null);
        setPreviewGeneralRx(null);
      }

      if (recordType === 'medicalRecord') {
        setPreviewTitle(record.displayId || record.name || 'Medical Record');
        setPreviewText(`Name: ${record.name || '-'}\nType: ${record.recordType || '-'}\nStatus: ${record.status || '-'}\nAdded On: ${formatReadableDateTime(record.dateOfUpload || record.createdOn || record.recordDateTime)}`);
        setShowUnsupportedPrescriptionNotice(false);
        setPreviewDrawingJson(null);
        setPreviewPhysio(null);
        setPreviewGeneralRx(null);
      }

      setPreviewVisible(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load record details.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEditRecord = async (record: TaskDetailRecord) => {
    const recordType = normalizeRecordType(record);
    const isFinal = isFinalizedStatus(record.status);

    if (recordType === 'medicalRecord') {
      setErrorMessage('Editing medical records is not available in the current API.');
      return;
    }

    if (recordType === 'prescription' && isOutOfScopePrescriptionType(record.prescriptionType)) {
      setErrorMessage('Dental and Lab prescriptions are not editable on mobile in this phase. Please use web or download the finalized PDF.');
      return;
    }

    if (isFinal && (recordType === 'prescription' || recordType === 'clinicalnote')) {
      setErrorMessage('Final records are read-only and cannot be edited.');
      return;
    }

    setActionLoadingId(record.id);

    try {
      let nextEditingRecord: EditableRecordState | null = null;

      if (recordType === 'clinicalnote') {
        const detail = await getClinicalNoteDetail(token, record.id);
        nextEditingRecord = {
          type: 'clinicalnote',
          id: detail.id,
          displayId: record.displayId,
          clinicalNote: detail,
        };
      }

      if (recordType === 'prescription') {
        const detail = await getPrescriptionDetail(token, record.id);
        nextEditingRecord = {
          type: 'prescription',
          id: detail.id,
          displayId: detail.displayId,
          prescription: detail,
        };
      }

      if (recordType === 'drawing') {
        const drawingId = record.diagramId || record.id;
        const detail = await getDrawingDetail(token, drawingId);
        nextEditingRecord = {
          type: 'drawing',
          id: detail.id,
          displayId: record.displayId,
          drawing: detail,
        };
      }

      if (nextEditingRecord) {
        setEditingRecord(nextEditingRecord);
        setActiveRecordModalTemplate(mapEditingRecordToTemplate(nextEditingRecord));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load record for edit.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRecord = (record: TaskDetailRecord) => {
    const recordType = normalizeRecordType(record);
    const isFinal = isFinalizedStatus(record.status);

    if (isFinal && (recordType === 'prescription' || recordType === 'clinicalnote')) {
      setErrorMessage('Final records cannot be deleted.');
      return;
    }

    Alert.alert('Delete record', 'This action cannot be undone. Continue?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoadingId(record.id);
          try {
            if (recordType === 'prescription') {
              await deletePrescriptionRecord(token, record.id);
            }

            if (recordType === 'clinicalnote') {
              await deleteClinicalNote(token, record.id);
            }

            if (recordType === 'drawing') {
              await deleteDrawingRecord(token, record.diagramId || record.id);
            }

            if (recordType === 'medicalRecord') {
              await deleteMedicalRecord(token, record.id);
            }

            await refreshLinkedRecords();
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to delete record.');
          } finally {
            setActionLoadingId(null);
          }
        },
      },
    ]);
  };

  const handleDownloadRecord = async (record: TaskDetailRecord) => {
    const recordType = normalizeRecordType(record);
    setActionLoadingId(record.id);

    try {
      if (recordType === 'prescription') {
        if (!isFinalizedStatus(record.status)) {
          setErrorMessage('Only finalized prescriptions can be downloaded.');
          return;
        }

        await downloadPrescriptionPdf(token, record.id, record.displayId);
      }

      if (recordType === 'clinicalnote') {
        await downloadClinicalNoteFile(token, record.id, record.displayId);
      }

      if (recordType === 'drawing') {
        await downloadDrawingFile(token, record.diagramId || record.id, record.displayId);
      }

      if (recordType === 'medicalRecord') {
        await downloadMedicalRecordFile(token, record.id, record.name || record.displayId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to download record.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateSelection = (key: RecordCreateOptionKey) => {
    setFabOptionsVisible(false);

    if (key === 'medicalRecord') {
      setMedicalRecordModalVisible(true);
      return;
    }

    setEditingRecord(null);
    setActiveRecordModalTemplate(key);
  };

  const closeRecordModal = () => {
    setActiveRecordModalTemplate(null);
    setEditingRecord(null);
  };

  const handleRecordSaved = async () => {
    closeRecordModal();
    await refreshLinkedRecords();
  };

  if (loading) {
    return (
      <View style={taskDetailsPanelStyles.loadingWrap}>
        <View style={taskDetailsPanelStyles.loadingRow}>
          <ActivityIndicator size="small" color={themeColors.primary} />
          <Text style={taskDetailsPanelStyles.loadingText}>Loading task details...</Text>
        </View>
      </View>
    );
  }

  if (errorMessage) {
    return <Text style={taskDetailsPanelStyles.errorText}>{errorMessage}</Text>;
  }

  if (!task) {
    return <Text style={taskDetailsPanelStyles.errorText}>Service details are unavailable.</Text>;
  }

  const patientName = formatPatientName(task) || 'Unnamed Patient';
  const statusTone = getStatusTone(task.status);
  const canOpenCreateChooser = task.status === 'InProgress';
  const canStartTask = canStartService(task.status);
  const canCompleteTask = task.status === 'InProgress';
  const canUndoTask = task.status === 'InProgress' || task.status === 'Completed';

  return (
    <View style={taskDetailsPanelStyles.panelRoot}>
      <ScrollView contentContainerStyle={taskDetailsPanelStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card mode="outlined" style={taskDetailsPanelStyles.headerCard}>
        <Card.Content>
          <View style={taskDetailsPanelStyles.statusRow}>
            <View style={taskDetailsPanelStyles.titleBlock}>
              <Text style={taskDetailsPanelStyles.headerEyebrow}>Task Details</Text>
              <Text style={taskDetailsPanelStyles.title}>{patientName}</Text>
              <Text style={taskDetailsPanelStyles.subTitle}>{task.serviceName || 'Service not assigned'}</Text>
            </View>
            <View style={[taskDetailsPanelStyles.statusChip, statusTone.badgeStyle]}>
              <Text style={[taskDetailsPanelStyles.statusChipText, statusTone.textStyle]}>{getStatusLabel(task.status)}</Text>
            </View>
          </View>

          <View style={taskDetailsPanelStyles.metaGrid}>
            <View style={taskDetailsPanelStyles.metaRowCard}>
              <Text style={taskDetailsPanelStyles.metaKey}>Task ID</Text>
              <Text style={taskDetailsPanelStyles.metaValue}>{task.displayId || task.id || '-'}</Text>
            </View>
            <View style={taskDetailsPanelStyles.metaRowCard}>
              <Text style={taskDetailsPanelStyles.metaKey}>Date</Text>
              <Text style={taskDetailsPanelStyles.metaValue}>{formatReadableDateTime(task.scheduledStartDateTime)}</Text>
            </View>
            <View style={taskDetailsPanelStyles.metaRowCard}>
              <Text style={taskDetailsPanelStyles.metaKey}>Assigned To</Text>
              <Text style={taskDetailsPanelStyles.metaValue}>{task.assignedToUserName || '-'}</Text>
            </View>
          </View>

          {(canStartTask || canCompleteTask || canUndoTask) ? (
            <View style={taskDetailsPanelStyles.taskStatusActions}>
              {canStartTask ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start task"
                  disabled={taskActionLoading}
                  onPress={() => void handleTaskStatusChange('InProgress')}
                  style={[taskDetailsPanelStyles.taskStatusActionButton, taskActionLoading ? taskDetailsPanelStyles.taskStatusActionButtonDisabled : null]}
                >
                  <Feather name="play" size={14} color={themeColors.textOnBrand} />
                  <Text style={taskDetailsPanelStyles.taskStatusActionText}>Start</Text>
                </Pressable>
              ) : null}

              {canCompleteTask ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Complete task"
                  disabled={taskActionLoading}
                  onPress={() => void handleTaskStatusChange('Completed')}
                  style={[taskDetailsPanelStyles.taskStatusActionButton, taskActionLoading ? taskDetailsPanelStyles.taskStatusActionButtonDisabled : null]}
                >
                  <Feather name="check-circle" size={14} color={themeColors.textOnBrand} />
                  <Text style={taskDetailsPanelStyles.taskStatusActionText}>Complete</Text>
                </Pressable>
              ) : null}

              {canUndoTask ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Undo task status"
                  disabled={taskActionLoading}
                  onPress={() => void handleUndoTaskStatus()}
                  style={[taskDetailsPanelStyles.taskStatusActionButtonSecondary, taskActionLoading ? taskDetailsPanelStyles.taskStatusActionButtonDisabled : null]}
                >
                  <Feather name="corner-up-left" size={14} color={themeColors.secondary} />
                  <Text style={taskDetailsPanelStyles.taskStatusActionTextSecondary}>Undo</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Card.Content>
      </Card>

      <Card mode="outlined" style={taskDetailsPanelStyles.sectionCard}>
        <Card.Content>
          <View style={taskDetailsPanelStyles.sectionHeader}>
            <View>
              <Text style={taskDetailsPanelStyles.sectionHeading}>Patient Information</Text>
              <Text style={taskDetailsPanelStyles.sectionHint}>Identity and contact details</Text>
            </View>
          </View>

          <View style={taskDetailsPanelStyles.infoCard}>
            <Text style={taskDetailsPanelStyles.infoName}>{patientName}</Text>
            {buildPatientInfo(task).map((row) => (
              <View key={row.key} style={taskDetailsPanelStyles.infoKeyValueRow}>
                <Text style={taskDetailsPanelStyles.infoKey}>{row.key}</Text>
                <Text style={taskDetailsPanelStyles.infoVal}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined" style={taskDetailsPanelStyles.sectionCard}>
        <Card.Content>
          <View style={taskDetailsPanelStyles.sectionHeader}>
            <View>
              <Text style={taskDetailsPanelStyles.sectionHeading}>Visit Information</Text>
              <Text style={taskDetailsPanelStyles.sectionHint}>Service and visit context</Text>
            </View>
          </View>

          <View style={taskDetailsPanelStyles.infoCard}>
            {buildVisitInfo(task).map((row) => (
              <View key={row.key} style={taskDetailsPanelStyles.infoKeyValueRow}>
                <Text style={taskDetailsPanelStyles.infoKey}>{row.key}</Text>
                <Text style={taskDetailsPanelStyles.infoVal}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined" style={taskDetailsPanelStyles.sectionCard}>
        <Card.Content>
          <View style={taskDetailsPanelStyles.sectionHeader}>
            <View>
              <Text style={taskDetailsPanelStyles.sectionHeading}>Records</Text>
              <Text style={taskDetailsPanelStyles.sectionHint}>Prescriptions, notes, drawings, and medical records</Text>
            </View>
            <View style={taskDetailsPanelStyles.sectionCountBadge}>
              <Text style={taskDetailsPanelStyles.sectionCountText}>{displayRecords.length} records</Text>
            </View>
          </View>

          <View style={taskDetailsPanelStyles.recordsList}>
            {displayRecords.length > 0 ? (
              displayRecords.map((record) => {
                  const addedOn = formatReadableDateTime(
                    record.createdOn || record.lastModifiedOn || record.dateOfUpload || record.recordDateTime,
                  );

                  const createdBy = record.createdByUserName || record.lastModifiedByUserName || 'Unknown';
                  const recordType = normalizeRecordType(record);
                  const isFinal = isFinalizedStatus(record.status);
                  const isOutOfScopePrescription = recordType === 'prescription' && isOutOfScopePrescriptionType(record.prescriptionType);
                  const canEdit =
                    recordType !== 'medicalRecord' &&
                    !isOutOfScopePrescription &&
                    !(isFinal && (recordType === 'prescription' || recordType === 'clinicalnote'));
                  const canDelete = !(isFinal && (recordType === 'prescription' || recordType === 'clinicalnote'));
                  const canDownload = recordType !== 'prescription' || isFinal;
                  const operations: Array<{
                    key: 'view' | 'edit' | 'delete' | 'download';
                    label: string;
                    icon: keyof typeof Feather.glyphMap;
                    onPress: () => void;
                    isPrimary?: boolean;
                  }> = [
                    {
                      key: 'view',
                      label: 'View',
                      icon: 'eye',
                      isPrimary: true,
                      onPress: () => {
                        setExpandedRecordActionsId(null);
                        void handleViewRecord(record);
                      },
                    },
                    ...(canEdit
                      ? [
                          {
                            key: 'edit' as const,
                            label: 'Edit',
                            icon: 'edit-2' as const,
                            onPress: () => {
                              setExpandedRecordActionsId(null);
                              void handleEditRecord(record);
                            },
                          },
                        ]
                      : []),
                    ...(canDelete
                      ? [
                          {
                            key: 'delete' as const,
                            label: 'Delete',
                            icon: 'trash-2' as const,
                            onPress: () => {
                              setExpandedRecordActionsId(null);
                              handleDeleteRecord(record);
                            },
                          },
                        ]
                      : []),
                    ...(canDownload
                      ? [
                          {
                            key: 'download' as const,
                            label: 'Download',
                            icon: 'download' as const,
                            onPress: () => {
                              setExpandedRecordActionsId(null);
                              void handleDownloadRecord(record);
                            },
                          },
                        ]
                      : []),
                  ];
                  const inlineOperations = operations.slice(0, 2);
                  const overflowOperations = operations.slice(2);
                  const recordStatusIcon = getRecordStatusIcon(record.status);

                  return (
                    <View
                      key={`${record.sourceType ?? 'record'}-${record.id}`}
                      style={[
                        taskDetailsPanelStyles.recordCard,
                        expandedRecordActionsId === record.id ? taskDetailsPanelStyles.recordCardActiveLayer : null,
                      ]}
                    >
                      <View style={taskDetailsPanelStyles.recordTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={taskDetailsPanelStyles.recordTitle} numberOfLines={1}>
                            {record.displayId || record.name || record.recordType || record.id}
                          </Text>
                          <View style={taskDetailsPanelStyles.recordTypeChip}>
                            <Text style={taskDetailsPanelStyles.recordTypeChipText}>{getDisplayRecordType(record)}</Text>
                          </View>
                        </View>
                        <View
                          accessibilityRole="image"
                          accessibilityLabel={recordStatusIcon.accessibilityLabel}
                          style={taskDetailsPanelStyles.recordStatusIconWrap}
                        >
                          <Feather name={recordStatusIcon.name} size={16} color={recordStatusIcon.color} />
                        </View>
                      </View>

                      <View style={taskDetailsPanelStyles.recordBody}>
                        <View style={taskDetailsPanelStyles.infoKeyValueRow}>
                          <Text style={taskDetailsPanelStyles.infoKey}>Added By</Text>
                          <Text style={taskDetailsPanelStyles.recordMetaStrong}>{createdBy}</Text>
                        </View>
                        <View style={taskDetailsPanelStyles.infoKeyValueRow}>
                          <Text style={taskDetailsPanelStyles.infoKey}>Added On</Text>
                          <Text style={taskDetailsPanelStyles.recordMetaStrong}>{addedOn}</Text>
                        </View>
                      </View>

                      <View style={taskDetailsPanelStyles.recordActions}>
                        {inlineOperations.map((operation) => (
                          <Pressable
                            key={`${record.id}-${operation.key}`}
                            accessibilityRole="button"
                            accessibilityLabel={`${operation.label} record`}
                            style={operation.isPrimary ? taskDetailsPanelStyles.actionPill : taskDetailsPanelStyles.actionPillSecondary}
                            onPress={operation.onPress}
                          >
                            <Feather
                              name={operation.icon}
                              size={14}
                              color={operation.isPrimary ? themeColors.textOnBrand : themeColors.textPrimary}
                            />
                            <Text
                              style={
                                operation.isPrimary
                                  ? taskDetailsPanelStyles.actionPillText
                                  : taskDetailsPanelStyles.actionPillTextSecondary
                              }
                            >
                              {operation.label}
                            </Text>
                          </Pressable>
                        ))}
                        {overflowOperations.length > 0 ? (
                          <View style={taskDetailsPanelStyles.actionOverflowWrap}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="More record actions"
                              style={taskDetailsPanelStyles.actionIconButtonSecondary}
                              onPress={() =>
                                setExpandedRecordActionsId((currentValue) => (currentValue === record.id ? null : record.id))
                              }
                            >
                              <Feather name="more-horizontal" size={16} color={themeColors.textPrimary} />
                            </Pressable>
                            {expandedRecordActionsId === record.id ? (
                              <View style={taskDetailsPanelStyles.actionOverflowMenu}>
                                {overflowOperations.map((operation) => (
                                  <Pressable
                                    key={`${record.id}-${operation.key}-menu`}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${operation.label} record`}
                                    style={taskDetailsPanelStyles.actionOverflowItem}
                                    onPress={operation.onPress}
                                  >
                                    <Feather
                                      name={operation.icon}
                                      size={14}
                                      color={operation.isPrimary ? themeColors.primary : themeColors.textPrimary}
                                    />
                                    <Text style={taskDetailsPanelStyles.actionOverflowItemText}>{operation.label}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                        {actionLoadingId === record.id ? <ActivityIndicator size="small" color={themeColors.primary} /> : null}
                      </View>
                    </View>
                  );
                })
            ) : (
              <View style={taskDetailsPanelStyles.emptyState}>
                <Text style={taskDetailsPanelStyles.emptyText}>No records found for this service.</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      </ScrollView>

      <Modal animationType="slide" visible={previewVisible} onRequestClose={() => setPreviewVisible(false)}>
        <View style={taskDetailsPanelStyles.previewScreen}>
          <View style={taskDetailsPanelStyles.previewHeader}>
            <Text style={taskDetailsPanelStyles.previewTitle}>{previewTitle}</Text>
            <Pressable onPress={() => setPreviewVisible(false)}>
              <Text style={taskDetailsPanelStyles.previewClose}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={taskDetailsPanelStyles.previewBody}>
            {showUnsupportedPrescriptionNotice ? (
              <UnsupportedPrescriptionNotice />
            ) : previewDrawingJson ? (
              <DrawingCanvasEditor initialJson={previewDrawingJson} readOnly />
            ) : previewPhysio ? (
              <PhysiotherapyReadOnlyView data={previewPhysio} />
            ) : previewGeneralRx ? (
              <GeneralRxReadOnlyView data={previewGeneralRx} />
            ) : (
              <Text style={taskDetailsPanelStyles.previewText}>{previewText || 'No preview available.'}</Text>
            )}
          </ScrollView>
        </View>
      </Modal>

      <AddGeneralRxModal
        visible={activeRecordModalTemplate === 'generalRx'}
        token={token}
        facilityId={facilityId}
        serviceId={task.id}
        editingRecord={editingRecord}
        onClose={closeRecordModal}
        onSaved={handleRecordSaved}
      />

      <AddPhysiotherapyRxModal
        visible={activeRecordModalTemplate === 'physiotherapyRx'}
        token={token}
        facilityId={facilityId}
        serviceId={task.id}
        editingRecord={editingRecord}
        onClose={closeRecordModal}
        onSaved={handleRecordSaved}
      />

      <AddFrozenShoulderRxModal
        visible={activeRecordModalTemplate === 'frozenShoulderRx'}
        token={token}
        facilityId={facilityId}
        serviceId={task.id}
        editingRecord={editingRecord}
        onClose={closeRecordModal}
        onSaved={handleRecordSaved}
      />

      <AddDentalRxModal
        visible={activeRecordModalTemplate === 'dentalRx'}
        token={token}
        facilityId={facilityId}
        serviceId={task.id}
        editingRecord={editingRecord}
        onClose={closeRecordModal}
        onSaved={handleRecordSaved}
      />

      <AddLabReportModal
        visible={activeRecordModalTemplate === 'labReport'}
        token={token}
        facilityId={facilityId}
        serviceId={task.id}
        editingRecord={editingRecord}
        onClose={closeRecordModal}
        onSaved={handleRecordSaved}
      />

      <AddGeneralNotesModal
        visible={activeRecordModalTemplate === 'generalNotes'}
        token={token}
        facilityId={facilityId}
        serviceId={task.id}
        editingRecord={editingRecord}
        onClose={closeRecordModal}
        onSaved={handleRecordSaved}
      />

      <AddPhysiotherapyTxNotesModal
        visible={activeRecordModalTemplate === 'physiotherapyTxNotes'}
        token={token}
        facilityId={facilityId}
        serviceId={task.id}
        editingRecord={editingRecord}
        onClose={closeRecordModal}
        onSaved={handleRecordSaved}
      />

      <AddDiagramModal
        visible={activeRecordModalTemplate === 'diagram'}
        token={token}
        facilityId={facilityId}
        serviceId={task.id}
        editingRecord={editingRecord}
        onClose={closeRecordModal}
        onSaved={handleRecordSaved}
      />

      <AddMedicalRecordModal
        visible={medicalRecordModalVisible}
        token={token}
        facilityId={facilityId}
        serviceId={task.id}
        onClose={() => setMedicalRecordModalVisible(false)}
        onSaved={() => {
          void refreshLinkedRecords();
        }}
      />

      {canOpenCreateChooser ? (
        <View pointerEvents="box-none" style={taskDetailsPanelStyles.fabOverlay}>
          {fabOptionsVisible ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setFabOptionsVisible(false)}
              style={taskDetailsPanelStyles.fabBackdrop}
            />
          ) : null}

          {fabOptionsVisible ? (
            <View style={taskDetailsPanelStyles.fabOptionsWrap}>
              {createOptions.map((option) => (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  onPress={() => handleCreateSelection(option.key)}
                  style={taskDetailsPanelStyles.fabOptionButton}
                >
                  <Text style={taskDetailsPanelStyles.fabOptionText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setFabOptionsVisible((visible) => !visible)}
            style={taskDetailsPanelStyles.fabButton}
          >
            <Text style={taskDetailsPanelStyles.fabButtonText}>{fabOptionsVisible ? '×' : '+'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
