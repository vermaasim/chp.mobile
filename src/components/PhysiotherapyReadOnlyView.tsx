import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Chip, Text } from 'react-native-paper';
import type { PhysiotherapyPrescriptionData } from '../data/physiotherapy';
import { taskDetailsPanelStyles } from '../styles/commonStyles';

interface PhysiotherapyReadOnlyViewProps {
  data: PhysiotherapyPrescriptionData;
}

function selectedItems(values: Array<{ selected: boolean; displayValue: string }> | undefined) {
  return (values ?? []).filter((item) => item.selected).map((item) => item.displayValue);
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

function AccordionSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <View style={taskDetailsPanelStyles.sectionCard}>
      <View style={{ padding: 12 }}>
        <Pressable
          onPress={() => setIsOpen((current) => !current)}
          style={taskDetailsPanelStyles.sectionHeader}
        >
          <View>
            <Text style={taskDetailsPanelStyles.sectionHeading}>{title}</Text>
            {hint ? <Text style={taskDetailsPanelStyles.sectionHint}>{hint}</Text> : null}
          </View>
          <Feather
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#666"
          />
        </Pressable>
        {isOpen ? <View style={taskDetailsPanelStyles.infoCard}>{children}</View> : null}
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

export function PhysiotherapyReadOnlyView({ data }: PhysiotherapyReadOnlyViewProps) {
  const medicalHistory = selectedItems(data.medicalHistoryConditions);
  const painTypes = selectedItems(data.painTypes);
  const treatmentMethods = selectedItems(data.treatmentMethods);

  return (
    <View style={{ gap: 10 }}>
      <AccordionSection title="Complaint and Medical History" hint="Patient concerns and background">
        <KV label="Chief Complaint" value={data.complaint} />
        <KV label="Medical History Notes" value={data.medicalHistoryNotes} />
        <KV label="Surgery Details" value={data.surgeryDetails} />
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={taskDetailsPanelStyles.infoKey}>Medical History Conditions</Text>
          {medicalHistory.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {medicalHistory.map((item) => (
                <Chip key={item} compact>
                  {item}
                </Chip>
              ))}
            </View>
          ) : (
            <Text style={taskDetailsPanelStyles.infoVal}>-</Text>
          )}
        </View>
      </AccordionSection>

      <AccordionSection title="Assessment" hint="Pain and clinical findings">
        <KV label="Pain Level" value={`${data.painLevel ?? 0} / 10`} />
        <KV label="Pain Notes" value={data.painTypeNotes} />
        <KV label="Pain Level Notes" value={data.painLevelNotes} />
        <KV label="Range Of Motion" value={data.rangeOfMotion} />
        <KV label="Muscle Strength" value={data.muscleStrength} />
        <KV label="Muscle Tightness" value={data.muscleTightness} />
        <KV label="Special Tests" value={data.specialTests} />
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={taskDetailsPanelStyles.infoKey}>Pain Types</Text>
          {painTypes.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {painTypes.map((item) => (
                <Chip key={item} compact>
                  {item}
                </Chip>
              ))}
            </View>
          ) : (
            <Text style={taskDetailsPanelStyles.infoVal}>-</Text>
          )}
        </View>
      </AccordionSection>

      <AccordionSection title="Treatment" hint="Plan, methods, and goals">
        <KV label="Treatment Plan" value={data.treatmentPlan} />
        <KV label="Suggested Sessions" value={data.suggestedSessions} />
        <KV label="Short Term Goals" value={data.shortTermTreatmentGoals} />
        <KV label="Long Term Goals" value={data.longTermTreatmentGoals} />
        <KV label="Do's and Don'ts" value={data.dosDonts} />
        <View style={{ marginTop: 8, gap: 6 }}>
          <Text style={taskDetailsPanelStyles.infoKey}>Treatment Methods</Text>
          {treatmentMethods.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {treatmentMethods.map((item) => (
                <Chip key={item} compact>
                  {item}
                </Chip>
              ))}
            </View>
          ) : (
            <Text style={taskDetailsPanelStyles.infoVal}>-</Text>
          )}
        </View>
      </AccordionSection>
    </View>
  );
}
