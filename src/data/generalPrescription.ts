export type SelectableComorbidity = {
  value: string;
  displayValue: string;
  selected: boolean;
  additionalText?: string;
};

export type GeneralPrescriptionMedicine = {
  serialNo: number;
  name: string;
  dosage: string;
  duration: string;
  frequency: string;
  instructions: string;
};

export type GeneralPrescriptionTest = {
  serialNo: number;
  name: string;
  toBeDoneOn: string;
  instructions: string;
};

export const SelectableComorbidities: Omit<SelectableComorbidity, 'selected'>[] = [
  { value: 'Anemia', displayValue: 'Anemia' },
  { value: 'Obesity', displayValue: 'Obesity' },
  { value: 'Cancer', displayValue: 'Cancer' },
  { value: 'COPD', displayValue: 'COPD' },
  { value: 'ChronicKidneyDisease', displayValue: 'Chronic Kidney Disease' },
  { value: 'LiverDisease', displayValue: 'Liver Disease' },
  { value: 'Stroke', displayValue: 'Stroke' },
  { value: 'AutoimmuneDisorder', displayValue: 'Autoimmune Disorder' },
  { value: 'Diabetes', displayValue: 'Diabetes' },
  { value: 'Hypertension', displayValue: 'Hypertension' },
  { value: 'Asthma', displayValue: 'Asthma' },
  { value: 'HeartDisease', displayValue: 'Heart Disease' },
  { value: 'Thyroid', displayValue: 'Thyroid' },
  { value: 'Epilepsy', displayValue: 'Epilepsy' },
  { value: 'Other', displayValue: 'Other', additionalText: '' },
];

export type GeneralPrescriptionData = {
  weight: string;
  height: string;
  heightUnit: string;
  bloodPressure: string;
  temprature: string;
  bloodSugar: string;
  complaint: string;
  comorbidities: SelectableComorbidity[];
  comorbiditiesNotes: string;
  medicalAndSurgicalHistory: string;
  diagnosis: string;
  medicines: GeneralPrescriptionMedicine[];
  tests: GeneralPrescriptionTest[];
  additionalNotes: string;
  followupDate: string;
};

export function createEmptyGeneralPrescriptionMedicine(serialNo: number): GeneralPrescriptionMedicine {
  return {
    serialNo,
    name: '',
    dosage: '',
    duration: '',
    frequency: '',
    instructions: '',
  };
}

export function createEmptyGeneralPrescriptionTest(serialNo: number): GeneralPrescriptionTest {
  return {
    serialNo,
    name: '',
    toBeDoneOn: '',
    instructions: '',
  };
}

export const getGeneralPrescriptionDataJson = (): GeneralPrescriptionData => {
  return {
    weight: '',
    height: '',
    heightUnit: 'inches',
    bloodPressure: '',
    temprature: '',
    bloodSugar: '',
    complaint: '',
    comorbidities: SelectableComorbidities.map((c) => ({ ...c, selected: false })),
    comorbiditiesNotes: '',
    medicalAndSurgicalHistory: '',
    diagnosis: '',
    medicines: [],
    tests: [],
    additionalNotes: '',
    followupDate: '',
  };
};