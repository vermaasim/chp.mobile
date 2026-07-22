import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { taskDetailsPanelStyles } from '../styles/commonStyles';

type GeneralRxReadOnlyViewProps = {
  data: Record<string, unknown>;
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

function textOrDash(value?: string | number) {
  if (value === undefined || value === null) {
    return '-';
  }

  if (typeof value === 'string' && !value.trim()) {
    return '-';
  }

  return `${value}`;
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

function Section({ title, hint, children }: PropsWithChildren<{ title: string; hint?: string }>) {
  return (
    <View style={taskDetailsPanelStyles.sectionCard}>
      <View style={{ padding: 12 }}>
        <View style={taskDetailsPanelStyles.sectionHeader}>
          <View>
            <Text style={taskDetailsPanelStyles.sectionHeading}>{title}</Text>
            {hint ? <Text style={taskDetailsPanelStyles.sectionHint}>{hint}</Text> : null}
          </View>
        </View>
        <View style={taskDetailsPanelStyles.infoCard}>{children}</View>
      </View>
    </View>
  );
}

function KV({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={taskDetailsPanelStyles.infoKeyValueRow}>
      <Text style={taskDetailsPanelStyles.infoKey}>{label}</Text>
      <Text style={taskDetailsPanelStyles.infoVal}>{textOrDash(value)}</Text>
    </View>
  );
}

export function GeneralRxReadOnlyView({ data }: GeneralRxReadOnlyViewProps) {
  const payload = asRecord(data);
  const comorbidities = asStringArray(payload.comorbidities);
  const medicines = normalizeMedicines(payload.medicines);
  const tests = normalizeTests(payload.tests);

  return (
    <View style={{ gap: 10 }}>
      <Section title="Vitals" hint="Recorded observations">
        <KV label="Weight" value={asText(payload.weight)} />
        <KV label="Blood Pressure" value={asText(payload.bloodPressure)} />
        <KV label="Temprature" value={asText(payload.temprature)} />
        <KV label="Blood Sugar" value={asText(payload.bloodSugar)} />
      </Section>

      <Section title="Clinical Details" hint="Chief complaint and assessment">
        <KV label="Chief Complaint" value={asText(payload.complaint)} />
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={taskDetailsPanelStyles.infoKey}>Comorbidities</Text>
          {comorbidities.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {comorbidities.map((item) => (
                <Chip key={item} compact>
                  {item}
                </Chip>
              ))}
            </View>
          ) : (
            <Text style={taskDetailsPanelStyles.infoVal}>-</Text>
          )}
        </View>
        <KV label="Comorbidities Notes" value={asText(payload.comorbiditiesNotes)} />
        <KV label="Medical and Surgical History" value={asText(payload.medicalAndSurgicalHistory)} />
        <KV label="Diagnosis" value={asText(payload.diagnosis)} />
      </Section>

      <Section title="Medicines" hint="Prescribed medicine list">
        {medicines.length > 0 ? (
          <View style={{ gap: 10 }}>
            {medicines.map((item, index) => (
              <View key={`medicine-${item.serialNo ?? index}`} style={taskDetailsPanelStyles.recordCard}>
                <Text style={taskDetailsPanelStyles.recordTitle}>Medicine #{item.serialNo ?? index + 1}</Text>
                <KV label="Name" value={item.name} />
                <KV label="Dosage" value={item.dosage} />
                <KV label="Duration" value={item.duration} />
                <KV label="Frequency" value={item.frequency} />
                <KV label="Instructions" value={item.instructions} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={taskDetailsPanelStyles.infoVal}>-</Text>
        )}
      </Section>

      <Section title="Recommended Tests" hint="Requested investigations">
        {tests.length > 0 ? (
          <View style={{ gap: 10 }}>
            {tests.map((item, index) => (
              <View key={`test-${item.serialNo ?? index}`} style={taskDetailsPanelStyles.recordCard}>
                <Text style={taskDetailsPanelStyles.recordTitle}>Test #{item.serialNo ?? index + 1}</Text>
                <KV label="Test Name" value={item.name} />
                <KV label="Tentative Date" value={item.toBeDoneOn} />
                <KV label="Instructions" value={item.instructions} />
              </View>
            ))}
          </View>
        ) : (
          <Text style={taskDetailsPanelStyles.infoVal}>-</Text>
        )}
      </Section>

      <Section title="Follow-up" hint="Notes and next visit">
        <KV label="Additional Notes" value={asText(payload.additionalNotes)} />
        <KV label="Follow-up Date" value={asText(payload.followupDate)} />
      </Section>
    </View>
  );
}