import { useEffect, useState, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenteredLoader } from './CenteredLoader';
import { loadLastAccessedPatients, searchFacilityPatients } from '../api/patients';
import { allStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import type { PatientSummary } from '../types/patients';

interface PatientsPanelProps {
  token: string;
  facilityId: string;
  onOpenPatientDetails: (patientId: string) => void;
  onOpenCreatePatient: () => void;
}

const PATIENT_LIST_COUNT = 20;

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
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchPatients = async (keyword: string) => {
    const normalizedKeyword = keyword.trim();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setLoading(true);
    setErrorMessage(null);

    try {
      const items = normalizedKeyword
        ? await searchFacilityPatients(token, facilityId, normalizedKeyword)
        : await loadLastAccessedPatients(token, facilityId, PATIENT_LIST_COUNT);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setPatients(items ?? []);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : 'Unable to load patients.');
      setPatients([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const keyword = searchText.trim();
    const timer = setTimeout(() => {
      void fetchPatients(keyword);
    }, keyword ? 250 : 0);

    return () => {
      clearTimeout(timer);
    };
  }, [facilityId, searchText, token]);

  return (
    <View style={[allStyles.container, styles.panelRoot]}>
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

        <Pressable accessibilityRole="button" onPress={() => void fetchPatients(searchText)} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={16} color={themeColors.primary} />
        </Pressable>
      </View>

      {errorMessage ? <Text style={allStyles.errorText}>{errorMessage}</Text> : null}

      {loading ? <CenteredLoader message={searchText.trim() ? 'Searching patients...' : 'Loading patients...'} containerStyle={allStyles.loadingWrap} /> : null}

      <ScrollView style={allStyles.list} contentContainerStyle={[allStyles.listContent, styles.listContentWithFab]}>
        {patients.map((patient) => (
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

        {!loading && patients.length === 0 ? (
          <View style={allStyles.emptyState}>
            <Feather name="users" size={18} color={themeColors.textSecondary} />
            <Text style={allStyles.emptyText}>No patients found</Text>
            <Text style={allStyles.emptySubText}>Try a different search or refresh the active list.</Text>
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
    marginBottom: 10,
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
    paddingBottom: 108,
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