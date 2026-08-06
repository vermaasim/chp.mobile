import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeColors } from '../../../theme/colors';
import type { RegenerationContextTextType } from '../../../api/textRegeneration';
import { allStyles } from '../../../styles/commonStyles';
import { SpeechEnabledMultilineInput } from '../../SpeechEnabledMultilineInput';
import { useResponsiveLayout } from '../../../hooks/useResponsiveLayout';

type PrescriptionStatus = 'Draft' | 'Final';
type WizardStepKey = 'complaintHistory' | 'assessment' | 'prescribedTreatment' | 'status';

const STATUS_VALUES: PrescriptionStatus[] = ['Draft', 'Final'];
const STEP_CONFIG: Array<{ key: WizardStepKey; title: string; subtitle: string }> = [
  {
    key: 'complaintHistory',
    title: 'Complaint and Medical History',
    subtitle: 'Capture complaint and past medical history.',
  },
  {
    key: 'assessment',
    title: 'Assessment',
    subtitle: 'Record pain profile and assessment findings.',
  },
  {
    key: 'prescribedTreatment',
    title: 'Prescribed Treatment',
    subtitle: 'Document treatment plan, methods abd goals.',
  },
  {
    key: 'status',
    title: 'Prescription Status',
    subtitle: 'Set the record status before saving.',
  },
];

type PhysiotherapyRxFormProps = {
  token: string;
  facilityId: string;
  visible: boolean;
  saving: boolean;
  onSave: () => void;
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
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const [currentStep, setCurrentStep] = useState<WizardStepKey>('complaintHistory');

  const currentStepIndex = STEP_CONFIG.findIndex((item) => item.key === currentStep);
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex === STEP_CONFIG.length - 1;
  const currentStepMeta = STEP_CONFIG[currentStepIndex] ?? STEP_CONFIG[0];

  useEffect(() => {
    if (props.visible) {
      setCurrentStep('complaintHistory');
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

  const renderStepContent = () => {
    if (currentStep === 'complaintHistory') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Complaint and Medical History</Text>
          <Text style={styles.sectionHint}>Capture patient complaint and relevant medical background.</Text>

          <Text style={allStyles.label}>Chief Complaint</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.complaint}
            onChangeText={(value) => props.updatePhysioField('complaint', value)}
            numberOfLines={3}
            {...withAiContext('complaint', 'Physiotherapy chief complaint.', 'Use concise physiotherapy clinical phrasing.')}
          />

          <Text style={allStyles.label}>Medical History</Text>
          <View style={allStyles.typeRow}>
            {props.physio.medicalHistoryConditions.map((item) => (
              <Pressable
                key={item.value}
                style={[allStyles.typeChip, item.selected ? allStyles.typeChipActive : null]}
                onPress={() => props.toggleSelectable('medicalHistoryConditions', item.value)}
              >
                <Text style={[allStyles.typeChipText, item.selected ? allStyles.typeChipTextActive : null]}>{item.displayValue}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Medical History Notes</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.medicalHistoryNotes}
            onChangeText={(value) => props.updatePhysioField('medicalHistoryNotes', value)}
            numberOfLines={3}
            {...withAiContext('assessment', 'Physiotherapy medical history notes.', 'Use concise history-oriented physiotherapy wording.')}
          />

          <Text style={allStyles.label}>Surgery Details</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.surgeryDetails}
            onChangeText={(value) => props.updatePhysioField('surgeryDetails', value)}
            numberOfLines={3}
            {...withAiContext('assessment', 'Physiotherapy surgery details.', 'Use concise relevant surgical history wording.')}
          />
        </View>
      );
    }

    if (currentStep === 'assessment') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Assessment</Text>
          <Text style={styles.sectionHint}>Document pain intensity, pain profile, and physical findings.</Text>

          <Text style={allStyles.label}>Pain Level (0-10)</Text>
          <TextInput
            value={`${props.physio.painLevel}`}
            onChangeText={(value) => props.updatePhysioField('painLevel', Number(value) || 0)}
            keyboardType="numeric"
            style={allStyles.input}
          />

          <Text style={allStyles.label}>Pain Types</Text>
          <View style={allStyles.typeRow}>
            {props.physio.painTypes.map((item) => (
              <Pressable
                key={item.value}
                style={[allStyles.typeChip, item.selected ? allStyles.typeChipActive : null]}
                onPress={() => props.toggleSelectable('painTypes', item.value)}
              >
                <Text style={[allStyles.typeChipText, item.selected ? allStyles.typeChipTextActive : null]}>{item.displayValue}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Pain Notes</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.painTypeNotes}
            onChangeText={(value) => props.updatePhysioField('painTypeNotes', value)}
            numberOfLines={3}
            {...withAiContext('assessment', 'Physiotherapy pain type notes.', 'Use objective pain assessment language.')}
          />

          <Text style={allStyles.label}>Pain Level Notes</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.painLevelNotes}
            onChangeText={(value) => props.updatePhysioField('painLevelNotes', value)}
            numberOfLines={2}
            {...withAiContext('assessment', 'Physiotherapy pain level notes.', 'Use concise pain severity documentation style.')}
          />

          <Text style={allStyles.label}>Range Of Motion</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.rangeOfMotion}
            onChangeText={(value) => props.updatePhysioField('rangeOfMotion', value)}
            numberOfLines={2}
            {...withAiContext('assessment', 'Physiotherapy range of motion findings.', 'Use structured ROM assessment wording.')}
          />

          <Text style={allStyles.label}>Muscle Strength</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.muscleStrength}
            onChangeText={(value) => props.updatePhysioField('muscleStrength', value)}
            numberOfLines={2}
            {...withAiContext('assessment', 'Physiotherapy muscle strength findings.', 'Use concise strength assessment terminology.')}
          />

          <Text style={allStyles.label}>Muscle Tightness</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.muscleTightness}
            onChangeText={(value) => props.updatePhysioField('muscleTightness', value)}
            numberOfLines={2}
            {...withAiContext('assessment', 'Physiotherapy muscle tightness findings.', 'Use concise objective assessment language.')}
          />

          <Text style={allStyles.label}>Special Tests</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.specialTests}
            onChangeText={(value) => props.updatePhysioField('specialTests', value)}
            numberOfLines={2}
            {...withAiContext('assessment', 'Physiotherapy special test findings.', 'Use concise test-result oriented wording.')}
          />
        </View>
      );
    }

    if (currentStep === 'prescribedTreatment') {
      return (
        <View style={styles.wizardCard}>
          <Text style={styles.sectionHeading}>Prescribed Treatment</Text>
          <Text style={styles.sectionHint}>Capture plan, methods, duration, and treatment goals.</Text>

          <Text style={allStyles.label}>Treatment Plan</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.treatmentPlan}
            onChangeText={(value) => props.updatePhysioField('treatmentPlan', value)}
            numberOfLines={3}
            {...withAiContext('treatment', 'Physiotherapy treatment plan.', 'Use actionable treatment planning language.')}
          />

          <Text style={allStyles.label}>Treatment Methods</Text>
          <View style={allStyles.typeRow}>
            {props.physio.treatmentMethods.map((item) => (
              <Pressable
                key={item.value}
                style={[allStyles.typeChip, item.selected ? allStyles.typeChipActive : null]}
                onPress={() => props.toggleSelectable('treatmentMethods', item.value)}
              >
                <Text style={[allStyles.typeChipText, item.selected ? allStyles.typeChipTextActive : null]}>{item.displayValue}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={allStyles.label}>Suggested Sessions</Text>
          <TextInput
            value={props.physio.suggestedSessions}
            onChangeText={(value) => props.updatePhysioField('suggestedSessions', value)}
            style={allStyles.input}
            placeholder="e.g. 5"
          />

          <Text style={allStyles.label}>Short Term Goals</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.shortTermTreatmentGoals}
            onChangeText={(value) => props.updatePhysioField('shortTermTreatmentGoals', value)}
            numberOfLines={3}
            {...withAiContext('treatment', 'Physiotherapy short-term goals.', 'Use measurable short-term therapy goals.')}
          />

          <Text style={allStyles.label}>Long Term Goals</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.longTermTreatmentGoals}
            onChangeText={(value) => props.updatePhysioField('longTermTreatmentGoals', value)}
            numberOfLines={3}
            {...withAiContext('treatment', 'Physiotherapy long-term goals.', 'Use measurable long-term therapy goals.')}
          />

          <Text style={allStyles.label}>Do's and Don'ts</Text>
          <SpeechEnabledMultilineInput
            value={props.physio.dosDonts}
            onChangeText={(value) => props.updatePhysioField('dosDonts', value)}
            numberOfLines={3}
            {...withAiContext('dos_donts', 'Physiotherapy do and do-not advice.', 'Use clear patient-safe dos and donts guidance.')}
          />
        </View>
      );
    }

    return (
      <View style={styles.wizardCard}>
        <Text style={styles.sectionHeading}>Prescription Status</Text>
        <Text style={styles.sectionHint}>Select whether the prescription should be saved as draft or final.</Text>

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
};