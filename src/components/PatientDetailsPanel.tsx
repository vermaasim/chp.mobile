import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { loadPatientDetails } from '../api/patients';
import { loadServiceLinkedRecords } from '../api/records';
import { loadVisitLinkedServices } from '../api/visits';
import { CenteredLoader } from './CenteredLoader';
import { taskDetailsPanelStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import type { PatientDetail, PatientVisitSummary } from '../types/patients';
import type { VisitLinkedService } from '../types/visits';
import type { TaskDetailRecord } from '../types/worklist';

interface PatientDetailsPanelProps {
  token: string;
  facilityId: string;
  patientId: string;
}

type VisitRecordsState = {
  loading: boolean;
  errorMessage: string | null;
  services: Array<VisitLinkedService & { records: TaskDetailRecord[] }>;
};

function formatPatientName(patient?: PatientDetail | null) {
  if (!patient) {
    return '-';
  }

  return [patient.prefix, patient.firstName, patient.lastName, patient.suffix].filter(Boolean).join(' ').trim() || '-';
}

function formatAge(ageInYears?: number) {
  if (typeof ageInYears !== 'number') {
    return '-';
  }

  return `${ageInYears} yrs`;
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string) {
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

function formatPhysicianName(visit: PatientVisitSummary) {
  return [visit.physicianPrefix, visit.physicianFirstName, visit.physicianLastName].filter(Boolean).join(' ').trim() || '-';
}

function formatAddress(patient?: PatientDetail | null) {
  if (!patient) {
    return '-';
  }

  return [
    patient.addressHouseNo,
    patient.addressStreet,
    patient.addressCity,
    patient.addressState,
    patient.addressPIN,
    patient.addressCountry,
  ]
    .filter(Boolean)
    .join(', ') || '-';
}

function formatRecordType(record: TaskDetailRecord) {
  if (record.sourceType === 'prescription') {
    return record.prescriptionType || 'Prescription';
  }

  if (record.sourceType === 'clinicalnote') {
    return record.noteType || 'Clinical Note';
  }

  if (record.sourceType === 'medicalRecord') {
    return record.recordType || 'Medical Record';
  }

  return 'Drawing';
}

function getVisitStatusTone(status?: string) {
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

export function PatientDetailsPanel({ token, facilityId, patientId }: PatientDetailsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [visitRecords, setVisitRecords] = useState<Record<string, VisitRecordsState>>({});

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const result = await loadPatientDetails(token, facilityId, patientId);

        if (cancelled) {
          return;
        }

        const sortedVisits = [...result.visits].sort((left, right) => {
          const leftTime = new Date(left.scheduledStartDateTime || 0).getTime();
          const rightTime = new Date(right.scheduledStartDateTime || 0).getTime();
          return rightTime - leftTime;
        });

        setPatient({ ...result, visits: sortedVisits });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load patient details.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [token, facilityId, patientId]);

  const headerMetaRows = useMemo(
    () => [
      { key: 'MRN', value: patient?.mrn || '-' },
      { key: 'Gender', value: patient?.gender || '-' },
      { key: 'Age', value: formatAge(patient?.ageInYears) },
      { key: 'Mobile', value: patient?.mobileNo || '-' },
    ],
    [patient],
  );

  const loadVisitRecords = async (visitId: string) => {
    setVisitRecords((current) => ({
      ...current,
      [visitId]: {
        loading: true,
        errorMessage: null,
        services: current[visitId]?.services ?? [],
      },
    }));

    try {
      const services = await loadVisitLinkedServices(token, visitId);
      const servicesWithRecords = await Promise.all(
        services.map(async (service) => ({
          ...service,
          records: await loadServiceLinkedRecords(token, service.id),
        })),
      );

      setVisitRecords((current) => ({
        ...current,
        [visitId]: {
          loading: false,
          errorMessage: null,
          services: servicesWithRecords,
        },
      }));
    } catch (error) {
      setVisitRecords((current) => ({
        ...current,
        [visitId]: {
          loading: false,
          errorMessage: error instanceof Error ? error.message : 'Unable to load visit documents.',
          services: current[visitId]?.services ?? [],
        },
      }));
    }
  };

  const toggleVisit = (visitId: string) => {
    const nextExpanded = expandedVisitId === visitId ? null : visitId;
    setExpandedVisitId(nextExpanded);

    if (nextExpanded && !visitRecords[visitId]) {
      void loadVisitRecords(visitId);
    }
  };

  if (loading) {
    return <CenteredLoader message="Loading patient details..." containerStyle={taskDetailsPanelStyles.loadingWrap} />;
  }

  if (errorMessage) {
    return <Text style={taskDetailsPanelStyles.errorText}>{errorMessage}</Text>;
  }

  return (
    <ScrollView style={taskDetailsPanelStyles.panelRoot} contentContainerStyle={taskDetailsPanelStyles.scrollContent}>
      <Card mode="outlined" style={taskDetailsPanelStyles.headerCard}>
        <Card.Content>
          <Text style={taskDetailsPanelStyles.headerEyebrow}>Patient</Text>
          <Text style={taskDetailsPanelStyles.title}>{formatPatientName(patient)}</Text>

          <View style={taskDetailsPanelStyles.metaGrid}>
            {headerMetaRows.map((row) => (
              <View key={row.key} style={taskDetailsPanelStyles.metaRowCard}>
                <Text style={taskDetailsPanelStyles.metaKey}>{row.key}</Text>
                <Text style={taskDetailsPanelStyles.metaValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined" style={taskDetailsPanelStyles.sectionCard}>
        <Card.Content>
          <View style={taskDetailsPanelStyles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={taskDetailsPanelStyles.sectionHeading}>Patient Information</Text>
              <Text style={taskDetailsPanelStyles.sectionHint}>Profile and contact details</Text>
            </View>
          </View>
        </Card.Content>
        <Card.Content style={styles.sectionBody}>
          <Row label="Date of Birth" value={formatDate(patient?.dateOfBirth)} />
          <Row label="Email" value={patient?.emailId || '-'} />
          <Row label="Emergency Contact" value={patient?.emergencyContactPerson || '-'} />
          <Row label="Relationship" value={patient?.emergencyContactRelationship || '-'} />
          <Row label="Emergency Number" value={patient?.emergencyContactPhoneNumber || '-'} />
          <Row label="Address" value={formatAddress(patient)} multiline />
        </Card.Content>
      </Card>

      <Card mode="outlined" style={taskDetailsPanelStyles.sectionCard}>
        <Card.Content>
          <View style={taskDetailsPanelStyles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={taskDetailsPanelStyles.sectionHeading}>Visits History</Text>
              <Text style={taskDetailsPanelStyles.sectionHint}>Latest visits for this patient</Text>
            </View>
            <View style={taskDetailsPanelStyles.sectionCountBadge}>
              <Text style={taskDetailsPanelStyles.sectionCountText}>{`${patient?.visits.length ?? 0} visits`}</Text>
            </View>
          </View>
        </Card.Content>
        <Card.Content style={styles.sectionBody}>
          {(patient?.visits ?? []).map((visit) => {
            const isExpanded = expandedVisitId === visit.id;
            const visitState = visitRecords[visit.id];
            const visitStatusTone = getVisitStatusTone(visit.visitStatus || visit.status);
            const visitStatusLabel = (visit.visitStatus || visit.status || 'Scheduled').replace(/([a-z])([A-Z])/g, '$1 $2');

            return (
              <View key={visit.id} style={styles.visitCard}>
                <Pressable accessibilityRole="button" onPress={() => toggleVisit(visit.id)} style={styles.visitHeaderRow}>
                  <View style={styles.visitHeaderTextWrap}>
                    <Text style={styles.visitTitle}>{visit.displayId || visit.visitDisplayId || visit.id}</Text>
                    <Text style={styles.visitSubtitle}>{visit.primaryServiceName || 'Visit'}</Text>
                    <Text style={styles.visitMeta}>{formatDateTime(visit.scheduledStartDateTime)}</Text>
                    <Text style={styles.visitMeta}>Physician: {formatPhysicianName(visit)}</Text>
                  </View>
                  <View style={styles.visitHeaderActionWrap}>
                    <View style={[taskDetailsPanelStyles.statusChip, visitStatusTone.badgeStyle]}>
                      <Text style={[taskDetailsPanelStyles.statusChipText, visitStatusTone.textStyle]}>{visitStatusLabel}</Text>
                    </View>
                    <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={themeColors.textSecondary} />
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.visitExpandedBody}>
                    {visit.notes ? <Row label="Notes" value={visit.notes} multiline /> : null}
                    {visit.referredBy ? <Row label="Referred By" value={visit.referredBy} /> : null}

                    {visitState?.loading ? (
                      <View style={styles.inlineLoadingRow}>
                        <ActivityIndicator size="small" color={themeColors.primary} />
                        <Text style={styles.inlineLoadingText}>Loading linked services and documents...</Text>
                      </View>
                    ) : null}

                    {visitState?.errorMessage ? <Text style={taskDetailsPanelStyles.errorText}>{visitState.errorMessage}</Text> : null}

                    {visitState && !visitState.loading ? (
                      <View style={styles.servicesWrap}>
                        {visitState.services.map((service) => (
                          <View key={service.id} style={styles.serviceCard}>
                            <Text style={styles.serviceId}>{service.displayId || service.id}</Text>
                            <Text style={styles.serviceName}>{service.serviceName || '-'}</Text>
                            <Text style={styles.serviceMeta}>Assigned To: {service.assignedToUserName || 'Not Assigned'}</Text>
                            <Text style={styles.serviceMeta}>Status: {service.status || '-'}</Text>

                            {service.records.length > 0 ? (
                              <View style={styles.recordList}>
                                {service.records.map((record) => (
                                  <View key={`${service.id}-${record.id}`} style={styles.recordRow}>
                                    <Text style={styles.recordTitle}>{record.displayId || record.name || record.id}</Text>
                                    <Text style={styles.recordMeta}>{formatRecordType(record)}</Text>
                                  </View>
                                ))}
                              </View>
                            ) : (
                              <Text style={styles.emptyNestedText}>No linked documents found for this service.</Text>
                            )}
                          </View>
                        ))}

                        {visitState.services.length === 0 ? (
                          <Text style={styles.emptyNestedText}>No linked services found for this visit.</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}

          {(patient?.visits.length ?? 0) === 0 ? <Text style={styles.emptyNestedText}>No visits found for this patient.</Text> : null}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

function Row({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline ? styles.infoValueMultiline : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBody: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoLabel: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  infoValue: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1.4,
    textAlign: 'right',
  },
  infoValueMultiline: {
    textAlign: 'left',
  },
  visitCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: themeColors.surfaceMuted,
    overflow: 'hidden',
  },
  visitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
  },
  visitHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  visitHeaderActionWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  visitTitle: {
    color: themeColors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  visitSubtitle: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  visitMeta: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  visitExpandedBody: {
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    padding: 12,
    gap: 10,
  },
  inlineLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineLoadingText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  servicesWrap: {
    gap: 8,
  },
  serviceCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    backgroundColor: themeColors.surface,
    padding: 10,
    gap: 2,
  },
  serviceId: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  serviceName: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  serviceMeta: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  recordList: {
    gap: 6,
    marginTop: 8,
  },
  recordRow: {
    borderRadius: 8,
    backgroundColor: themeColors.surfaceMuted,
    padding: 8,
  },
  recordTitle: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  recordMeta: {
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  emptyNestedText: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
});