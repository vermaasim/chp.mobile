export type SelectableComorbidity = {
  value: string;
  displayValue: string;
  selected: boolean;
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
  { value: 'Diabetes', displayValue: 'Diabetes' },
  { value: 'Hypertension', displayValue: 'Hypertension' },
  { value: 'Hypothyroidism', displayValue: 'Hypothyroidism' },
  { value: 'Asthma', displayValue: 'Asthma' },
  { value: 'HeartDisease', displayValue: 'Heart Disease' },
  { value: 'Epilepsy', displayValue: 'Epilepsy' },
];

export type GeneralPrescriptionData = {
  weight: string;
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