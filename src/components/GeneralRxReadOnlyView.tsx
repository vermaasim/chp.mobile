import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { themeColors } from '../theme/colors';

type GeneralRxReadOnlyMeta = {
  displayId?: string;
  status?: string;
  issuedAt?: string;
  patientName?: string;
  patientAgeGender?: string;
  physicianName?: string;
  visitLabel?: string;
};

type GeneralRxReadOnlyViewProps = {
  data: Record<string, unknown>;
  meta?: GeneralRxReadOnlyMeta;
};

type GeneralRxMedicine = {
  serialNo?: number;
  name?: string;
  dosage?: string;
  duration?: string;
  frequency?: string;
  instructions?: string;
};

type GeneralRxTest = {
  serialNo?: number;
  name?: string;
  toBeDoneOn?: string;
  instructions?: string;
};

type GeneralRxComorbidity = {
  value?: string;
  displayValue?: string;
  selected?: boolean;
  additionalText?: string;
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

function normalizeComorbidities(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const objectItems = value
    .map((item) => {
      const record = asRecord(item) as GeneralRxComorbidity;
      if (!record.value && !record.displayValue) {
        return null;
      }

      if (!record.selected) {
        return null;
      }

      const displayName = asText(record.displayValue) || asText(record.value);
      const additionalText = asText(record.additionalText);

      if (asText(record.value).toLowerCase() === 'other' && additionalText) {
        return `${displayName}: ${additionalText}`;
      }

      return displayName;
    })
    .filter((item): item is string => Boolean(item));

  if (objectItems.length > 0) {
    return objectItems;
  }

  return asStringArray(value);
}

function normalizeStatus(value?: string) {
  const normalized = (value || '').trim().toLowerCase();
  return normalized === 'final' || normalized === 'finalized' ? 'FINALIZED' : 'DRAFT';
}

function textOrDash(value?: string | number) {
  if (value === undefined || value === null) {
    return '-';
  }

  if (typeof value === 'string' && !value.trim()) {
    return '-';
  }

  return `${value}`;
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

function toReadableComorbidity(value: string) {
  if (!value) {
    return value;
  }

  const withSpaces = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();

  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function normalizeMedicines(value: unknown): GeneralRxMedicine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        serialNo: typeof record.serialNo === 'number' ? record.serialNo : undefined,
        name: asText(record.name),
        dosage: asText(record.dosage),
        duration: asText(record.duration),
        frequency: asText(record.frequency),
        instructions: asText(record.instructions),
      };
    })
    .filter((item) => item.name || item.dosage || item.duration || item.frequency || item.instructions);
}

function normalizeTests(value: unknown): GeneralRxTest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        serialNo: typeof record.serialNo === 'number' ? record.serialNo : undefined,
        name: asText(record.name),
        toBeDoneOn: asText(record.toBeDoneOn),
        instructions: asText(record.instructions),
      };
    })
    .filter((item) => item.name || item.toBeDoneOn || item.instructions);
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function VitalTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.vitalTile}>
      <Text style={styles.vitalValue}>{textOrDash(value)}</Text>
      <Text style={styles.vitalLabel}>{label}</Text>
    </View>
  );
}

export function GeneralRxReadOnlyView({ data, meta }: GeneralRxReadOnlyViewProps) {
  const payload = asRecord(data);
  const comorbidities = normalizeComorbidities(payload.comorbidities).map(toReadableComorbidity);
  const medicines = normalizeMedicines(payload.medicines);
  const tests = normalizeTests(payload.tests);
  const status = normalizeStatus(meta?.status);

  return (
    <View style={styles.contentRoot}>
      {/* <View style={styles.topTitleRow}>
        <Text style={styles.pageTitle}>General Rx</Text>
        <Text style={styles.pageSubtitle}>{meta?.displayId || '-'}</Text>
      </View> */}

      <SectionCard title={meta?.displayId || '-'}>
        <View style={styles.prescriptionRow}>
          <Text style={styles.issuedText}>Issued {formatIssuedAt(meta?.issuedAt)}</Text>
          <View style={[styles.statusPill, status === 'FINALIZED' ? styles.statusPillFinalized : styles.statusPillDraft]}>
            <Text style={[styles.statusPillText, status === 'FINALIZED' ? styles.statusPillTextFinalized : styles.statusPillTextDraft]}>{status}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Patient & physician">
        <View style={styles.identityCard}>
          <View style={styles.identityRow}>
            <View style={styles.identityCell}>
              <Text style={styles.identityLabel}>Patient</Text>
              <Text style={styles.identityValue}>{textOrDash(meta?.patientName)}</Text>
            </View>
            <View style={styles.identityCell}>
              <Text style={styles.identityLabel}>Age / gender</Text>
              <Text style={styles.identityValue}>{textOrDash(meta?.patientAgeGender)}</Text>
            </View>
          </View>
          <View style={styles.identityRow}>
            <View style={styles.identityCell}>
              <Text style={styles.identityLabel}>Physician</Text>
              <Text style={styles.identityValue}>{textOrDash(meta?.physicianName)}</Text>
            </View>
            <View style={styles.identityCell}>
              <Text style={styles.identityLabel}>Visit</Text>
              <Text style={styles.identityValue}>{textOrDash(meta?.visitLabel)}</Text>
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Vitals">
        <View style={styles.vitalsGrid}>
          <VitalTile value={asText(payload.weight)} label="Weight" />
          <VitalTile value={asText(payload.bloodPressure)} label="Blood Pressure" />
          <VitalTile value={asText(payload.temprature)} label="Temprature" />
          <VitalTile value={asText(payload.bloodSugar)} label="Blood Sugar" />
        </View>
      </SectionCard>

      <SectionCard title="Complaint">
        <Text style={styles.subLabel}>Chief complaint</Text>
        <Text style={styles.bodyText}>{textOrDash(asText(payload.complaint))}</Text>

        <Text style={[styles.subLabel, styles.blockTop]}>Comorbidities</Text>
        {comorbidities.length > 0 ? (
          <View style={styles.comorbidityRow}>
            {comorbidities.map((item) => (
              <View key={item} style={styles.comorbidityChip}>
                <Text style={styles.comorbidityChipText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>None reported</Text>
        )}

        <Text style={[styles.subLabel, styles.blockTop]}>Comorbidity notes</Text>
        <Text style={styles.bodyText}>{textOrDash(asText(payload.comorbiditiesNotes))}</Text>

        <Text style={[styles.subLabel, styles.blockTop]}>Medical and surgical history</Text>
        <Text style={styles.bodyText}>{textOrDash(asText(payload.medicalAndSurgicalHistory))}</Text>
      </SectionCard>

      <SectionCard title="Diagnosis">
        <Text style={styles.bodyText}>{textOrDash(asText(payload.diagnosis))}</Text>
      </SectionCard>

      <SectionCard title={`Medications (${medicines.length})`}>
        {medicines.length > 0 ? (
          <View style={styles.listWrap}>
            {medicines.map((item, index) => (
              <View key={`medication-${item.serialNo ?? index}`} style={[styles.medicationRow, index < medicines.length - 1 ? styles.rowDivider : null]}>
                <View style={styles.medicationMain}>
                  <Text style={styles.medicationName}>{textOrDash(item.name)}</Text>
                  <Text style={styles.medicationMeta}>{textOrDash(item.dosage)} · {textOrDash(item.frequency)} · {textOrDash(item.instructions)}</Text>
                </View>
                <Text style={styles.medicationDuration}>{textOrDash(item.duration)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>-</Text>
        )}
      </SectionCard>

      <SectionCard title="Recommended tests">
        {tests.length > 0 ? (
          <View style={styles.listWrap}>
            {tests.map((item, index) => (
              <View key={`test-${item.serialNo ?? index}`} style={[styles.checkRow, index < tests.length - 1 ? styles.rowDivider : null]}>
                <View style={styles.fakeCheckbox} />
                <View style={styles.checkRowTextWrap}>
                  <Text style={styles.checkRowText}>{textOrDash(item.name)}</Text>
                  {item.instructions ? <Text style={styles.checkRowHint}>{item.instructions}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>-</Text>
        )}
      </SectionCard>

      <SectionCard title="Follow up">
        <View style={styles.checkRow}>
          <View style={styles.fakeCheckbox} />
          <Text style={styles.followupDate}>{textOrDash(asText(payload.followupDate))}</Text>
        </View>
        <Text style={styles.bodyText}>{textOrDash(asText(payload.additionalNotes))}</Text>
      </SectionCard>
    </View>
  );
}

const styles = {
  contentRoot: {
    gap: 10,
  },
  topTitleRow: {
    alignItems: 'center' as const,
    gap: 2,
  },
  pageTitle: {
    color: themeColors.textPrimary,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  pageSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1D8',
    backgroundColor: themeColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  sectionTitle: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  prescriptionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
  },
  issuedText: {
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
  identityCard: {
    borderRadius: 12,
    backgroundColor: '#F7F8F8',
    padding: 10,
    gap: 10,
  },
  identityRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  identityCell: {
    flex: 1,
  },
  identityLabel: {
    color: themeColors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  identityValue: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
    lineHeight: 18,
  },
  vitalsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  vitalTile: {
    width: '48.5%' as const,
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: '#F7F8F8',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
  },
  vitalValue: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  vitalLabel: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  subLabel: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  blockTop: {
    marginTop: 4,
  },
  bodyText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  comorbidityRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  comorbidityChip: {
    borderRadius: 999,
    backgroundColor: '#F2F3F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  comorbidityChipText: {
    color: themeColors.textPrimary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  listWrap: {
    gap: 0,
  },
  medicationRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
    paddingVertical: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8DF',
  },
  medicationMain: {
    flex: 1,
    gap: 3,
  },
  medicationName: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '800' as const,
    lineHeight: 20,
  },
  medicationMeta: {
    color: themeColors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
  },
  medicationDuration: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    minWidth: 42,
    textAlign: 'right' as const,
  },
  checkRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    paddingVertical: 10,
  },
  fakeCheckbox: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: '#0FB7C2',
    marginTop: 2,
  },
  checkRowTextWrap: {
    flex: 1,
    gap: 2,
  },
  checkRowText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  checkRowHint: {
    color: themeColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  followupDate: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
};
