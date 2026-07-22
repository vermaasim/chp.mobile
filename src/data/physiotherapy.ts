export type PhysiotherapySelectableItem = {
  value: string;
  selected: boolean;
  displayValue: string;
  additionalText?: string;
};

export type PhysiotherapyPrescriptionData = {
  complaint: string;
  medicalHistoryConditions: PhysiotherapySelectableItem[];
  medicalHistoryNotes: string;
  surgeryDetails: string;
  painLevel: number;
  painLevelNotes: string;
  painTypes: PhysiotherapySelectableItem[];
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
  treatmentMethods: PhysiotherapySelectableItem[];
};

export const PHYSIOTHERAPY_MEDICAL_HISTORY_CONDITIONS: Omit<PhysiotherapySelectableItem, 'selected'>[] = [
  { value: 'Diabetes', displayValue: 'Diabetes' },
  { value: 'Hypertension', displayValue: 'Hypertension' },
  { value: 'Asthma', displayValue: 'Asthma' },
  { value: 'HeartDisease', displayValue: 'Heart Disease' },
  { value: 'Thyroid', displayValue: 'Thyroid' },
  { value: 'Epilepsy', displayValue: 'Epilepsy' },
];

export const PHYSIOTHERAPY_PAIN_TYPES: Omit<PhysiotherapySelectableItem, 'selected'>[] = [
  { value: 'Constant', displayValue: 'Constant' },
  { value: 'Intermittent', displayValue: 'Intermittent' },
  { value: 'Radiating', displayValue: 'Radiating' },
  { value: 'Throbbing', displayValue: 'Throbbing' },
  { value: 'PinsNeedles', displayValue: 'Pins and Needles' },
  { value: 'Burning', displayValue: 'Burning' },
];

export const PHYSIOTHERAPY_TREATMENT_METHODS: Omit<PhysiotherapySelectableItem, 'selected'>[] = [
  { value: 'IFT', displayValue: 'IFT' },
  { value: 'MFR', displayValue: 'MFR' },
  { value: 'UltraSound', displayValue: 'UltraSound' },
  { value: 'Tens', displayValue: 'TENS' },
  { value: 'StrengtheningExercise', displayValue: 'Strengthening Exercise' },
  { value: 'FlexibilityExercise', displayValue: 'Flexibility Exercise' },
  { value: 'CoreStability', displayValue: 'Core Stability' },
  { value: 'Others', displayValue: 'Others', additionalText: 'Other mechanism' },
];

function asText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeSelectableItems(
  defaults: Omit<PhysiotherapySelectableItem, 'selected'>[],
  value: unknown
): PhysiotherapySelectableItem[] {
  const incomingItems = Array.isArray(value) ? value : [];
  const incomingByValue = new Map(
    incomingItems
      .map((item) => {
        const record = asRecord(item);
        const itemValue = asText(record.value);

        if (!itemValue) {
          return null;
        }

        return [itemValue, record] as const;
      })
      .filter(Boolean) as ReadonlyArray<readonly [string, Record<string, unknown>]>
  );

  return defaults.map((item) => {
    const incoming = incomingByValue.get(item.value);

    return {
      ...item,
      selected: Boolean(incoming?.selected),
      displayValue: asText(incoming?.displayValue) || item.displayValue,
      additionalText: asText(incoming?.additionalText) || item.additionalText,
    };
  });
}

export function getPhysiotherapyPrescriptionDataJson(): PhysiotherapyPrescriptionData {
  return {
    complaint: '',
    medicalHistoryConditions: PHYSIOTHERAPY_MEDICAL_HISTORY_CONDITIONS.map((item) => ({ ...item, selected: false })),
    medicalHistoryNotes: '',
    surgeryDetails: '',
    painLevel: 0,
    painLevelNotes: '',
    painTypes: PHYSIOTHERAPY_PAIN_TYPES.map((item) => ({ ...item, selected: false })),
    painTypeNotes: '',
    rangeOfMotion: '',
    muscleStrength: '',
    muscleTightness: '',
    specialTests: '',
    treatmentPlan: '',
    dosDonts: '',
    suggestedSessions: '',
    shortTermTreatmentGoals: '',
    longTermTreatmentGoals: '',
    treatmentMethods: PHYSIOTHERAPY_TREATMENT_METHODS.map((item) => ({ ...item, selected: false })),
  };
}

export function createDefaultPhysiotherapyPrescription(): PhysiotherapyPrescriptionData {
  return getPhysiotherapyPrescriptionDataJson();
}

export function mergePhysiotherapyPrescription(base: PhysiotherapyPrescriptionData, incoming?: unknown): PhysiotherapyPrescriptionData {
  if (!incoming) {
    return base;
  }

  const record = asRecord(incoming);
  const painLevel = typeof record.painLevel === 'number' ? record.painLevel : Number(record.painLevel) || 0;
  const legacyPainTypeNotes = asText(record.paintTypeNotes);

  return {
    complaint: asText(record.complaint) || base.complaint,
    medicalHistoryConditions: normalizeSelectableItems(PHYSIOTHERAPY_MEDICAL_HISTORY_CONDITIONS, record.medicalHistoryConditions),
    medicalHistoryNotes: asText(record.medicalHistoryNotes) || base.medicalHistoryNotes,
    surgeryDetails: asText(record.surgeryDetails) || base.surgeryDetails,
    painLevel,
    painLevelNotes: asText(record.painLevelNotes) || base.painLevelNotes,
    painTypes: normalizeSelectableItems(PHYSIOTHERAPY_PAIN_TYPES, record.painTypes),
    painTypeNotes: asText(record.painTypeNotes) || legacyPainTypeNotes || base.painTypeNotes,
    rangeOfMotion: asText(record.rangeOfMotion) || base.rangeOfMotion,
    muscleStrength: asText(record.muscleStrength) || base.muscleStrength,
    muscleTightness: asText(record.muscleTightness) || base.muscleTightness,
    specialTests: asText(record.specialTests) || base.specialTests,
    treatmentPlan: asText(record.treatmentPlan) || base.treatmentPlan,
    dosDonts: asText(record.dosDonts) || base.dosDonts,
    suggestedSessions: asText(record.suggestedSessions) || base.suggestedSessions,
    shortTermTreatmentGoals: asText(record.shortTermTreatmentGoals) || base.shortTermTreatmentGoals,
    longTermTreatmentGoals: asText(record.longTermTreatmentGoals) || base.longTermTreatmentGoals,
    treatmentMethods: normalizeSelectableItems(PHYSIOTHERAPY_TREATMENT_METHODS, record.treatmentMethods),
  };
}
