import type {
  GeneralPrescriptionMedicine,
  GeneralPrescriptionTest,
  SelectableComorbidity,
} from '../../../data/generalPrescription';

export type GeneralRxSaveInput = {
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

function normalizeMedicine(item: GeneralPrescriptionMedicine) {
  return {
    serialNo: item.serialNo,
    name: item.name.trim(),
    dosage: item.dosage.trim(),
    duration: item.duration.trim(),
    frequency: item.frequency.trim(),
    instructions: item.instructions.trim(),
  };
}

function normalizeTest(item: GeneralPrescriptionTest) {
  return {
    serialNo: item.serialNo,
    name: item.name.trim(),
    toBeDoneOn: item.toBeDoneOn.trim(),
    instructions: item.instructions.trim(),
  };
}

export function buildGeneralRxPayload(input: GeneralRxSaveInput) {
  const comorbidities = input.comorbidities.map((item) => ({
    value: item.value.trim(),
    selected: item.selected,
    displayValue: item.displayValue.trim(),
    ...(item.additionalText !== undefined ? { additionalText: item.additionalText.trim() } : {}),
  }));
  const medicines = input.medicines
    .map(normalizeMedicine)
    .filter((item) => item.name || item.dosage || item.duration || item.frequency || item.instructions);
  const tests = input.tests.map(normalizeTest).filter((item) => item.name || item.toBeDoneOn || item.instructions);

  return {
    weight: input.weight.trim(),
    height: input.height.trim(),
    heightUnit: input.heightUnit.trim(),
    bloodPressure: input.bloodPressure.trim(),
    temprature: input.temprature.trim(),
    bloodSugar: input.bloodSugar.trim(),
    complaint: input.complaint.trim(),
    comorbidities,
    comorbiditiesNotes: input.comorbiditiesNotes.trim(),
    medicalAndSurgicalHistory: input.medicalAndSurgicalHistory.trim(),
    diagnosis: input.diagnosis.trim(),
    medicines,
    tests,
    additionalNotes: input.additionalNotes.trim(),
    followupDate: input.followupDate.trim(),
  };
}

export function hasGeneralRxContent(payload: ReturnType<typeof buildGeneralRxPayload>) {
  const hasComorbidityContent = payload.comorbidities.some((item) => item.selected || Boolean(item.additionalText?.trim()));

  return Boolean(
    payload.weight ||
      payload.height ||
      payload.bloodPressure ||
      payload.temprature ||
      payload.bloodSugar ||
    payload.complaint ||
      hasComorbidityContent ||
      payload.comorbiditiesNotes ||
      payload.medicalAndSurgicalHistory ||
      payload.diagnosis ||
      payload.medicines.length ||
      payload.tests.length ||
      payload.additionalNotes ||
      payload.followupDate
  );
}