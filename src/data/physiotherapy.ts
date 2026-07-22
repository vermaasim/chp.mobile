import type { PhysiotherapyPrescriptionData } from '../api/records';

export function createDefaultPhysiotherapyPrescription(): PhysiotherapyPrescriptionData {
  return {
    complaint: '',
    medicalHistoryConditions: [
      { value: 'Diabetes', selected: false, displayValue: 'Diabetes' },
      { value: 'Hypertension', selected: false, displayValue: 'Hypertension' },
      { value: 'Asthma', selected: false, displayValue: 'Asthma' },
      { value: 'HeartDisease', selected: false, displayValue: 'Heart Disease' },
      { value: 'Thyroid', selected: false, displayValue: 'Thyroid' },
      { value: 'Epilepsy', selected: false, displayValue: 'Epilepsy' },
    ],
    medicalHistoryNotes: '',
    surgeryDetails: '',
    painLevel: 0,
    painLevelNotes: '',
    painTypes: [
      { value: 'Constant', selected: false, displayValue: 'Constant' },
      { value: 'Intermittent', selected: false, displayValue: 'Intermittent' },
      { value: 'Radiating', selected: false, displayValue: 'Radiating' },
      { value: 'Throbbing', selected: false, displayValue: 'Throbbing' },
      { value: 'PinsNeedles', selected: false, displayValue: 'Pins and Needles' },
      { value: 'Burning', selected: false, displayValue: 'Burning' },
    ],
    painTypeNotes: '',
    paintTypeNotes: '',
    rangeOfMotion: '',
    muscleStrength: '',
    muscleTightness: '',
    specialTests: '',
    treatmentPlan: '',
    dosDonts: '',
    suggestedSessions: '',
    shortTermTreatmentGoals: '',
    longTermTreatmentGoals: '',
    treatmentMethods: [
      { value: 'IFT', selected: false, displayValue: 'IFT' },
      { value: 'MFR', selected: false, displayValue: 'MFR' },
      { value: 'UltraSound', selected: false, displayValue: 'UltraSound' },
      { value: 'Tens', selected: false, displayValue: 'TENS' },
      { value: 'StrengtheningExercise', selected: false, displayValue: 'Strengthening Exercise' },
      { value: 'FlexibilityExercise', selected: false, displayValue: 'Flexibility Exercise' },
      { value: 'CoreStability', selected: false, displayValue: 'Core Stability' },
      { value: 'Others', selected: false, displayValue: 'Others', additionalText: '' },
    ],
  };
}
