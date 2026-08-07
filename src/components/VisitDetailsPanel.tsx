import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from 'react-native-paper';
import { loadVisitBillingSummary, loadVisitDetails, loadVisitLinkedServices } from '../api/visits';
import { CenteredLoader } from './CenteredLoader';
import { taskDetailsPanelStyles } from '../styles/commonStyles';
import { themeColors } from '../theme/colors';
import type { VisitBillingSummary, VisitDetail, VisitLinkedService } from '../types/visits';

interface VisitDetailsPanelProps {
  token: string;
  facilityId: string;
  visitId: string;
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

function formatPatientName(visit?: VisitDetail | null) {
  if (!visit) {
    return '-';
  }

  return [visit.patientPrefix, visit.patientFirstName, visit.patientLastName].filter(Boolean).join(' ').trim() || '-';
}

function formatPhysician(visit?: VisitDetail | null) {
  if (!visit) {
    return '-';
  }

  return [visit.physicianPrefix, visit.physicianFirstName, visit.physicianLastName].filter(Boolean).join(' ').trim() || '-';
}

function formatStatus(status?: string) {
  if (!status) {
    return '-';
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

function asCurrency(value?: number) {
  if (typeof value !== 'number') {
    return 'Rs 0.00';
  }

  return `Rs ${value.toFixed(2)}`;
}

export function VisitDetailsPanel({ token, facilityId, visitId }: VisitDetailsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [linkedServices, setLinkedServices] = useState<VisitLinkedService[]>([]);
  const [billing, setBilling] = useState<VisitBillingSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [visitResult, serviceResult, billingResult] = await Promise.all([
          loadVisitDetails(token, facilityId, visitId),
          loadVisitLinkedServices(token, visitId),
          loadVisitBillingSummary(token, visitId),
        ]);

        if (cancelled) {
          return;
        }

        setVisit(visitResult);
        setLinkedServices(serviceResult);
        setBilling(billingResult);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load visit details.');
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
  }, [token, facilityId, visitId]);

  if (loading) {
    return <CenteredLoader message="Loading visit details..." containerStyle={taskDetailsPanelStyles.loadingWrap} />;
  }

  if (errorMessage) {
    return <Text style={taskDetailsPanelStyles.errorText}>{errorMessage}</Text>;
  }

  return (
    <ScrollView style={taskDetailsPanelStyles.panelRoot} contentContainerStyle={taskDetailsPanelStyles.scrollContent}>
      <Card mode="outlined" style={[taskDetailsPanelStyles.headerCard, styles.headerCard]}>
        <Card.Content>
          <View style={taskDetailsPanelStyles.statusRow}>
            <View style={taskDetailsPanelStyles.titleBlock}>
              <Text style={taskDetailsPanelStyles.headerEyebrow}>Visit Details</Text>
              <Text style={taskDetailsPanelStyles.title}>{formatPatientName(visit)}</Text>
              <Text style={taskDetailsPanelStyles.subTitle}>{visit?.primaryServiceName || 'Visit details'}</Text>
            </View>

            <View style={[taskDetailsPanelStyles.statusChip, getStatusTone(visit?.visitStatus || visit?.status).badgeStyle]}>
              <Text style={[taskDetailsPanelStyles.statusChipText, getStatusTone(visit?.visitStatus || visit?.status).textStyle]}>
                {formatStatus(visit?.visitStatus || visit?.status)}
              </Text>
            </View>
          </View>

          <View style={taskDetailsPanelStyles.metaGrid}>
            <View style={taskDetailsPanelStyles.metaRowCard}>
              <View style={taskDetailsPanelStyles.metaTwoColRow}>
                <View style={taskDetailsPanelStyles.metaFieldBlock}>
                  <Text style={taskDetailsPanelStyles.metaLabel}>Visit ID</Text>
                  <Text style={taskDetailsPanelStyles.metaText}>{visit?.displayId || visit?.visitDisplayId || visit?.id || '-'}</Text>
                </View>
                <View style={taskDetailsPanelStyles.metaFieldBlock}>
                  <Text style={taskDetailsPanelStyles.metaLabel}>Physician</Text>
                  <Text style={taskDetailsPanelStyles.metaText}>{formatPhysician(visit)}</Text>
                </View>
              </View>
              <View style={taskDetailsPanelStyles.metaFieldBlock}>
                <Text style={taskDetailsPanelStyles.metaLabel}>Visit Time</Text>
                <Text style={taskDetailsPanelStyles.metaText}>{formatDateTime(visit?.scheduledStartDateTime)}</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined" style={styles.sectionCard}>
        <Card.Title title="Visit Information" />
        <Card.Content style={styles.sectionBody}>
          <Row label="Service" value={visit?.primaryServiceName || '-'} />
          <Row label="Type" value={visit?.currentVisitType || '-'} />
          <Row label="Start" value={formatDateTime(visit?.scheduledStartDateTime)} />
          <Row label="End" value={formatDateTime(visit?.scheduledEndDateTime)} />
          <Row label="Patient Notes" value={visit?.notes || '-'} />
          <Row label="Referred By" value={visit?.referredBy || '-'} />
        </Card.Content>
      </Card>

      <Card mode="outlined" style={styles.sectionCard}>
        <Card.Title title="Linked Services" subtitle={`${linkedServices.length} items`} />
        <Card.Content style={styles.sectionBody}>
          {linkedServices.map((item) => (
            <View key={item.id} style={styles.serviceRow}>
              <Text style={styles.serviceId}>{item.displayId || item.id}</Text>
              <Text style={styles.serviceName}>{item.serviceName || '-'}</Text>
              <Text style={styles.serviceMeta}>{item.assignedToUserName || 'Not Assigned'}</Text>
              <Text style={styles.serviceMeta}>{formatDateTime(item.scheduledStartDateTime)}</Text>
              <Text style={styles.serviceMeta}>{formatStatus(item.status)}</Text>
              <Text style={styles.serviceMeta}>{item.billingStatus || 'Not Billed'}</Text>
            </View>
          ))}

          {linkedServices.length === 0 ? <Text style={styles.empty}>No linked services found.</Text> : null}
        </Card.Content>
      </Card>

      <Card mode="outlined" style={styles.sectionCard}>
        <Card.Title title="Billing Summary" />
        <Card.Content style={styles.sectionBody}>
          <Row label="Bill" value={billing?.billDisplayId || '-'} />
          <Row label="Created By" value={billing?.createdByUserName || '-'} />
          <Row label="Created On" value={formatDateTime(billing?.createdOn)} />
          <Row label="Total" value={asCurrency(billing?.totalAmount)} />
          <Row label="Paid" value={asCurrency(billing?.paidAmount)} />
          <Row label="Refunded" value={asCurrency(billing?.refundedAmount)} />
          <Row label="Balance" value={asCurrency(billing?.balanceAmount)} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    marginTop: 10,
    marginBottom: 2,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
  },
  sectionBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 2,
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
  serviceRow: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    backgroundColor: themeColors.surfaceMuted,
    padding: 9,
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
  empty: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
});
