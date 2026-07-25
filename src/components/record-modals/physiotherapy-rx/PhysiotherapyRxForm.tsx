import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { RegenerationContextTextType } from '../../../api/textRegeneration';
import { allStyles } from '../../../styles/commonStyles';
import { SpeechEnabledMultilineInput } from '../../SpeechEnabledMultilineInput';

type PrescriptionStatus = 'Draft' | 'Final';

const STATUS_VALUES: PrescriptionStatus[] = ['Draft', 'Final'];

type PhysiotherapyRxFormProps = {
  token: string;
  facilityId: string;
  prescriptionStatus: PrescriptionStatus;
  setPrescriptionStatus: (status: PrescriptionStatus) => void;
  physio: {
    complaint: string;
    medicalHistoryConditions: Array<{ value: string; displayValue: string; selected: boolean }>;
    medicalHistoryNotes: string;
    surgeryDetails: string;
    painLevel: number;
    painLevelNotes: string;
    painTypes: Array<{ value: string; displayValue: string; selected: boolean }>;
    painTypeNotes: string;
    rangeOfMotion: string;
    muscleStrength: string;
    muscleTightness: string;
    specialTests: string;
    treatmentPlan: string;
    dosDonts: string;
    suggestedSessions: string;
    shortTermTreatmentGoals: string;
    longTermTreatmentGoals: string;
    treatmentMethods: Array<{ value: string; displayValue: string; selected: boolean }>;
  };
  updatePhysioField: <K extends keyof PhysiotherapyRxFormProps['physio']>(key: K, value: PhysiotherapyRxFormProps['physio'][K]) => void;
  toggleSelectable: (key: 'medicalHistoryConditions' | 'painTypes' | 'treatmentMethods', value: string) => void;
};

export function PhysiotherapyRxForm(props: PhysiotherapyRxFormProps) {
  const [isComplaintOpen, setIsComplaintOpen] = useState(true);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(true);
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(true);

  const withAiContext = (
    textType: RegenerationContextTextType,
    clinicalContext: string,
    styleHints: string,
  ) => ({
    token: props.token,
    facilityId: props.facilityId,
    regenerationContext: {
      textType,
      clinicalContext,
      styleHints,
    },
  });

  return (
    <>
      <Text style={allStyles.label}>Status</Text>
      <View style={allStyles.typeRow}>
        {STATUS_VALUES.map((status) => (
          <Pressable
            key={status}
            style={[
              allStyles.typeChip,
              props.prescriptionStatus === status
                ? allStyles.typeChipActive
                : null,
            ]}
            onPress={() => props.setPrescriptionStatus(status)}
          >
            <Text
              style={[
                allStyles.typeChipText,
                props.prescriptionStatus === status
                  ? allStyles.typeChipTextActive
                  : null,
              ]}
            >
              {status}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={allStyles.containerCard}>
        <Pressable
          style={allStyles.accordionHeader}
          onPress={() => setIsComplaintOpen((current) => !current)}
        >
          <View style={allStyles.accordionHeaderTextWrap}>
            <Text style={allStyles.sectionTitle}>Complaint</Text>
          </View>
          <Feather
            name={isComplaintOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#666"
          />
        </Pressable>

        {isComplaintOpen ? (
          <View style={allStyles.accordionContent}>
            <Text style={allStyles.label}>Chief Complaint</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.complaint}
              onChangeText={(value) => props.updatePhysioField("complaint", value)}
              numberOfLines={3}
              {...withAiContext('complaint', 'Physiotherapy chief complaint.', 'Use concise physiotherapy clinical phrasing.')}
            />

            <Text style={allStyles.label}>Medical History</Text>
            <View style={allStyles.typeRow}>
              {props.physio.medicalHistoryConditions.map((item) => (
                <Pressable
                  key={item.value}
                  style={[
                    allStyles.typeChip,
                    item.selected ? allStyles.typeChipActive : null,
                  ]}
                  onPress={() =>
                    props.toggleSelectable("medicalHistoryConditions", item.value)
                  }
                >
                  <Text
                    style={[
                      allStyles.typeChipText,
                      item.selected ? allStyles.typeChipTextActive : null,
                    ]}
                  >
                    {item.displayValue}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={allStyles.label}>Medical History Notes</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.medicalHistoryNotes}
              onChangeText={(value) =>
                props.updatePhysioField("medicalHistoryNotes", value)
              }
              numberOfLines={3}
              {...withAiContext('assessment', 'Physiotherapy medical history notes.', 'Use concise history-oriented physiotherapy wording.')}
            />

            <Text style={allStyles.label}>Surgery Details</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.surgeryDetails}
              onChangeText={(value) =>
                props.updatePhysioField("surgeryDetails", value)
              }
              numberOfLines={3}
              {...withAiContext('assessment', 'Physiotherapy surgery details.', 'Use concise relevant surgical history wording.')}
            />
          </View>
        ) : null}
      </View>
      <View style={allStyles.containerCard}>
        <Pressable
          style={allStyles.accordionHeader}
          onPress={() => setIsAssessmentOpen((current) => !current)}
        >
          <View style={allStyles.accordionHeaderTextWrap}>
            <Text style={allStyles.sectionTitle}>Assessment</Text>
          </View>
          <Feather
            name={isAssessmentOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#666"
          />
        </Pressable>

        {isAssessmentOpen ? (
          <View style={allStyles.accordionContent}>
            <Text style={allStyles.label}>Pain Level (0-10)</Text>
            <TextInput
              value={`${props.physio.painLevel}`}
              onChangeText={(value) =>
                props.updatePhysioField("painLevel", Number(value) || 0)
              }
              keyboardType="numeric"
              style={allStyles.input}
            />

            <Text style={allStyles.label}>Pain Types</Text>
            <View style={allStyles.typeRow}>
              {props.physio.painTypes.map((item) => (
                <Pressable
                  key={item.value}
                  style={[
                    allStyles.typeChip,
                    item.selected ? allStyles.typeChipActive : null,
                  ]}
                  onPress={() => props.toggleSelectable("painTypes", item.value)}
                >
                  <Text
                    style={[
                      allStyles.typeChipText,
                      item.selected ? allStyles.typeChipTextActive : null,
                    ]}
                  >
                    {item.displayValue}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={allStyles.label}>Pain Notes</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.painTypeNotes}
              onChangeText={(value) =>
                props.updatePhysioField("painTypeNotes", value)
              }
              numberOfLines={3}
              {...withAiContext('assessment', 'Physiotherapy pain type notes.', 'Use objective pain assessment language.')}
            />

            <Text style={allStyles.label}>Pain Level Notes</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.painLevelNotes}
              onChangeText={(value) =>
                props.updatePhysioField("painLevelNotes", value)
              }
              numberOfLines={2}
              {...withAiContext('assessment', 'Physiotherapy pain level notes.', 'Use concise pain severity documentation style.')}
            />

            <Text style={allStyles.label}>Range Of Motion</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.rangeOfMotion}
              onChangeText={(value) =>
                props.updatePhysioField("rangeOfMotion", value)
              }
              numberOfLines={2}
              {...withAiContext('assessment', 'Physiotherapy range of motion findings.', 'Use structured ROM assessment wording.')}
            />

            <Text style={allStyles.label}>Muscle Strength</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.muscleStrength}
              onChangeText={(value) =>
                props.updatePhysioField("muscleStrength", value)
              }
              numberOfLines={2}
              {...withAiContext('assessment', 'Physiotherapy muscle strength findings.', 'Use concise strength assessment terminology.')}
            />

            <Text style={allStyles.label}>Muscle Tightness</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.muscleTightness}
              onChangeText={(value) =>
                props.updatePhysioField("muscleTightness", value)
              }
              numberOfLines={2}
              {...withAiContext('assessment', 'Physiotherapy muscle tightness findings.', 'Use concise objective assessment language.')}
            />

            <Text style={allStyles.label}>Special Tests</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.specialTests}
              onChangeText={(value) => props.updatePhysioField("specialTests", value)}
              numberOfLines={2}
              {...withAiContext('assessment', 'Physiotherapy special test findings.', 'Use concise test-result oriented wording.')}
            />
          </View>
        ) : null}
      </View>

      <View style={allStyles.containerCard}>
        <Pressable
          style={allStyles.accordionHeader}
          onPress={() => setIsTreatmentOpen((current) => !current)}
        >
          <View style={allStyles.accordionHeaderTextWrap}>
            <Text style={allStyles.sectionTitle}>Treatment</Text>
          </View>
          <Feather
            name={isTreatmentOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#666"
          />
        </Pressable>

        {isTreatmentOpen ? (
          <View style={allStyles.accordionContent}>
            <Text style={allStyles.label}>Treatment Plan</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.treatmentPlan}
              onChangeText={(value) =>
                props.updatePhysioField("treatmentPlan", value)
              }
              numberOfLines={3}
              {...withAiContext('treatment', 'Physiotherapy treatment plan.', 'Use actionable treatment planning language.')}
            />

            <Text style={allStyles.label}>Treatment Methods</Text>
            <View style={allStyles.typeRow}>
              {props.physio.treatmentMethods.map((item) => (
                <Pressable
                  key={item.value}
                  style={[
                    allStyles.typeChip,
                    item.selected ? allStyles.typeChipActive : null,
                  ]}
                  onPress={() =>
                    props.toggleSelectable("treatmentMethods", item.value)
                  }
                >
                  <Text
                    style={[
                      allStyles.typeChipText,
                      item.selected ? allStyles.typeChipTextActive : null,
                    ]}
                  >
                    {item.displayValue}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={allStyles.label}>Suggested Sessions</Text>
            <TextInput
              value={props.physio.suggestedSessions}
              onChangeText={(value) =>
                props.updatePhysioField("suggestedSessions", value)
              }
              style={allStyles.input}
            />

            <Text style={allStyles.label}>Short Term Goals</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.shortTermTreatmentGoals}
              onChangeText={(value) =>
                props.updatePhysioField("shortTermTreatmentGoals", value)
              }
              numberOfLines={3}
              {...withAiContext('treatment', 'Physiotherapy short-term goals.', 'Use measurable short-term therapy goals.')}
            />

            <Text style={allStyles.label}>Long Term Goals</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.longTermTreatmentGoals}
              onChangeText={(value) =>
                props.updatePhysioField("longTermTreatmentGoals", value)
              }
              numberOfLines={3}
              {...withAiContext('treatment', 'Physiotherapy long-term goals.', 'Use measurable long-term therapy goals.')}
            />

            <Text style={allStyles.label}>Do's and Don'ts</Text>
            <SpeechEnabledMultilineInput
              value={props.physio.dosDonts}
              onChangeText={(value) => props.updatePhysioField("dosDonts", value)}
              numberOfLines={3}
              {...withAiContext('dos_donts', 'Physiotherapy do and do-not advice.', 'Use clear patient-safe dos and donts guidance.')}
            />
          </View>
        ) : null}
      </View>
    </>
  );
}