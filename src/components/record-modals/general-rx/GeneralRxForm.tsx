import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeColors } from '../../../theme/colors';
import {
  type GeneralPrescriptionMedicine,
  type GeneralPrescriptionTest,
  type SelectableComorbidity,
} from '../../../data/generalPrescription';
import {
  GENERAL_PRESCRIPTION_SUGGESTIONS,
  getTopSuggestions,
} from '../../../data/generalPrescriptionSuggestions';
import type { RegenerationContextTextType } from '../../../api/textRegeneration';
import { allStyles } from '../../../styles/commonStyles';
import { useResponsiveLayout } from '../../../hooks/useResponsiveLayout';
import { SpeechEnabledMultilineInput } from '../../SpeechEnabledMultilineInput';

type PrescriptionStatus = 'Draft' | 'Final';
type WizardStepKey = 'status' | 'details' | 'diagnosis' | 'medicines' | 'tests' | 'followup';

const STATUS_VALUES: PrescriptionStatus[] = ['Draft', 'Final'];
const STEP_CONFIG: Array<{ key: WizardStepKey; title: string; subtitle: string }> = [
  { key: 'status', title: 'Vitals', subtitle: 'Capture key vitals before clinical details' },
  { key: 'details', title: 'Complaint & history', subtitle: 'Chief complaint, comorbidities, and history' },
  { key: 'diagnosis', title: 'Diagnosis', subtitle: 'Assessment and diagnosis' },
  { key: 'medicines', title: 'Medicines', subtitle: 'Prescribed medicines' },
  { key: 'tests', title: 'Recommended tests', subtitle: 'Suggested tests and instructions' },
  { key: 'followup', title: 'Follow-up', subtitle: 'Status, additional notes, and follow-up' },
];

type GeneralRxFormProps = {
  token: string;
  facilityId: string;
  visible: boolean;
  saving: boolean;
  onSave: () => void;
  prescriptionStatus: PrescriptionStatus;
  setPrescriptionStatus: (status: PrescriptionStatus) => void;
  weight: string;
  setWeight: (value: string) => void;
  height: string;
  setHeight: (value: string) => void;
  heightUnit: string;
  setHeightUnit: (value: string) => void;
  bloodPressure: string;
  setBloodPressure: (value: string) => void;
  temprature: string;
  setTemprature: (value: string) => void;
  bloodSugar: string;
  setBloodSugar: (value: string) => void;
  generalRxComplaint: string;
  setGeneralRxComplaint: (value: string) => void;
  comorbidities: SelectableComorbidity[];
  toggleComorbidity: (value: string) => void;
  updateComorbidityAdditionalText: (value: string, additionalText: string) => void;
  comorbiditiesNotes: string;
  setComorbiditiesNotes: (value: string) => void;
  medicalAndSurgicalHistory: string;
  setMedicalAndSurgicalHistory: (value: string) => void;
  generalRxDiagnosis: string;
  setGeneralRxDiagnosis: (value: string) => void;
  currentMedicine: GeneralPrescriptionMedicine;
  updateCurrentMedicine: (key: keyof Omit<GeneralPrescriptionMedicine, 'serialNo'>, value: string) => void;
  generalRxMedicines: GeneralPrescriptionMedicine[];
  addMedicine: () => void;
  updateMedicine: (serialNo: number, key: keyof Omit<GeneralPrescriptionMedicine, 'serialNo'>, value: string) => void;
  removeMedicine: (serialNo: number) => void;
  currentTest: GeneralPrescriptionTest;
  updateCurrentTest: (key: keyof Omit<GeneralPrescriptionTest, 'serialNo'>, value: string) => void;
  generalRxTests: GeneralPrescriptionTest[];
  addTest: () => void;
  updateTest: (serialNo: number, key: keyof Omit<GeneralPrescriptionTest, 'serialNo'>, value: string) => void;
  removeTest: (serialNo: number) => void;
  generalRxAdditionalNotes: string;
  setGeneralRxAdditionalNotes: (value: string) => void;
  generalRxFollowupDate: string;
  setGeneralRxFollowupDate: (value: string) => void;
};

type SuggestionChipsProps = {
  options: string[];
  recentValues?: string[];
  query: string;
  onSelect: (value: string) => void;
};

function SuggestionChips({ options, recentValues, query, onSelect }: SuggestionChipsProps) {
  const suggestions = getTopSuggestions({ catalog: options, recentValues, query, limit: 5 });

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={allStyles.typeRow}>
      {suggestions.map((item) => (
        <Pressable key={item} style={styles.suggestionChip} onPress={() => onSelect(item)}>
          <Text style={styles.suggestionText}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function GeneralRxForm(props: GeneralRxFormProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const [currentStep, setCurrentStep] = useState<WizardStepKey>('status');

  const recentMedicineNames = useMemo(() => [...props.generalRxMedicines].reverse().map((item) => item.name), [props.generalRxMedicines]);
  const recentMedicineDosages = useMemo(() => [...props.generalRxMedicines].reverse().map((item) => item.dosage), [props.generalRxMedicines]);
  const recentMedicineDurations = useMemo(() => [...props.generalRxMedicines].reverse().map((item) => item.duration), [props.generalRxMedicines]);
  const recentMedicineFrequencies = useMemo(() => [...props.generalRxMedicines].reverse().map((item) => item.frequency), [props.generalRxMedicines]);
  const recentMedicineInstructions = useMemo(() => [...props.generalRxMedicines].reverse().map((item) => item.instructions), [props.generalRxMedicines]);
  const recentTestNames = useMemo(() => [...props.generalRxTests].reverse().map((item) => item.name), [props.generalRxTests]);
  const recentTestInstructions = useMemo(() => [...props.generalRxTests].reverse().map((item) => item.instructions), [props.generalRxTests]);

  const currentStepIndex = STEP_CONFIG.findIndex((item) => item.key === currentStep);
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex === STEP_CONFIG.length - 1;
  const currentStepMeta = STEP_CONFIG[currentStepIndex] ?? STEP_CONFIG[0];

  useEffect(() => {
    if (props.visible) {
      setCurrentStep('status');
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

  const renderMedicineDraftCard = () => (
    <View style={styles.subCard}>
      <Text style={styles.subCardTitle}>Add medicine</Text>

      <Text style={allStyles.label}>Medicine Name</Text>
      <TextInput
        value={props.currentMedicine.name}
        onChangeText={(value) => props.updateCurrentMedicine('name', value)}
        style={allStyles.input}
        placeholder="Search or type medicine"
      />
      <SuggestionChips
        options={GENERAL_PRESCRIPTION_SUGGESTIONS.medicines}
        recentValues={recentMedicineNames}
        query={props.currentMedicine.name}
        onSelect={(value) => props.updateCurrentMedicine('name', value)}
      />

      <View style={styles.dualFieldRow}>
        <View style={styles.dualField}>
          <Text style={allStyles.label}>Dosage</Text>
          <TextInput
            value={props.currentMedicine.dosage}
            onChangeText={(value) => props.updateCurrentMedicine('dosage', value)}
            style={allStyles.input}
            placeholder="e.g. 500 mg"
          />
          <SuggestionChips
            options={GENERAL_PRESCRIPTION_SUGGESTIONS.dosages}
            recentValues={recentMedicineDosages}
            query={props.currentMedicine.dosage}
            onSelect={(value) => props.updateCurrentMedicine('dosage', value)}
          />
        </View>
        <View style={styles.dualField}>
          <Text style={allStyles.label}>Duration</Text>
          <TextInput
            value={props.currentMedicine.duration}
            onChangeText={(value) => props.updateCurrentMedicine('duration', value)}
            style={allStyles.input}
            placeholder="e.g. 5 days"
          />
          <SuggestionChips
            options={GENERAL_PRESCRIPTION_SUGGESTIONS.durations}
            recentValues={recentMedicineDurations}
            query={props.currentMedicine.duration}
            onSelect={(value) => props.updateCurrentMedicine('duration', value)}
          />
        </View>
      </View>

      <Text style={allStyles.label}>Frequency</Text>
      <TextInput
        value={props.currentMedicine.frequency}
        onChangeText={(value) => props.updateCurrentMedicine('frequency', value)}
        style={allStyles.input}
        placeholder="e.g. BD"
      />
      <SuggestionChips
        options={GENERAL_PRESCRIPTION_SUGGESTIONS.frequencies}
        recentValues={recentMedicineFrequencies}
        query={props.currentMedicine.frequency}
        onSelect={(value) => props.updateCurrentMedicine('frequency', value)}
      />

      <Text style={allStyles.label}>Instructions</Text>
      <SpeechEnabledMultilineInput
        value={props.currentMedicine.instructions}
        onChangeText={(value) => props.updateCurrentMedicine('instructions', value)}
        numberOfLines={2}
        {...withAiContext('treatment', 'Medicine instructions in general prescription.', 'Use clear, patient-friendly treatment instructions.')}
      />
      <SuggestionChips
        options={GENERAL_PRESCRIPTION_SUGGESTIONS.medicineInstructions}
        recentValues={recentMedicineInstructions}
        query={props.currentMedicine.instructions}
        onSelect={(value) => props.updateCurrentMedicine('instructions', value)}
      />

      <View style={styles.inlineActionRow}>
        <Pressable style={styles.addButton} onPress={props.addMedicine}>
          <Text style={styles.addButtonText}>Add medicine</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderTestDraftCard = () => (
    <View style={styles.subCard}>
      <Text style={styles.subCardTitle}>Add test</Text>

      <Text style={allStyles.label}>Test Name</Text>
      <TextInput
        value={props.currentTest.name}
        onChangeText={(value) => props.updateCurrentTest('name', value)}
        style={allStyles.input}
        placeholder="Search or type test"
      />
      <SuggestionChips
        options={GENERAL_PRESCRIPTION_SUGGESTIONS.tests}
        recentValues={recentTestNames}
        query={props.currentTest.name}
        onSelect={(value) => props.updateCurrentTest('name', value)}
      />

      <Text style={allStyles.label}>Tentative Date of Test</Text>
      <TextInput
        value={props.currentTest.toBeDoneOn}
        onChangeText={(value) => props.updateCurrentTest('toBeDoneOn', value)}
        style={allStyles.input}
        placeholder="YYYY-MM-DD"
      />

      <Text style={allStyles.label}>Instructions</Text>
      <SpeechEnabledMultilineInput
        value={props.currentTest.instructions}
        onChangeText={(value) => props.updateCurrentTest('instructions', value)}
        numberOfLines={2}
        {...withAiContext('follow_up', 'Recommended test instructions in general prescription.', 'Use concise follow-up and preparation guidance.')}
      />
      <SuggestionChips
        options={GENERAL_PRESCRIPTION_SUGGESTIONS.testInstructions}
        recentValues={recentTestInstructions}
        query={props.currentTest.instructions}
        onSelect={(value) => props.updateCurrentTest('instructions', value)}
      />

      <View style={styles.inlineActionRow}>
        <Pressable style={styles.addButton} onPress={props.addTest}>
          <Text style={styles.addButtonText}>Add test</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderStepContent = () => {
    if (currentStep === 'status') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Vitals</Text>
          <Text style={styles.sectionHint}>Capture the basic vitals first.</Text>

          <View style={styles.dualFieldRow}>
            <View style={styles.dualField}>
              <Text style={allStyles.label}>Weight</Text>
              <TextInput value={props.weight} onChangeText={props.setWeight} style={allStyles.input} placeholder="e.g. 70 kg" />
            </View>
            <View style={styles.dualField}>
              <Text style={allStyles.label}>Height</Text>
              <TextInput value={props.height} onChangeText={props.setHeight} style={allStyles.input} placeholder="e.g. 70" />
            </View>
          </View>

          <View style={styles.dualFieldRow}>
            <View style={styles.dualField}>
              <Text style={allStyles.label}>Height Unit</Text>
              <TextInput value={props.heightUnit} onChangeText={props.setHeightUnit} style={allStyles.input} placeholder="e.g. inches" />
            </View>
            <View style={styles.dualField}>
              <Text style={allStyles.label}>Blood Pressure</Text>
              <TextInput value={props.bloodPressure} onChangeText={props.setBloodPressure} style={allStyles.input} placeholder="e.g. 120/80" />
            </View>
          </View>

          <View style={styles.dualFieldRow}>
            <View style={styles.dualField}>
              <Text style={allStyles.label}>Temprature</Text>
              <TextInput value={props.temprature} onChangeText={props.setTemprature} style={allStyles.input} placeholder="e.g. 98.6 F" />
            </View>
            <View style={styles.dualField}>
              <Text style={allStyles.label}>Blood Sugar</Text>
              <TextInput value={props.bloodSugar} onChangeText={props.setBloodSugar} style={allStyles.input} placeholder="e.g. 95 mg/dL" />
            </View>
          </View>
        </View>
      );
    }

    if (currentStep === 'details') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Complaint and history</Text>
          <Text style={styles.sectionHint}>Capture complaint, comorbidities, notes, and history before diagnosis.</Text>

          <Text style={allStyles.label}>Chief Complaint</Text>
          <SpeechEnabledMultilineInput
            value={props.generalRxComplaint}
            onChangeText={props.setGeneralRxComplaint}
            numberOfLines={3}
            {...withAiContext('complaint', 'General prescription chief complaint.', 'Use concise professional clinical phrasing.')}
          />

          <Text style={allStyles.label}>Comorbidities</Text>
          <View style={allStyles.typeRow}>
            {props.comorbidities.map((item) => (
              <Pressable key={item.value} style={[allStyles.typeChip, item.selected ? allStyles.typeChipActive : null]} onPress={() => props.toggleComorbidity(item.value)}>
                <Text style={[allStyles.typeChipText, item.selected ? allStyles.typeChipTextActive : null]}>{item.displayValue}</Text>
              </Pressable>
            ))}
          </View>

          {props.comorbidities.some((item) => item.value === 'Other' && item.selected) ? (
            <>
              <Text style={allStyles.label}>Other Comorbidity Details</Text>
              <TextInput
                value={props.comorbidities.find((item) => item.value === 'Other')?.additionalText ?? ''}
                onChangeText={(value) => props.updateComorbidityAdditionalText('Other', value)}
                style={allStyles.input}
                placeholder="Specify additional comorbidity"
              />
            </>
          ) : null}

          <Text style={allStyles.label}>Comorbidities Notes</Text>
          <SpeechEnabledMultilineInput
            value={props.comorbiditiesNotes}
            onChangeText={props.setComorbiditiesNotes}
            numberOfLines={3}
            {...withAiContext('assessment', 'General prescription comorbidities notes.', 'Use concise comorbidity-oriented clinical wording.')}
          />

          <Text style={allStyles.label}>Medical and Surgical History</Text>
          <SpeechEnabledMultilineInput
            value={props.medicalAndSurgicalHistory}
            onChangeText={props.setMedicalAndSurgicalHistory}
            numberOfLines={3}
            {...withAiContext('assessment', 'General prescription medical and surgical history.', 'Use structured history-oriented phrasing.')}
          />
        </View>
      );
    }

    if (currentStep === 'diagnosis') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Diagnosis</Text>
          <Text style={styles.sectionHint}>Capture the assessment and diagnosis in a single focused step.</Text>

          <Text style={allStyles.label}>Diagnosis</Text>
          <SpeechEnabledMultilineInput
            value={props.generalRxDiagnosis}
            onChangeText={props.setGeneralRxDiagnosis}
            numberOfLines={3}
            {...withAiContext('assessment', 'General prescription diagnosis.', 'Use concise diagnosis-focused clinical tone.')}
          />
        </View>
      );
    }

    if (currentStep === 'medicines') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Prescribed medicines</Text>
          <Text style={styles.sectionHint}>Add one or more medicines and keep the list compact below.</Text>
          {renderMedicineDraftCard()}

          {props.generalRxMedicines.length > 0 ? <Text style={styles.listHeading}>Medicine list</Text> : null}
          {props.generalRxMedicines.map((medicine) => (
            <View key={`medicine-${medicine.serialNo}`} style={styles.listCard}>
              <View style={styles.listCardHeader}>
                <Text style={styles.subCardTitle}>Medicine #{medicine.serialNo}</Text>
                <Pressable style={styles.removeButton} onPress={() => props.removeMedicine(medicine.serialNo)}>
                  <Text style={styles.removeButtonText}>Remove</Text>
                </Pressable>
              </View>
              <Text style={styles.summaryLine}>Name: {medicine.name || '-'}</Text>
              <Text style={styles.summaryLine}>Dosage: {medicine.dosage || '-'}</Text>
              <Text style={styles.summaryLine}>Duration: {medicine.duration || '-'}</Text>
              <Text style={styles.summaryLine}>Frequency: {medicine.frequency || '-'}</Text>
              <Text style={styles.summaryLine}>Instructions: {medicine.instructions || '-'}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (currentStep === 'tests') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Recommended tests</Text>
          <Text style={styles.sectionHint}>Capture suggested tests and any instructions for the patient.</Text>
          {renderTestDraftCard()}

          {props.generalRxTests.length > 0 ? <Text style={styles.listHeading}>Test list</Text> : null}
          {props.generalRxTests.map((test) => (
            <View key={`test-${test.serialNo}`} style={styles.listCard}>
              <View style={styles.listCardHeader}>
                <Text style={styles.subCardTitle}>Test #{test.serialNo}</Text>
                <Pressable style={styles.removeButton} onPress={() => props.removeTest(test.serialNo)}>
                  <Text style={styles.removeButtonText}>Remove</Text>
                </Pressable>
              </View>
              <Text style={styles.summaryLine}>Name: {test.name || '-'}</Text>
              <Text style={styles.summaryLine}>Tentative Date: {test.toBeDoneOn || '-'}</Text>
              <Text style={styles.summaryLine}>Instructions: {test.instructions || '-'}</Text>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.wizardCard}>
        <Text style={styles.sectionHeading}>Additional notes and follow-up</Text>
        <Text style={styles.sectionHint}>Choose add extra instructions, follow-up and status before saving.</Text>

        

        <Text style={allStyles.label}>Additional Notes</Text>
        <SpeechEnabledMultilineInput
          value={props.generalRxAdditionalNotes}
          onChangeText={props.setGeneralRxAdditionalNotes}
          numberOfLines={3}
          {...withAiContext('other', 'General prescription additional notes.', 'Use concise professional clinician notes.')}
        />

        <Text style={allStyles.label}>Follow-up Date</Text>
        <TextInput
          value={props.generalRxFollowupDate}
          onChangeText={props.setGeneralRxFollowupDate}
          style={allStyles.input}
          placeholder="YYYY-MM-DD"
        />
        <Text style={allStyles.label}>Prescription Status</Text>
        <View style={styles.statusPillRow}>
          {STATUS_VALUES.map((status) => {
            const isActive = props.prescriptionStatus === status;

            return (
              <Pressable
                key={status}
                style={[styles.statusPill, isActive ? styles.statusPillActive : null]}
                onPress={() => props.setPrescriptionStatus(status)}
              >
                <Text style={[styles.statusPillText, isActive ? styles.statusPillTextActive : null]}>{status}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      
    );
  };

  return (
    <View style={[styles.screen, layout.formMaxWidth ? { maxWidth: layout.formMaxWidth, alignSelf: 'center' } : null]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(16, insets.bottom + 12) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>General prescription</Text>
          <Text style={styles.heroTitle}>Adding general prescription</Text>
          <Text style={styles.heroSubtitle}>Draft or final, vitals, complaint, diagnosis, medicines, tests and follow-up.</Text>
        </View> */}

        <View style={styles.progressRow}>
          {STEP_CONFIG.map((step, index) => {
            const active = index === currentStepIndex;
            const completed = index < currentStepIndex;
            return <View key={step.key} style={[styles.progressSegment, completed ? styles.progressSegmentCompleted : null, active ? styles.progressSegmentActive : null]} />;
          })}
        </View>

        <View style={styles.stepMetaRow}>
          <View>
            <Text style={styles.stepCounter}>Step {currentStepIndex + 1} of {STEP_CONFIG.length}</Text>
            <Text style={styles.stepTitle}>{currentStepMeta.title}</Text>
          </View>
          <Text style={styles.stepSubtitle}>{currentStepMeta.subtitle}</Text>
        </View>

        {renderStepContent()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 12) }]}>
        <Pressable
          accessibilityRole="button"
          disabled={isFirstStep || props.saving}
          onPress={goToPreviousStep}
          style={[styles.footerButton, styles.footerButtonSecondary, isFirstStep || props.saving ? styles.footerButtonDisabled : null]}
        >
          <Text style={styles.footerButtonTextSecondary}>Back</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={props.saving}
          onPress={goToNextStep}
          style={[styles.footerButton, styles.footerButtonPrimary, props.saving ? styles.footerButtonDisabled : null]}
        >
          <Text style={styles.footerButtonTextPrimary}>{props.saving ? 'Saving...' : isLastStep ? 'Save prescription' : `Next: ${STEP_CONFIG[currentStepIndex + 1].title}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = {
  screen: {
    flex: 1,
    minHeight: '100%' as const,
    gap: 12,
  },
  scroll: {
    flex: 1,
    marginHorizontal: 10,
  },
  scrollContent: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 12,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 14,
    gap: 4,
  },
  heroEyebrow: {
    color: themeColors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.7,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
  },
  heroTitle: {
    color: themeColors.textPrimary,
    fontSize: 20,
    fontWeight: '800' as const,
  },
  heroSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 17,
  },
  progressRow: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: themeColors.surfaceMuted,
  },
  progressSegmentCompleted: {
    backgroundColor: themeColors.successSurface,
  },
  progressSegmentActive: {
    backgroundColor: themeColors.primary,
  },
  stepMetaRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
  },
  stepCounter: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepTitle: {
    color: themeColors.textPrimary,
    fontSize: 17,
    fontWeight: '800' as const,
  },
  stepSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
    flex: 1,
    lineHeight: 17,
  },
  wizardCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    padding: 14,
    gap: 10,
  },
  sectionHeading: {
    color: themeColors.textPrimary,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  sectionHint: {
    color: themeColors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  dualFieldRow: {
    flexDirection: 'row' as const,
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  dualField: {
    flex: 1,
    minWidth: 140,
  },
  statusPillRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  statusPill: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statusPillActive: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  statusPillText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  statusPillTextActive: {
    color: themeColors.textOnBrand,
  },
  subCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    padding: 12,
    gap: 8,
  },
  subCardTitle: {
    color: themeColors.textPrimary,
    fontSize: 14,
    fontWeight: '800' as const,
  },
  inlineActionRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    marginTop: 4,
  },
  addButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: themeColors.primary,
  },
  addButtonText: {
    color: themeColors.textOnBrand,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  listHeading: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  listCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surface,
    padding: 12,
    marginTop: 8,
  },
  listCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  removeButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: themeColors.surfaceMuted,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  removeButtonText: {
    color: themeColors.textPrimary,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  summaryLine: {
    color: themeColors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
    backgroundColor: themeColors.surface,
    paddingTop: 10,
    paddingHorizontal: 10,
    flexDirection: 'row' as const,
    gap: 10,
  },
  footerButton: {
    flex: 1,
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 14,
  },
  footerButtonPrimary: {
    backgroundColor: themeColors.primary,
  },
  footerButtonSecondary: {
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  footerButtonTextPrimary: {
    color: themeColors.textOnBrand,
    fontSize: 13,
    fontWeight: '800' as const,
  },
  footerButtonTextSecondary: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '800' as const,
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionText: {
    color: themeColors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
};