import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateRangeFilterCard } from './DateRangeFilterCard';
import { loadPatientsByCreatedDateRange } from '../api/patients';
import { loadPatientsDateFilterPreference, savePatientsDateFilterPreference } from '../storage/patientsFilter';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import type { PatientSummary } from '../types/patients';
import { getRangeForOption, type DateFilterOption } from '../utils/dateRangeFilter';

interface PatientsPanelProps {
  token: string;
  facilityId: string;
  onOpenPatientDetails: (patientId: string) => void;
  onOpenCreatePatient: () => void;
}

function formatPatientName(patient: PatientSummary) {
  return [patient.prefix, patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || 'Unnamed Patient';
}

function formatAge(ageInYears?: number) {
  if (typeof ageInYears !== 'number' || Number.isNaN(ageInYears)) {
    return '-';
  }

  return `${ageInYears} yrs`;
}

function formatStatus(patient: PatientSummary) {
  if (patient.isActive === false) {
    return 'Inactive';
  }

  return 'Active';
}

export function PatientsPanel({ token, facilityId, onOpenPatientDetails, onOpenCreatePatient }: PatientsPanelProps) {
  const insets = useSafeAreaInsets();
  const initialRange = useMemo(() => getRangeForOption('today'), []);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [selectedFilterOption, setSelectedFilterOption] = useState<DateFilterOption>('today');
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshPatients = async (nextFromDate = fromDate, nextToDate = toDate) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const items = await loadPatientsByCreatedDateRange(token, facilityId, nextFromDate, nextToDate);
      setPatients(items ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load patients.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapFilter = async () => {
      const savedPreference = await loadPatientsDateFilterPreference();

      if (!isMounted) {
        return;
      }

      if (!savedPreference) {
        await refreshPatients(initialRange.fromDate, initialRange.toDate);
        return;
      }

      setSelectedFilterOption(savedPreference.option);
      setFromDate(savedPreference.fromDate);
      setToDate(savedPreference.toDate);

      await refreshPatients(savedPreference.fromDate, savedPreference.toDate);
    };

    void bootstrapFilter();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPatients = useMemo(() => {
    const normalizedQuery = searchText.trim().toLowerCase();

    if (!normalizedQuery) {
      return patients;
    }

    return patients.filter((patient) => {
      const fields = [
        patient.mrn,
        patient.firstName,
        patient.lastName,
        patient.gender,
        patient.mobileNo,
        patient.emailId,
      ];

      return fields.some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [patients, searchText]);

  return (
    <View style={[allStyles.container, styles.panelRoot]}>
      <DateRangeFilterCard
        summaryLabel="Patients created"
        selectedOption={selectedFilterOption}
        fromDate={fromDate}
        toDate={toDate}
        onApply={async (selection) => {
          setSelectedFilterOption(selection.option);
          setFromDate(selection.fromDate);
          setToDate(selection.toDate);

          await savePatientsDateFilterPreference({
            option: selection.option,
            fromDate: selection.fromDate,
            toDate: selection.toDate,
          });

          await refreshPatients(selection.fromDate, selection.toDate);
        }}
      />

      <View style={styles.searchRow}>
        <View style={styles.searchFieldWrap}>
          <Feather name="search" size={16} color={themeColors.textSecondary} />
          <TextInput
            placeholder="Search by name, MRN, phone"
            placeholderTextColor={themeColors.textSecondary}
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <Pressable accessibilityRole="button" onPress={() => void refreshPatients()} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={16} color={themeColors.primary} />
        </Pressable>
      </View>

      {errorMessage ? <Text style={allStyles.errorText}>{errorMessage}</Text> : null}

      {loading ? (
        <View style={allStyles.loadingWrap}>
          <View style={allStyles.loadingRow}>
            <ActivityIndicator size="small" color={themeColors.primary} />
            <Text style={allStyles.loadingText}>Loading patients...</Text>
          </View>
        </View>
      ) : null}

      <ScrollView style={allStyles.list} contentContainerStyle={[allStyles.listContent, styles.listContentWithFab]}>
        {filteredPatients.map((patient) => (
          <Pressable
            key={patient.id}
            accessibilityRole="button"
            onPress={() => onOpenPatientDetails(patient.id)}
            style={allStyles.taskCard}
          >
            <View style={allStyles.taskTopRow}>
              <View style={allStyles.taskNameWrap}>
                <Text style={allStyles.taskName}>{formatPatientName(patient)}</Text>
              </View>
              <View style={[allStyles.statusBadge, styles.activeBadge]}>
                <Text style={[allStyles.statusBadgeText, styles.activeBadgeText]}>{formatStatus(patient)}</Text>
              </View>
            </View>

            <Text numberOfLines={1} style={allStyles.taskServiceText}>MRN: {patient.mrn || '-'}</Text>
            <Text numberOfLines={1} style={allStyles.taskServiceText}>Gender: {patient.gender || '-'} | Age: {formatAge(patient.ageInYears)}</Text>

            <View style={allStyles.taskMetaRow}>
              <Text numberOfLines={1} style={allStyles.taskMetaItem}>Phone: {patient.mobileNo || '-'}</Text>
              <Text numberOfLines={1} style={[allStyles.taskMetaItem, allStyles.taskMetaItemRight]}>{patient.emailId || '-'}</Text>
            </View>
          </Pressable>
        ))}

        {!loading && filteredPatients.length === 0 ? (
          <View style={allStyles.emptyState}>
            <Feather name="users" size={18} color={themeColors.textSecondary} />
            <Text style={allStyles.emptyText}>No patients found for this filter</Text>
            <Text style={allStyles.emptySubText}>Adjust the date range or search terms.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create new patient"
        onPress={onOpenCreatePatient}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchFieldWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: themeColors.textPrimary,
    fontSize: 13,
    padding: 0,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  listContentWithFab: {
    paddingBottom: 144,
  },
  activeBadge: {
    backgroundColor: themeColors.successSurface,
  },
  activeBadgeText: {
    color: themeColors.primary,
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