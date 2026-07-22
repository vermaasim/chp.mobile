import type {
  GeneralPrescriptionMedicine,
  GeneralPrescriptionTest,
  SelectableComorbidity,
} from '../../../data/generalPrescription';

export type GeneralRxSaveInput = {
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
  const selectedComorbidities = input.comorbidities.filter((item) => item.selected).map((item) => item.value);
  const medicines = input.medicines
    .map(normalizeMedicine)
    .filter((item) => item.name || item.dosage || item.duration || item.frequency || item.instructions);
  const tests = input.tests.map(normalizeTest).filter((item) => item.name || item.toBeDoneOn || item.instructions);

  return {
    weight: input.weight.trim(),
    bloodPressure: input.bloodPressure.trim(),
    temprature: input.temprature.trim(),
    bloodSugar: input.bloodSugar.trim(),
    complaint: input.complaint.trim(),
    comorbidities: selectedComorbidities,
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
  return Boolean(
    payload.weight ||
      payload.bloodPressure ||
      payload.temprature ||
      payload.bloodSugar ||
    payload.complaint ||
      payload.comorbidities.length ||
      payload.comorbiditiesNotes ||
      payload.medicalAndSurgicalHistory ||
      payload.diagnosis ||
      payload.medicines.length ||
      payload.tests.length ||
      payload.additionalNotes ||
      payload.followupDate
  );
}