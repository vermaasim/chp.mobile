import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

type FrozenShoulderReadOnlyMeta = {
  displayId?: string;
  status?: string;
  issuedAt?: string;
};

type FrozenShoulderReadOnlyViewProps = {
  data: Record<string, unknown>;
  meta?: FrozenShoulderReadOnlyMeta;
};

type RomRow = {
  name?: string;
  displayName?: string;
  normal?: string;
  left?: string;
  right?: string;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asText(item)).filter(Boolean);
}

function asRomRows(value: unknown): RomRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .map((item) => ({
      name: asText(item.name),
      displayName: asText(item.displayName),
      normal: asText(item.normal),
      left: asText(item.left),
      right: asText(item.right),
    }))
    .filter((item) => item.displayName || item.name);
}

function textOrDash(value?: string) {
  return value && value.trim() ? value : '-';
}

function joinOrDash(values: string[]) {
  return values.length > 0 ? values.join(', ') : '-';
}

function normalizeStatus(value?: string) {
  const normalized = (value || '').trim().toLowerCase();
  return normalized === 'final' || normalized === 'finalized' ? 'FINALIZED' : 'DRAFT';
}

function formatIssuedAt(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = date.getDate();
  const suffix = day >= 11 && day <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th';
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${day}${suffix} ${month} ${year}, ${time}`;
}

function KV({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.rowBlock}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{textOrDash(value)}</Text>
    </View>
  );
}

export function FrozenShoulderReadOnlyView({ data, meta }: FrozenShoulderReadOnlyViewProps) {
  const payload = asRecord(data);
  const chiefComplaint = asRecord(payload.chiefComplaint);
  const pastHistory = asRecord(payload.pastHistory);
  const examination = asRecord(payload.examination);
  const specialTests = asRecord(payload.specialTests);
  const functionalAssessment = asRecord(payload.functionalAssessment);
  const managementPlan = asRecord(payload.managementPlan);
  const romRows = asRomRows(examination.rom);
  const status = normalizeStatus(meta?.status);

  return (
    <View style={styles.page}>
      <View style={styles.headerCard}>
        <Text style={styles.headerId}>{textOrDash(meta?.displayId)}</Text>
        <View style={styles.headerMetaRow}>
          <Text style={styles.headerMetaText}>Issued {formatIssuedAt(meta?.issuedAt)}</Text>
          <View style={[styles.statusPill, status === 'FINALIZED' ? styles.statusPillFinalized : styles.statusPillDraft]}>
            <Text style={[styles.statusPillText, status === 'FINALIZED' ? styles.statusPillTextFinalized : styles.statusPillTextDraft]}>{status}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.mainHeading}>Chief Complaint and HOPI</Text>
      <KV label="Chief Complaint" value={asText(payload.complaint)} />
      <KV label="Complaint Side" value={asText(chiefComplaint.complaintSide)} />
      <KV label="Duration" value={`${textOrDash(asText(chiefComplaint.durationValue))} ${textOrDash(asText(chiefComplaint.durationUnit))}`} />
      <KV label="Nature of Pain" value={asText(chiefComplaint.natureOfPain)} />
      <KV label="Symptoms" value={asText(chiefComplaint.symptoms)} />
      <KV label="Onset" value={asText(chiefComplaint.onset)} />
      <KV label="Injury" value={asText(chiefComplaint.injury)} />
      <KV label="Type of Injury" value={asText(chiefComplaint.typeOfInjury)} />
      <KV label="Aggravating Factor" value={asText(chiefComplaint.aggravatingFactor)} />
      <KV label="Relieving Factor" value={asText(chiefComplaint.relievingFactor)} />
      <KV label="Night Pain" value={asText(chiefComplaint.nightPain)} />
      <KV label="Sleep Disturbance" value={asText(chiefComplaint.sleepDisturbance)} />
      <KV label="HOPI Notes" value={asText(chiefComplaint.notes)} />

      <Text style={styles.mainHeading}>Past History</Text>
      <KV label="HTN" value={asText(pastHistory.htn)} />
      <KV label="DM2" value={asText(pastHistory.dm2)} />
      <KV label="Hypothyroidism" value={asText(pastHistory.hypothyroidism) || asText(pastHistory.hypothyroid)} />
      <KV label="Rx History" value={asText(pastHistory.rxHistory)} />
      <KV label="Notes" value={asText(pastHistory.notes)} />

      <Text style={styles.mainHeading}>Examination</Text>
      <KV label="Exam Side" value={asText(examination.examSide)} />
      <KV label="Swelling" value={asText(examination.swelling)} />
      <KV label="Muscle Wasting" value={asText(examination.muscleWasting)} />
      <KV label="Neuro Deficit" value={asText(examination.neuroDeficit)} />
      <KV label="Neuro Deficit Type" value={asText(examination.neuroDeficitType)} />
      <KV label="Capsular Pattern" value={asText(examination.capsularPattern)} />
      <KV label="Muscle Tightness" value={asText(examination.muscleTightness)} />
      <KV label="Muscles Involved" value={joinOrDash(asStringArray(examination.musclesInvolved))} />
      <KV label="Tenderness On" value={joinOrDash(asStringArray(examination.tendernessOn))} />
      {romRows.length > 0 ? (
        <View style={styles.rowBlock}>
          <Text style={styles.label}>ROM</Text>
          <View style={styles.romTable}>
            <View style={[styles.romRow, styles.romHeaderRow]}>
              <Text style={[styles.romCell, styles.romHeaderCell, styles.romMovementCell]}>Movement</Text>
              <Text style={[styles.romCell, styles.romHeaderCell]}>Normal</Text>
              <Text style={[styles.romCell, styles.romHeaderCell]}>Left</Text>
              <Text style={[styles.romCell, styles.romHeaderCell]}>Right</Text>
            </View>
            {romRows.map((row) => (
              <View key={row.name || row.displayName} style={styles.romRow}>
                <Text style={[styles.romCell, styles.romMovementCell]}>{textOrDash(row.displayName || row.name)}</Text>
                <Text style={styles.romCell}>{textOrDash(row.normal)}</Text>
                <Text style={styles.romCell}>{textOrDash(row.left)}</Text>
                <Text style={styles.romCell}>{textOrDash(row.right)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <KV label="Muscle Power" value={asText(examination.musclePower)} />
      <KV label="Grip & Pinch" value={asText(examination.gripPinch)} />
      <KV label="Tone" value={asText(examination.tone)} />
      <KV label="Coordination" value={asText(examination.coordination)} />
      <KV label="Examination Notes" value={asText(examination.notes) || asText(payload.rangeOfMotion)} />

      <Text style={styles.mainHeading}>Special Tests</Text>
      <KV label="Thumb Drop Test" value={asText(specialTests.thumbDropTest) || asText(specialTests.thumpDropTest)} />
      <KV label="Painful Arc Test" value={asText(specialTests.painfulArcTest)} />
      <KV label="Notes" value={asText(specialTests.notes)} />

      <Text style={styles.mainHeading}>Functional Assessment</Text>
      <KV label="ADL" value={asText(functionalAssessment.adl)} />
      <KV label="Difficulties" value={joinOrDash(asStringArray(functionalAssessment.difficulties))} />
      <KV label="Notes" value={asText(functionalAssessment.notes)} />

      <Text style={styles.mainHeading}>Physiotherapy Management Plan</Text>
      <KV label="Treatment Plan" value={asText(payload.treatmentPlan)} />
      <KV label="Exercises" value={asText(payload.exercises)} />
      <KV label="Precautions" value={asText(payload.precautions)} />
      <KV label="Modalities" value={joinOrDash(asStringArray(managementPlan.modalities))} />
      <KV label="Exercise Plan" value={joinOrDash(asStringArray(managementPlan.exercisePlan))} />
      <KV label="Prognosis" value={asText(managementPlan.prognosis)} />

      <Text style={styles.mainHeading}>Prescription Status</Text>
      <KV label="Status" value={status} />
    </View>
  );
}

const styles = {
  page: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1D8',
    backgroundColor: themeColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  headerCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1D8',
    paddingBottom: 10,
    gap: 6,
  },
  headerId: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  headerMetaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
  },
  headerMetaText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 1,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillFinalized: {
    backgroundColor: '#DFF7F4',
  },
  statusPillDraft: {
    backgroundColor: '#FFF0E4',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  statusPillTextFinalized: {
    color: '#06A6A6',
  },
  statusPillTextDraft: {
    color: '#CC6F15',
  },
  mainHeading: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '800' as const,
    marginTop: 4,
  },
  rowBlock: {
    gap: 2,
  },
  label: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  value: {
    color: themeColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  romTable: {
    borderWidth: 1,
    borderColor: '#DDE3E5',
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  romRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F2',
  },
  romHeaderRow: {
    backgroundColor: '#F7FAFB',
  },
  romCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  romHeaderCell: {
    color: themeColors.textSecondary,
    fontWeight: '700' as const,
  },
  romMovementCell: {
    flex: 1.4,
  },
};
