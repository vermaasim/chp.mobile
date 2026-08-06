import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { RegenerationContextTextType } from '../../../api/textRegeneration';
import { allStyles } from '../../../styles/commonStyles';
import { themeColors } from '../../../theme/colors';
import { SpeechEnabledMultilineInput } from '../../SpeechEnabledMultilineInput';

type PrescriptionStatus = 'Draft' | 'Final';
type WizardStepKey =
  | 'chiefComplaintHopi'
  | 'pastHistory'
  | 'examination'
  | 'specialTests'
  | 'functionalAssessment'
  | 'managementPlan'
  | 'status';

type FrozenShoulderRomRow = {
  name: string;
  displayName: string;
  normal: string;
  left: string;
  right: string;
};

type FrozenShoulderRxFormProps = {
  token: string;
  facilityId: string;
  visible: boolean;
  saving: boolean;
  onSave: () => void;
  prescriptionStatus: PrescriptionStatus;
  setPrescriptionStatus: (status: PrescriptionStatus) => void;
  frozenShoulderComplaint: string;
  setFrozenShoulderComplaint: (value: string) => void;
  frozenShoulderComplaintSide: string;
  setFrozenShoulderComplaintSide: (value: string) => void;
  frozenShoulderDuration: string;
  setFrozenShoulderDuration: (value: string) => void;
  frozenShoulderDurationUnit: string;
  setFrozenShoulderDurationUnit: (value: string) => void;
  frozenShoulderNatureOfPain: string;
  setFrozenShoulderNatureOfPain: (value: string) => void;
  frozenShoulderSymptoms: string;
  setFrozenShoulderSymptoms: (value: string) => void;
  frozenShoulderOnset: string;
  setFrozenShoulderOnset: (value: string) => void;
  frozenShoulderInjury: 'Yes' | 'No';
  setFrozenShoulderInjury: (value: 'Yes' | 'No') => void;
  frozenShoulderTypeOfInjury: string;
  setFrozenShoulderTypeOfInjury: (value: string) => void;
  frozenShoulderAggravatingFactor: string;
  setFrozenShoulderAggravatingFactor: (value: string) => void;
  frozenShoulderRelievingFactor: string;
  setFrozenShoulderRelievingFactor: (value: string) => void;
  frozenShoulderNightPain: string;
  setFrozenShoulderNightPain: (value: string) => void;
  frozenShoulderSleepDisturbance: 'Yes' | 'No';
  setFrozenShoulderSleepDisturbance: (value: 'Yes' | 'No') => void;
  frozenShoulderNotes: string;
  setFrozenShoulderNotes: (value: string) => void;
  generalPastHtn: 'Yes' | 'No';
  setGeneralPastHtn: (value: 'Yes' | 'No') => void;
  generalPastDm2: 'Yes' | 'No';
  setGeneralPastDm2: (value: 'Yes' | 'No') => void;
  generalPastHypothyroidism: 'Yes' | 'No';
  setGeneralPastHypothyroidism: (value: 'Yes' | 'No') => void;
  generalRxHistory: string;
  setGeneralRxHistory: (value: string) => void;
  generalExamSide: string;
  setGeneralExamSide: (value: string) => void;
  generalSwelling: 'Yes' | 'No';
  setGeneralSwelling: (value: 'Yes' | 'No') => void;
  generalMuscleWasting: 'Yes' | 'No';
  setGeneralMuscleWasting: (value: 'Yes' | 'No') => void;
  generalNeuroDeficit: 'Yes' | 'No';
  setGeneralNeuroDeficit: (value: 'Yes' | 'No') => void;
  generalNeuroDeficitType: string;
  setGeneralNeuroDeficitType: (value: string) => void;
  generalCapsularPattern: 'Yes' | 'No';
  setGeneralCapsularPattern: (value: 'Yes' | 'No') => void;
  generalMuscleTightness: 'Yes' | 'No';
  setGeneralMuscleTightness: (value: 'Yes' | 'No') => void;
  generalMusclesInvolvedCsv: string;
  setGeneralMusclesInvolvedCsv: (value: string) => void;
  generalTendernessCsv: string;
  setGeneralTendernessCsv: (value: string) => void;
  frozenShoulderRomRows: FrozenShoulderRomRow[];
  updateFrozenShoulderRomRow: (rowName: string, side: 'left' | 'right', value: string) => void;
  frozenShoulderPainLevel: string;
  setFrozenShoulderPainLevel: (value: string) => void;
  frozenShoulderRangeOfMotion: string;
  setFrozenShoulderRangeOfMotion: (value: string) => void;
  generalMusclePower: string;
  setGeneralMusclePower: (value: string) => void;
  generalGripPinch: string;
  setGeneralGripPinch: (value: string) => void;
  generalTone: string;
  setGeneralTone: (value: string) => void;
  generalCoordination: string;
  setGeneralCoordination: (value: string) => void;
  generalThumbDropTest: string;
  setGeneralThumbDropTest: (value: string) => void;
  generalPainfulArcTest: string;
  setGeneralPainfulArcTest: (value: string) => void;
  generalAdl: string;
  setGeneralAdl: (value: string) => void;
  generalDifficultiesCsv: string;
  setGeneralDifficultiesCsv: (value: string) => void;
  frozenShoulderTreatmentPlan: string;
  setFrozenShoulderTreatmentPlan: (value: string) => void;
  frozenShoulderExercises: string;
  setFrozenShoulderExercises: (value: string) => void;
  frozenShoulderPrecautions: string;
  setFrozenShoulderPrecautions: (value: string) => void;
  generalModalitiesCsv: string;
  setGeneralModalitiesCsv: (value: string) => void;
  generalExercisePlanCsv: string;
  setGeneralExercisePlanCsv: (value: string) => void;
  generalPrognosis: string;
  setGeneralPrognosis: (value: string) => void;
};

const YES_NO_VALUES = ['Yes', 'No'];
const SIDE_VALUES = ['Right', 'Left', 'Bilateral'];
const PAIN_NATURE_VALUES = ['Continuous', 'Intermittent'];
const ONSET_VALUES = ['Gradual', 'Sudden'];
const STATUS_VALUES: PrescriptionStatus[] = ['Draft', 'Final'];

const STEP_CONFIG: Array<{ key: WizardStepKey; title: string; subtitle: string }> = [
  {
    key: 'chiefComplaintHopi',
    title: 'Chief Complaint and HOPI',
    subtitle: 'Capture presenting complaint, pain pattern, and symptom history.',
  },
  {
    key: 'pastHistory',
    title: 'Past History',
    subtitle: 'Document comorbidities and prior treatment history.',
  },
  {
    key: 'examination',
    title: 'Examination',
    subtitle: 'Record physical findings with editable ROM angles per movement row.',
  },
  {
    key: 'specialTests',
    title: 'Special Tests',
    subtitle: 'Capture test results relevant to frozen shoulder.',
  },
  {
    key: 'functionalAssessment',
    title: 'Functional Assessment',
    subtitle: 'Document ADL level and activity difficulties.',
  },
  {
    key: 'managementPlan',
    title: 'Physiotherapy Management Plan',
    subtitle: 'Define treatment plan, exercises, precautions, and prognosis.',
  },
  {
    key: 'status',
    title: 'Prescription Status',
    subtitle: 'Set draft or final status before saving.',
  },
];

export function FrozenShoulderRxForm(props: FrozenShoulderRxFormProps) {
  const [currentStep, setCurrentStep] = useState<WizardStepKey>('chiefComplaintHopi');

  useEffect(() => {
    if (props.visible) {
      setCurrentStep('chiefComplaintHopi');
    }
  }, [props.visible]);

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

  const currentStepIndex = STEP_CONFIG.findIndex((item) => item.key === currentStep);
  const currentStepMeta = STEP_CONFIG[currentStepIndex] ?? STEP_CONFIG[0];
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex === STEP_CONFIG.length - 1;

  const goToPreviousStep = () => {
    if (isFirstStep) {
      return;
    }

    setCurrentStep(STEP_CONFIG[currentStepIndex - 1].key);
  };

  const goToNextStep = () => {
    if (isLastStep) {
      props.onSave();
      return;
    }

    setCurrentStep(STEP_CONFIG[currentStepIndex + 1].key);
  };

  const renderStepContent = () => {
    if (currentStep === 'chiefComplaintHopi') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Chief Complaint and HOPI</Text>
          <Text style={styles.sectionHint}>Capture presenting complaint, pain profile, and symptom history.</Text>

          <Text style={allStyles.label}>Chief Complaint</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderComplaint}
            onChangeText={props.setFrozenShoulderComplaint}
            numberOfLines={3}
            {...withAiContext('complaint', 'Frozen shoulder prescription complaint.', 'Brief professional clinical tone.')}
          />

          <Text style={allStyles.label}>Complaint Side</Text>
          <View style={allStyles.typeRow}>
            {SIDE_VALUES.map((side) => (
              <Pressable
                key={`frozen-side-${side}`}
                style={[allStyles.typeChip, props.frozenShoulderComplaintSide === side ? allStyles.typeChipActive : null]}
                onPress={() => props.setFrozenShoulderComplaintSide(side)}
              >
                <Text style={[allStyles.typeChipText, props.frozenShoulderComplaintSide === side ? allStyles.typeChipTextActive : null]}>{side}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.dualFieldRow}>
            <View style={styles.dualField}>
              <Text style={allStyles.label}>Duration</Text>
              <TextInput value={props.frozenShoulderDuration} onChangeText={props.setFrozenShoulderDuration} style={allStyles.input} placeholder="e.g. 3" />
            </View>
            <View style={styles.dualField}>
              <Text style={allStyles.label}>Duration Unit</Text>
              <TextInput value={props.frozenShoulderDurationUnit} onChangeText={props.setFrozenShoulderDurationUnit} style={allStyles.input} placeholder="Months" />
            </View>
          </View>

          <Text style={allStyles.label}>Nature Of Pain</Text>
          <View style={allStyles.typeRow}>
            {PAIN_NATURE_VALUES.map((item) => (
              <Pressable
                key={`nature-${item}`}
                style={[allStyles.typeChip, props.frozenShoulderNatureOfPain === item ? allStyles.typeChipActive : null]}
                onPress={() => props.setFrozenShoulderNatureOfPain(item)}
              >
                <Text style={[allStyles.typeChipText, props.frozenShoulderNatureOfPain === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Onset</Text>
          <View style={allStyles.typeRow}>
            {ONSET_VALUES.map((item) => (
              <Pressable key={`onset-${item}`} style={[allStyles.typeChip, props.frozenShoulderOnset === item ? allStyles.typeChipActive : null]} onPress={() => props.setFrozenShoulderOnset(item)}>
                <Text style={[allStyles.typeChipText, props.frozenShoulderOnset === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Symptoms</Text>
          <TextInput value={props.frozenShoulderSymptoms} onChangeText={props.setFrozenShoulderSymptoms} style={allStyles.input} placeholder="Improving/Worsening/Static" />

          <Text style={allStyles.label}>Injury</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`injury-${item}`} style={[allStyles.typeChip, props.frozenShoulderInjury === item ? allStyles.typeChipActive : null]} onPress={() => props.setFrozenShoulderInjury(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.frozenShoulderInjury === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Type Of Injury</Text>
          <TextInput value={props.frozenShoulderTypeOfInjury} onChangeText={props.setFrozenShoulderTypeOfInjury} style={allStyles.input} placeholder="e.g. Fall" />

          <Text style={allStyles.label}>Aggravating Factor</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderAggravatingFactor}
            onChangeText={props.setFrozenShoulderAggravatingFactor}
            numberOfLines={2}
            {...withAiContext('assessment', 'Frozen shoulder aggravating factors.', 'Use concise physiotherapy assessment language.')}
          />

          <Text style={allStyles.label}>Relieving Factor</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderRelievingFactor}
            onChangeText={props.setFrozenShoulderRelievingFactor}
            numberOfLines={2}
            {...withAiContext('assessment', 'Frozen shoulder relieving factors.', 'Use concise physiotherapy assessment language.')}
          />

          <Text style={allStyles.label}>Night Pain</Text>
          <TextInput value={props.frozenShoulderNightPain} onChangeText={props.setFrozenShoulderNightPain} style={allStyles.input} placeholder="Increased/Decreased" />

          <Text style={allStyles.label}>Sleep Disturbance</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`sleep-${item}`} style={[allStyles.typeChip, props.frozenShoulderSleepDisturbance === item ? allStyles.typeChipActive : null]} onPress={() => props.setFrozenShoulderSleepDisturbance(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.frozenShoulderSleepDisturbance === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>HOPI Notes</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderNotes}
            onChangeText={props.setFrozenShoulderNotes}
            numberOfLines={2}
            {...withAiContext('assessment', 'Frozen shoulder clinician notes.', 'Use concise objective assessment language.')}
          />
        </View>
      );
    }

    if (currentStep === 'pastHistory') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Past History</Text>
          <Text style={styles.sectionHint}>Document major comorbidities and prior therapy/medication history.</Text>

          <Text style={allStyles.label}>HTN</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`frozen-htn-${item}`} style={[allStyles.typeChip, props.generalPastHtn === item ? allStyles.typeChipActive : null]} onPress={() => props.setGeneralPastHtn(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.generalPastHtn === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>DM2</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`frozen-dm2-${item}`} style={[allStyles.typeChip, props.generalPastDm2 === item ? allStyles.typeChipActive : null]} onPress={() => props.setGeneralPastDm2(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.generalPastDm2 === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Hypothyroidism</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`frozen-thyroid-${item}`} style={[allStyles.typeChip, props.generalPastHypothyroidism === item ? allStyles.typeChipActive : null]} onPress={() => props.setGeneralPastHypothyroidism(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.generalPastHypothyroidism === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Rx History</Text>
          <SpeechEnabledMultilineInput
            value={props.generalRxHistory}
            onChangeText={props.setGeneralRxHistory}
            numberOfLines={3}
            {...withAiContext('assessment', 'Frozen shoulder prescription past treatment history.', 'Use concise past-history clinical language.')}
          />
        </View>
      );
    }

    if (currentStep === 'examination') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Examination</Text>
          <Text style={styles.sectionHint}>Record objective examination and ROM values for each movement row.</Text>

          <Text style={allStyles.label}>Exam Side</Text>
          <View style={allStyles.typeRow}>
            {SIDE_VALUES.map((side) => (
              <Pressable
                key={`frozen-exam-side-${side}`}
                style={[allStyles.typeChip, props.generalExamSide === side ? allStyles.typeChipActive : null]}
                onPress={() => props.setGeneralExamSide(side)}
              >
                <Text style={[allStyles.typeChipText, props.generalExamSide === side ? allStyles.typeChipTextActive : null]}>{side}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Swelling</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`frozen-swelling-${item}`} style={[allStyles.typeChip, props.generalSwelling === item ? allStyles.typeChipActive : null]} onPress={() => props.setGeneralSwelling(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.generalSwelling === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Muscle Wasting</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`frozen-wasting-${item}`} style={[allStyles.typeChip, props.generalMuscleWasting === item ? allStyles.typeChipActive : null]} onPress={() => props.setGeneralMuscleWasting(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.generalMuscleWasting === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Neuro Deficit</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`frozen-neuro-${item}`} style={[allStyles.typeChip, props.generalNeuroDeficit === item ? allStyles.typeChipActive : null]} onPress={() => props.setGeneralNeuroDeficit(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.generalNeuroDeficit === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Neuro Deficit Type</Text>
          <TextInput value={props.generalNeuroDeficitType} onChangeText={props.setGeneralNeuroDeficitType} style={allStyles.input} placeholder="Motor/Sensory" />

          <Text style={allStyles.label}>Capsular Pattern</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`frozen-capsular-${item}`} style={[allStyles.typeChip, props.generalCapsularPattern === item ? allStyles.typeChipActive : null]} onPress={() => props.setGeneralCapsularPattern(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.generalCapsularPattern === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Muscle Tightness</Text>
          <View style={allStyles.typeRow}>
            {YES_NO_VALUES.map((item) => (
              <Pressable key={`frozen-tightness-${item}`} style={[allStyles.typeChip, props.generalMuscleTightness === item ? allStyles.typeChipActive : null]} onPress={() => props.setGeneralMuscleTightness(item as 'Yes' | 'No')}>
                <Text style={[allStyles.typeChipText, props.generalMuscleTightness === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Muscles Involved (comma separated)</Text>
          <TextInput value={props.generalMusclesInvolvedCsv} onChangeText={props.setGeneralMusclesInvolvedCsv} style={allStyles.input} placeholder="e.g. Deltoid, Supraspinatus" />

          <Text style={allStyles.label}>Tenderness On (comma separated)</Text>
          <TextInput value={props.generalTendernessCsv} onChangeText={props.setGeneralTendernessCsv} style={allStyles.input} placeholder="e.g. Bicipital Groove" />

          <Text style={allStyles.label}>ROM (Editable Angles)</Text>
          {props.frozenShoulderRomRows.map((row) => (
            <View key={row.name} style={styles.romCard}>
              <Text style={[allStyles.label, { marginBottom: 6 }]}>{row.displayName}</Text>
              <View style={styles.dualFieldRow}>
                <View style={styles.dualField}>
                  <Text style={allStyles.label}>Normal</Text>
                  <TextInput value={row.normal} editable={false} style={[allStyles.input, { backgroundColor: themeColors.surfaceMuted }]} />
                </View>
                <View style={styles.dualField}>
                  <Text style={allStyles.label}>Left</Text>
                  <TextInput
                    value={row.left}
                    onChangeText={(value) => props.updateFrozenShoulderRomRow(row.name, 'left', value)}
                    style={allStyles.input}
                    keyboardType="numeric"
                    placeholder="Left"
                  />
                </View>
              </View>
              <Text style={allStyles.label}>Right</Text>
              <TextInput
                value={row.right}
                onChangeText={(value) => props.updateFrozenShoulderRomRow(row.name, 'right', value)}
                style={allStyles.input}
                keyboardType="numeric"
                placeholder="Right"
              />
            </View>
          ))}

          <Text style={allStyles.label}>Pain Level</Text>
          <TextInput value={props.frozenShoulderPainLevel} onChangeText={props.setFrozenShoulderPainLevel} style={allStyles.input} keyboardType="numeric" placeholder="0-10" />

          <Text style={allStyles.label}>Examination Notes</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderRangeOfMotion}
            onChangeText={props.setFrozenShoulderRangeOfMotion}
            numberOfLines={2}
            {...withAiContext('assessment', 'Frozen shoulder range of motion findings.', 'Use structured ROM clinical phrasing.')}
          />

          <Text style={allStyles.label}>Muscle Power</Text>
          <TextInput value={props.generalMusclePower} onChangeText={props.setGeneralMusclePower} style={allStyles.input} placeholder="e.g. Decreased due to pain" />

          <Text style={allStyles.label}>Grip & Pinch</Text>
          <TextInput value={props.generalGripPinch} onChangeText={props.setGeneralGripPinch} style={allStyles.input} placeholder="e.g. Weak" />

          <Text style={allStyles.label}>Tone</Text>
          <TextInput value={props.generalTone} onChangeText={props.setGeneralTone} style={allStyles.input} placeholder="e.g. Hypertonic" />

          <Text style={allStyles.label}>Coordination</Text>
          <TextInput value={props.generalCoordination} onChangeText={props.setGeneralCoordination} style={allStyles.input} placeholder="e.g. Moderate" />
        </View>
      );
    }

    if (currentStep === 'specialTests') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Special Tests</Text>
          <Text style={styles.sectionHint}>Capture frozen shoulder specific special test findings.</Text>

          <Text style={allStyles.label}>Thumb Drop Test</Text>
          <TextInput value={props.generalThumbDropTest} onChangeText={props.setGeneralThumbDropTest} style={allStyles.input} placeholder="Positive/Negative" />

          <Text style={allStyles.label}>Painful Arc Test</Text>
          <TextInput value={props.generalPainfulArcTest} onChangeText={props.setGeneralPainfulArcTest} style={allStyles.input} placeholder="Positive/Negative" />

          <Text style={allStyles.label}>Notes</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderNotes}
            onChangeText={props.setFrozenShoulderNotes}
            numberOfLines={2}
            {...withAiContext('assessment', 'Frozen shoulder special test notes.', 'Use concise special-test interpretation language.')}
          />
        </View>
      );
    }

    if (currentStep === 'functionalAssessment') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Functional Assessment</Text>
          <Text style={styles.sectionHint}>Record ADL dependence and day-to-day difficulties.</Text>

          <Text style={allStyles.label}>ADL</Text>
          <TextInput value={props.generalAdl} onChangeText={props.setGeneralAdl} style={allStyles.input} placeholder="Independent/Dependent" />

          <Text style={allStyles.label}>Difficulties (comma separated)</Text>
          <TextInput value={props.generalDifficultiesCsv} onChangeText={props.setGeneralDifficultiesCsv} style={allStyles.input} placeholder="e.g. Clothing, Combing" />

          <Text style={allStyles.label}>Notes</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderNotes}
            onChangeText={props.setFrozenShoulderNotes}
            numberOfLines={2}
            {...withAiContext('assessment', 'Frozen shoulder functional assessment notes.', 'Use concise functional-impact phrasing.')}
          />
        </View>
      );
    }

    if (currentStep === 'managementPlan') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Physiotherapy Management Plan</Text>
          <Text style={styles.sectionHint}>Document treatment protocol, exercises, precautions, and expected prognosis.</Text>

          <Text style={allStyles.label}>Treatment Plan</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderTreatmentPlan}
            onChangeText={props.setFrozenShoulderTreatmentPlan}
            numberOfLines={3}
            {...withAiContext('treatment', 'Frozen shoulder treatment plan.', 'Use actionable treatment-oriented language.')}
          />

          <Text style={allStyles.label}>Exercises</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderExercises}
            onChangeText={props.setFrozenShoulderExercises}
            numberOfLines={3}
            {...withAiContext('treatment', 'Frozen shoulder exercise recommendations.', 'Use clear home-exercise instructions.')}
          />

          <Text style={allStyles.label}>Precautions</Text>
          <SpeechEnabledMultilineInput
            value={props.frozenShoulderPrecautions}
            onChangeText={props.setFrozenShoulderPrecautions}
            numberOfLines={3}
            {...withAiContext('dos_donts', 'Frozen shoulder precautions and restrictions.', 'Use clear do and do-not guidance.')}
          />

          <Text style={allStyles.label}>Modalities (comma separated)</Text>
          <TextInput value={props.generalModalitiesCsv} onChangeText={props.setGeneralModalitiesCsv} style={allStyles.input} placeholder="e.g. Moist Heat, SWD" />

          <Text style={allStyles.label}>Exercise Plan (comma separated)</Text>
          <TextInput value={props.generalExercisePlanCsv} onChangeText={props.setGeneralExercisePlanCsv} style={allStyles.input} placeholder="e.g. Graded Mobilization" />

          <Text style={allStyles.label}>Prognosis</Text>
          <SpeechEnabledMultilineInput
            value={props.generalPrognosis}
            onChangeText={props.setGeneralPrognosis}
            numberOfLines={3}
            {...withAiContext('treatment', 'Frozen shoulder prognosis.', 'Use concise prognosis-oriented clinical language.')}
          />
        </View>
      );
    }

    return (
      <View style={styles.wizardCard}>
        <Text style={styles.sectionHeading}>Prescription Status</Text>
        <Text style={styles.sectionHint}>Finalize status before saving this prescription.</Text>

        <Text style={allStyles.label}>Status</Text>
        <View style={allStyles.typeRow}>
          {STATUS_VALUES.map((status) => (
            <Pressable
              key={`frozen-${status}`}
              style={[allStyles.typeChip, props.prescriptionStatus === status ? allStyles.typeChipActive : null]}
              onPress={() => props.setPrescriptionStatus(status)}
            >
              <Text style={[allStyles.typeChipText, props.prescriptionStatus === status ? allStyles.typeChipTextActive : null]}>{status}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>Step {currentStepIndex + 1} of {STEP_CONFIG.length}</Text>
      <View style={styles.progressRow}>
        {STEP_CONFIG.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;

          return (
            <View
              key={step.key}
              style={[
                styles.progressPill,
                isActive ? styles.progressPillActive : null,
                isCompleted ? styles.progressPillCompleted : null,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{currentStepMeta.title}</Text>
        <Text style={styles.stepSubtitle}>{currentStepMeta.subtitle}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.navButton, isFirstStep ? styles.navButtonDisabled : null]}
          onPress={goToPreviousStep}
          disabled={isFirstStep || props.saving}
        >
          <Text style={[styles.navButtonText, isFirstStep ? styles.navButtonTextDisabled : null]}>Previous</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, props.saving ? styles.primaryButtonDisabled : null]}
          onPress={goToNextStep}
          disabled={props.saving}
        >
          <Text style={styles.primaryButtonText}>{props.saving ? 'Saving...' : isLastStep ? 'Save Prescription' : 'Next Section'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  progressText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  progressPill: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#D5E5E6',
  },
  progressPillActive: {
    backgroundColor: themeColors.secondary,
  },
  progressPillCompleted: {
    backgroundColor: themeColors.primary,
  },
  stepHeader: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  stepTitle: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  stepSubtitle: {
    marginTop: 4,
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  wizardCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 12,
    backgroundColor: themeColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionHeading: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  sectionHint: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 10,
  },
  dualFieldRow: {
    flexDirection: 'row' as const,
    flex: 1,
    gap: 10,
  },
  dualField: {
    flex: 1,
  },
  romCard: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
  },
  navButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 12,
  },
  navButtonDisabled: {
    opacity: 0.55,
  },
  navButtonText: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  navButtonTextDisabled: {
    color: themeColors.textSecondary,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: themeColors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: themeColors.surface,
    fontSize: 14,
    fontWeight: '700' as const,
  },
};
