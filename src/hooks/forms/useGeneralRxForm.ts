import { useEffect, useState } from 'react';
import {
  createEmptyGeneralPrescriptionMedicine,
  createEmptyGeneralPrescriptionTest,
  getGeneralPrescriptionDataJson,
  type GeneralPrescriptionMedicine,
  type GeneralPrescriptionTest,
  type SelectableComorbidity,
} from '../../data/generalPrescription';
import type { EditableRecordState } from '../../components/AddRecordModal';
import { mapEditingRecordToTemplate } from '../../components/AddRecordModal';

type PrescriptionStatus = 'Draft' | 'Final';

type UseGeneralRxFormParams = {
  visible: boolean;
  editingRecord?: EditableRecordState | null;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeComorbidityAdditionalText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function toComorbidityArray(value: unknown): SelectableComorbidity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const mapped: Array<SelectableComorbidity | undefined> = value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const mappedValue = asString(record.value);
      const mappedDisplay = asString(record.displayValue) || mappedValue;

      if (!mappedValue) {
        return undefined;
      }

      return {
        value: mappedValue,
        displayValue: mappedDisplay,
        selected: Boolean(record.selected),
        additionalText: normalizeComorbidityAdditionalText(record.additionalText),
      };
    });

  return mapped.filter((item): item is SelectableComorbidity => item !== undefined);
}

function asMedicine(value: unknown, index: number): GeneralPrescriptionMedicine {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    return {
      serialNo: Number(record.serialNo) || index + 1,
      name: asString(record.name),
      dosage: asString(record.dosage),
      duration: asString(record.duration),
      frequency: asString(record.frequency),
      instructions: asString(record.instructions),
    };
  }

  return {
    ...createEmptyGeneralPrescriptionMedicine(index + 1),
    name: asString(value),
  };
}

function asTest(value: unknown, index: number): GeneralPrescriptionTest {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    return {
      serialNo: Number(record.serialNo) || index + 1,
      name: asString(record.name),
      toBeDoneOn: asString(record.toBeDoneOn),
      instructions: asString(record.instructions),
    };
  }

  return {
    ...createEmptyGeneralPrescriptionTest(index + 1),
    name: asString(value),
  };
}

function toMedicineArray(value: unknown): GeneralPrescriptionMedicine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const medicines = value.map((item, index) => asMedicine(item, index));
  return medicines;
}

function toTestArray(value: unknown): GeneralPrescriptionTest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const tests = value.map((item, index) => asTest(item, index));
  return tests;
}

function reindexMedicines(items: GeneralPrescriptionMedicine[]) {
  return items.map((item, index) => ({ ...item, serialNo: index + 1 }));
}

function reindexTests(items: GeneralPrescriptionTest[]) {
  return items.map((item, index) => ({ ...item, serialNo: index + 1 }));
}

function hasMedicineContent(item: GeneralPrescriptionMedicine) {
  return Boolean(item.name.trim() || item.dosage.trim() || item.duration.trim() || item.frequency.trim() || item.instructions.trim());
}

function hasTestContent(item: GeneralPrescriptionTest) {
  return Boolean(item.name.trim() || item.toBeDoneOn.trim() || item.instructions.trim());
}

export function useGeneralRxForm({ visible, editingRecord }: UseGeneralRxFormParams) {
  const defaults = getGeneralPrescriptionDataJson();

  const [prescriptionStatus, setPrescriptionStatus] = useState<PrescriptionStatus>('Draft');
  const [weight, setWeight] = useState(defaults.weight);
  const [height, setHeight] = useState(defaults.height);
  const [heightUnit, setHeightUnit] = useState(defaults.heightUnit);
  const [bloodPressure, setBloodPressure] = useState(defaults.bloodPressure);
  const [temprature, setTemprature] = useState(defaults.temprature);
  const [bloodSugar, setBloodSugar] = useState(defaults.bloodSugar);
  const [generalRxComplaint, setGeneralRxComplaint] = useState('');
  const [comorbidities, setComorbidities] = useState<SelectableComorbidity[]>(defaults.comorbidities);
  const [comorbiditiesNotes, setComorbiditiesNotes] = useState(defaults.comorbiditiesNotes);
  const [medicalAndSurgicalHistory, setMedicalAndSurgicalHistory] = useState(defaults.medicalAndSurgicalHistory);
  const [generalRxDiagnosis, setGeneralRxDiagnosis] = useState('');
  const [generalRxMedicines, setGeneralRxMedicines] = useState<GeneralPrescriptionMedicine[]>(defaults.medicines);
  const [generalRxTests, setGeneralRxTests] = useState<GeneralPrescriptionTest[]>(defaults.tests);
  const [currentMedicine, setCurrentMedicine] = useState<GeneralPrescriptionMedicine>(createEmptyGeneralPrescriptionMedicine(1));
  const [currentTest, setCurrentTest] = useState<GeneralPrescriptionTest>(createEmptyGeneralPrescriptionTest(1));
  const [generalRxAdditionalNotes, setGeneralRxAdditionalNotes] = useState('');
  const [generalRxFollowupDate, setGeneralRxFollowupDate] = useState('');

  const toggleComorbidity = (value: string) => {
    setComorbidities((previousValue) =>
      previousValue.map((item) =>
        item.value === value
          ? {
              ...item,
              selected: !item.selected,
            }
          : item
      )
    );
  };

  const updateComorbidityAdditionalText = (value: string, additionalText: string) => {
    setComorbidities((previousValue) =>
      previousValue.map((item) =>
        item.value === value
          ? {
              ...item,
              additionalText,
            }
          : item
      )
    );
  };

  const addMedicine = () => {
    if (!hasMedicineContent(currentMedicine)) {
      return;
    }

    setGeneralRxMedicines((previousValue) => [...previousValue, { ...currentMedicine, serialNo: previousValue.length + 1 }]);
    setCurrentMedicine(createEmptyGeneralPrescriptionMedicine(1));
  };

  const updateCurrentMedicine = (key: keyof Omit<GeneralPrescriptionMedicine, 'serialNo'>, value: string) => {
    setCurrentMedicine((previousValue) => ({ ...previousValue, [key]: value }));
  };

  const updateMedicine = (serialNo: number, key: keyof Omit<GeneralPrescriptionMedicine, 'serialNo'>, value: string) => {
    setGeneralRxMedicines((previousValue) =>
      previousValue.map((item) => (item.serialNo === serialNo ? { ...item, [key]: value } : item))
    );
  };

  const removeMedicine = (serialNo: number) => {
    setGeneralRxMedicines((previousValue) => {
      return reindexMedicines(previousValue.filter((item) => item.serialNo !== serialNo));
    });
  };

  const addTest = () => {
    if (!hasTestContent(currentTest)) {
      return;
    }

    setGeneralRxTests((previousValue) => [...previousValue, { ...currentTest, serialNo: previousValue.length + 1 }]);
    setCurrentTest(createEmptyGeneralPrescriptionTest(1));
  };

  const updateCurrentTest = (key: keyof Omit<GeneralPrescriptionTest, 'serialNo'>, value: string) => {
    setCurrentTest((previousValue) => ({ ...previousValue, [key]: value }));
  };

  const updateTest = (serialNo: number, key: keyof Omit<GeneralPrescriptionTest, 'serialNo'>, value: string) => {
    setGeneralRxTests((previousValue) =>
      previousValue.map((item) => (item.serialNo === serialNo ? { ...item, [key]: value } : item))
    );
  };

  const removeTest = (serialNo: number) => {
    setGeneralRxTests((previousValue) => {
      return reindexTests(previousValue.filter((item) => item.serialNo !== serialNo));
    });
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    const resolvedTemplate = mapEditingRecordToTemplate(editingRecord);
    const prescriptionPayload = (editingRecord?.prescription?.detailedPrescription as unknown as Record<string, unknown>) ?? {};
    const legacyPastHistory = asRecord(prescriptionPayload.pastHistory);
    const objectComorbidities = toComorbidityArray(prescriptionPayload.comorbidities);
    const selectedComorbidities = new Set(toStringArray(prescriptionPayload.comorbidities).map((item) => item.toLowerCase()));
    const selectedComorbiditiesFromObject = new Set(
      objectComorbidities.filter((item) => item.selected).map((item) => item.value.toLowerCase())
    );
    const additionalTextByValue = new Map(
      objectComorbidities.map((item) => [item.value.toLowerCase(), item.additionalText ?? ''])
    );

    const hasLegacyHtn = asText(legacyPastHistory.htn).toLowerCase() === 'yes';
    const hasLegacyDm2 = asText(legacyPastHistory.dm2).toLowerCase() === 'yes';
    const hasLegacyHypothyroidism = asText(legacyPastHistory.hypothyroidism).toLowerCase() === 'yes';

    if (editingRecord && resolvedTemplate !== 'generalRx') {
      return;
    }

    setPrescriptionStatus((editingRecord?.prescription?.status as PrescriptionStatus) ?? 'Draft');
    setWeight(asString(prescriptionPayload.weight));
    setHeight(asString(prescriptionPayload.height));
    setHeightUnit(asString(prescriptionPayload.heightUnit) || defaults.heightUnit);
    setBloodPressure(asString(prescriptionPayload.bloodPressure));
    setTemprature(asString(prescriptionPayload.temprature));
    setBloodSugar(asString(prescriptionPayload.bloodSugar));
    setGeneralRxComplaint(asText(prescriptionPayload.complaint));
    setComorbidities(
      getGeneralPrescriptionDataJson().comorbidities.map((item) => {
        const isLegacyMapped =
          (item.value.toLowerCase() === 'hypertension' && hasLegacyHtn) ||
          (item.value.toLowerCase() === 'diabetes' && hasLegacyDm2) ||
          (item.value.toLowerCase() === 'hypothyroidism' && hasLegacyHypothyroidism);

        return {
          ...item,
          selected:
            selectedComorbiditiesFromObject.has(item.value.toLowerCase()) ||
            selectedComorbidities.has(item.value.toLowerCase()) ||
            isLegacyMapped,
          additionalText: additionalTextByValue.get(item.value.toLowerCase()) ?? item.additionalText ?? '',
        };
      })
    );
    setComorbiditiesNotes(asString(prescriptionPayload.comorbiditiesNotes));
    setMedicalAndSurgicalHistory(asString(prescriptionPayload.medicalAndSurgicalHistory) || asString(legacyPastHistory.rxHistory));
    setGeneralRxDiagnosis(asText(prescriptionPayload.diagnosis));
    setGeneralRxMedicines(toMedicineArray(prescriptionPayload.medicines));
    setGeneralRxTests(toTestArray(prescriptionPayload.tests));
    setCurrentMedicine(createEmptyGeneralPrescriptionMedicine(1));
    setCurrentTest(createEmptyGeneralPrescriptionTest(1));
    setGeneralRxAdditionalNotes(asText(prescriptionPayload.additionalNotes));
    setGeneralRxFollowupDate(asText(prescriptionPayload.followupDate));
  }, [editingRecord, visible]);

  return {
    prescriptionStatus,
    setPrescriptionStatus,
    weight,
    setWeight,
    height,
    setHeight,
    heightUnit,
    setHeightUnit,
    bloodPressure,
    setBloodPressure,
    temprature,
    setTemprature,
    bloodSugar,
    setBloodSugar,
    generalRxComplaint,
    setGeneralRxComplaint,
    comorbidities,
    toggleComorbidity,
    updateComorbidityAdditionalText,
    comorbiditiesNotes,
    setComorbiditiesNotes,
    medicalAndSurgicalHistory,
    setMedicalAndSurgicalHistory,
    generalRxDiagnosis,
    setGeneralRxDiagnosis,
    currentMedicine,
    updateCurrentMedicine,
    generalRxMedicines,
    setGeneralRxMedicines,
    addMedicine,
    updateMedicine,
    removeMedicine,
    currentTest,
    updateCurrentTest,
    generalRxTests,
    setGeneralRxTests,
    addTest,
    updateTest,
    removeTest,
    generalRxAdditionalNotes,
    setGeneralRxAdditionalNotes,
    generalRxFollowupDate,
    setGeneralRxFollowupDate,
  };
}