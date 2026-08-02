import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { loadPatientsByCreatedDateRange } from '../../api/patients';
import { loadFacilityVisits, loadVisitDetails } from '../../api/visits';
import { loadMyAssignedServices } from '../../api/worklist';
import { themeColors } from '../../theme/colors';
import type { PatientSummary } from '../../types/patients';
import type { AssignedService } from '../../types/worklist';
import { formatDateInput, toUtcIsoRange } from '../../utils/dateRangeFilter';
import type { SummaryMetricKey } from '../../api/summary';

interface SummaryDetailModalProps {
  visible: boolean;
  title: string;
  metric: SummaryMetricKey;
  token: string;
  facilityId: string;
  onClose: () => void;
}

interface DetailListItem {
  id: string;
  primaryText: string;
  secondaryText?: string;
}

function getTodayRange() {
  const today = new Date();
  const fromDate = formatDateInput(today);
  const toDate = formatDateInput(today);
  return toUtcIsoRange(fromDate, toDate);
}

function formatTaskLabel(item: AssignedService) {
  const patientName = [item.patientPrefix, item.patientFirstName, item.patientLastName].filter(Boolean).join(' ').trim();
  return patientName || item.serviceName || 'Unnamed service';
}

function formatPatientLabel(item: PatientSummary) {
  return [item.prefix, item.firstName, item.lastName].filter(Boolean).join(' ').trim() || 'Unnamed patient';
}

export function SummaryDetailModal({ visible, title, metric, token, facilityId, onClose }: SummaryDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DetailListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;

    const loadDetails = async () => {
      setLoading(true);
      setErrorMessage(null);
      setData([]);

      try {
        const { from, to } = getTodayRange();

        if (metric === 'allTasks' || metric === 'incompleteTasks' || metric === 'myTasks') {
          const services = await loadMyAssignedServices(token, facilityId, from, to);
          const filtered = services.filter((service) => {
            if (metric === 'incompleteTasks') {
              return (service.status ?? '').trim().toLowerCase() !== 'completed';
            }
            return true;
          });

          const items = filtered.map((service) => ({
            id: service.id,
            primaryText: formatTaskLabel(service),
            secondaryText: service.serviceName || 'Assigned service',
          }));

          if (isMounted) {
            setData(items);
          }
          return;
        }

        if (metric === 'newPatients') {
          const patients = await loadPatientsByCreatedDateRange(token, facilityId, formatDateInput(new Date()), formatDateInput(new Date()));
          const items = patients.map((patient) => ({
            id: patient.id,
            primaryText: formatPatientLabel(patient),
            secondaryText: patient.mrn || 'Patient',
          }));

          if (isMounted) {
            setData(items);
          }
          return;
        }

        if (metric === 'visits') {
          const visits = await loadFacilityVisits(token, facilityId, { from, to, statusList: [] });
          const items = await Promise.all(
            visits.map(async (visit) => {
              try {
                const detail = await loadVisitDetails(token, facilityId, visit.id);
                return {
                  id: visit.id,
                  primaryText: [visit.patientPrefix, visit.patientFirstName, visit.patientLastName].filter(Boolean).join(' ').trim() || visit.displayId || 'Visit',
                  secondaryText: `₹${(detail.advanceAmount ?? 0).toLocaleString('en-IN')}`,
                };
              } catch {
                return {
                  id: visit.id,
                  primaryText: [visit.patientPrefix, visit.patientFirstName, visit.patientLastName].filter(Boolean).join(' ').trim() || visit.displayId || 'Visit',
                  secondaryText: 'Payment unavailable',
                };
              }
            }),
          );

          if (isMounted) {
            setData(items);
          }
          return;
        }

        if (metric === 'enquiries') {
          if (isMounted) {
            setData([]);
          }
          return;
        }

        if (isMounted) {
          setData([]);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load details.');
          setData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadDetails();

    return () => {
      isMounted = false;
    };
  }, [facilityId, metric, token, visible]);

  const emptyMessage = useMemo(() => {
    if (metric === 'enquiries') {
      return 'No enquiries found for today.';
    }

    return 'No records found for today.';
  }, [metric]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Today</Text>
            </View>
            <IconButton icon="close" size={18} onPress={onClose} />
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={themeColors.primary} />
              <Text style={styles.emptyText}>Loading details…</Text>
            </View>
          ) : null}

          {!loading && errorMessage ? (
            <View style={styles.loadingState}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {!loading && !errorMessage && data.length === 0 ? (
            <View style={styles.loadingState}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : null}

          {!loading && !errorMessage && data.length > 0 ? (
            <FlatList
              data={data}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <Text style={styles.listPrimary}>{item.primaryText}</Text>
                  {item.secondaryText ? <Text style={styles.listSecondary}>{item.secondaryText}</Text> : null}
                </View>
              )}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  loadingState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: themeColors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    textAlign: 'center',
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  listItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listPrimary: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  listSecondary: {
    color: themeColors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
