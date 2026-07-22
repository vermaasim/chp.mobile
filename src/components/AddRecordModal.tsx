import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  addClinicalNote,
  addDrawingRecord,
  addPrescriptionRecord,
  type ClinicalNoteDetail,
  type DrawingDetail,
  type PhysiotherapyPrescriptionData,
  type PrescriptionDetail,
  updateClinicalNote,
  updateDrawingRecord,
  updatePrescriptionRecord,
} from '../api/records';
import { createDefaultPhysiotherapyPrescription } from '../data/physiotherapy';
import { allStyles } from '../styles/commonStyles';
import type { TaskDetailRecordType } from '../types/worklist';
import { themeColors } from '../theme/colors';
import { DrawingCanvasEditor } from './DrawingCanvasEditor';
import { SpeechEnabledMultilineInput } from './SpeechEnabledMultilineInput';
import {
  PRESCRIPTION_TYPE_VALUE,
  type RecordTemplateKey,
} from './record-flow/recordTemplates';

export interface AddRecordModalProps {
  visible: boolean;
  token: string;
  serviceId: string | null;
  template: RecordTemplateKey;
  editingRecord?: EditableRecordState | null;
  onClose: () => void;
  onSaved: (type: TaskDetailRecordType) => void;
}

export type AddRecordType = 'medicalRecord' | 'clinicalnote' | 'prescription' | 'drawing';

type LabParameterInput = {
  selected: boolean;
  parameterId: string;
  parameterName: string;
  resultValue: string;
  unit: string;
  lowerLimit: string;
  upperLimit: string;
  status: string;
  notes: string;
};

type LabTestInput = {
  testId: string;
  testName: string;
  referenceText: string;
  parameters: LabParameterInput[];
};

export interface EditableRecordState {
  type: AddRecordType;
  id: string;
  displayId?: string;
  medicalRecord?: {
    name?: string;
    recordType?: string;
    recordDate?: string;
    description?: string;
  };
  clinicalNote?: ClinicalNoteDetail;
  prescription?: PrescriptionDetail;
  drawing?: DrawingDetail;
}

const YES_NO_VALUES = ['Yes', 'No'];
const SIDE_VALUES = ['Right', 'Left', 'Bilateral'];
const PAIN_NATURE_VALUES = ['Continuous', 'Intermittent'];
const ONSET_VALUES = ['Gradual', 'Sudden'];
const STATUS_VALUES: Array<'Draft' | 'Final'> = ['Draft', 'Final'];

const DEFAULT_ROM_TEMPLATE = [
  { name: 'flexion', displayName: 'Flexion', normal: 180, left: 0, right: 0 },
  { name: 'extension', displayName: 'Extension', normal: 60, left: 0, right: 0 },
  { name: 'abduction', displayName: 'Abduction', normal: 180, left: 0, right: 0 },
  { name: 'adduction', displayName: 'Adduction', normal: 50, left: 0, right: 0 },
  { name: 'medialRotation', displayName: 'Medial Rotation', normal: 90, left: 0, right: 0 },
  { name: 'lateralRotation', displayName: 'Lateral Rotation', normal: 90, left: 0, right: 0 },
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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asText(item)).filter(Boolean);
}

function toCsv(value: string[]) {
  return value.join(', ');
}

function fromCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function createEmptyLabParameter(index: number): LabParameterInput {
  return {
    selected: false,
    parameterId: `P-${index + 1}`,
    parameterName: '',
    resultValue: '',
    unit: '',
    lowerLimit: '',
    upperLimit: '',
    status: 'Normal',
    notes: '',
  };
}

function normalizeLabParameter(value: unknown, index: number): LabParameterInput {
  const record = asRecord(value);

  return {
    selected: Boolean(record.selected),
    parameterId: asText(record.parameterId) || `P-${index + 1}`,
    parameterName: asText(record.parameterName),
    resultValue: asText(record.resultValue),
    unit: asText(record.unit),
    lowerLimit: asText(record.lowerLimit),
    upperLimit: asText(record.upperLimit),
    status: asText(record.status) || 'Normal',
    notes: asText(record.notes),
  };
}

function normalizeLabTest(value: unknown, index: number): LabTestInput {
  const record = asRecord(value);
  const parameters = Array.isArray(record.parameters)
    ? record.parameters.map((item, parameterIndex) => normalizeLabParameter(item, parameterIndex))
    : [];

  return {
    testId: asText(record.testId) || `MOB-${index + 1}`,
    testName: asText(record.testName),
    referenceText: asText(record.referenceText),
    parameters,
  };
}

function toRecordType(type: AddRecordType): TaskDetailRecordType {
  if (type === 'drawing') return 'drawing';
  return type;
}

function mapTemplateToRecordType(template: RecordTemplateKey): AddRecordType {
  if (template === 'generalNotes' || template === 'physiotherapyTxNotes') {
    return 'clinicalnote';
  }

  if (template === 'diagram') {
    return 'drawing';
  }

  return 'prescription';
}

export function mapEditingRecordToTemplate(editingRecord?: EditableRecordState | null): RecordTemplateKey {
  if (!editingRecord) {
    return 'generalRx';
  }

  if (editingRecord.type === 'drawing') {
    return 'diagram';
  }

  if (editingRecord.type === 'clinicalnote') {
    const noteType = (editingRecord.clinicalNote?.noteType || '').toLowerCase();
    return noteType === 'physiotherapytreatment' ? 'physiotherapyTxNotes' : 'generalNotes';
  }

  if (editingRecord.type === 'prescription') {
    const prescriptionType = editingRecord.prescription?.prescriptionType || '';

    if (prescriptionType === PRESCRIPTION_TYPE_VALUE.physiotherapyRx) return 'physiotherapyRx';
    if (prescriptionType === PRESCRIPTION_TYPE_VALUE.frozenShoulderRx) return 'frozenShoulderRx';
    if (prescriptionType === PRESCRIPTION_TYPE_VALUE.dentalRx) return 'dentalRx';
    if (prescriptionType === PRESCRIPTION_TYPE_VALUE.labReport) return 'labReport';

    return 'generalRx';
  }

  return 'generalRx';
}

function mergePhysio(base: PhysiotherapyPrescriptionData, incoming?: PhysiotherapyPrescriptionData) {
  if (!incoming) {
    return base;
  }

  return {
    ...base,
    ...incoming,
    medicalHistoryConditions: incoming.medicalHistoryConditions ?? base.medicalHistoryConditions,
    painTypes: incoming.painTypes ?? base.painTypes,
    treatmentMethods: incoming.treatmentMethods ?? base.treatmentMethods,
    painTypeNotes: incoming.painTypeNotes ?? incoming.paintTypeNotes ?? base.painTypeNotes,
    paintTypeNotes: incoming.paintTypeNotes ?? incoming.painTypeNotes ?? base.paintTypeNotes,
  };
}

export function BaseRecordTemplateModal({
  visible,
  token,
  serviceId,
  template,
  editingRecord,
  onClose,
  onSaved,
}: AddRecordModalProps) {
  const selectedTemplate = template;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [generalRxComplaint, setGeneralRxComplaint] = useState('');
  const [generalRxDiagnosis, setGeneralRxDiagnosis] = useState('');
  const [generalRxMedicines, setGeneralRxMedicines] = useState('');
  const [generalRxTests, setGeneralRxTests] = useState('');
  const [generalRxAdditionalNotes, setGeneralRxAdditionalNotes] = useState('');
  const [generalRxFollowupDate, setGeneralRxFollowupDate] = useState('');
  const [generalPastHtn, setGeneralPastHtn] = useState<'Yes' | 'No'>('No');
  const [generalPastDm2, setGeneralPastDm2] = useState<'Yes' | 'No'>('No');
  const [generalPastHypothyroidism, setGeneralPastHypothyroidism] = useState<'Yes' | 'No'>('No');
  const [generalRxHistory, setGeneralRxHistory] = useState('');
  const [generalExamSide, setGeneralExamSide] = useState('Right');
  const [generalSwelling, setGeneralSwelling] = useState<'Yes' | 'No'>('No');
  const [generalMuscleWasting, setGeneralMuscleWasting] = useState<'Yes' | 'No'>('No');
  const [generalNeuroDeficit, setGeneralNeuroDeficit] = useState<'Yes' | 'No'>('No');
  const [generalNeuroDeficitType, setGeneralNeuroDeficitType] = useState('Motor');
  const [generalCapsularPattern, setGeneralCapsularPattern] = useState<'Yes' | 'No'>('No');
  const [generalMuscleTightness, setGeneralMuscleTightness] = useState<'Yes' | 'No'>('No');
  const [generalMusclesInvolvedCsv, setGeneralMusclesInvolvedCsv] = useState('');
  const [generalTendernessCsv, setGeneralTendernessCsv] = useState('');
  const [generalMusclePower, setGeneralMusclePower] = useState('Decreased due to pain');
  const [generalGripPinch, setGeneralGripPinch] = useState('Strong');
  const [generalTone, setGeneralTone] = useState('Normal');
  const [generalCoordination, setGeneralCoordination] = useState('Good');
  const [generalThumbDropTest, setGeneralThumbDropTest] = useState('Negative');
  const [generalPainfulArcTest, setGeneralPainfulArcTest] = useState('Negative');
  const [generalAdl, setGeneralAdl] = useState('Independent');
  const [generalDifficultiesCsv, setGeneralDifficultiesCsv] = useState('');
  const [generalModalitiesCsv, setGeneralModalitiesCsv] = useState('');
  const [generalExercisePlanCsv, setGeneralExercisePlanCsv] = useState('');
  const [generalPrognosis, setGeneralPrognosis] = useState('');

  const [generalNoteText, setGeneralNoteText] = useState('');
  const [physioTxPainLevel, setPhysioTxPainLevel] = useState('');
  const [physioTxTreatmentNotes, setPhysioTxTreatmentNotes] = useState('');
  const [physioTxProgressNotes, setPhysioTxProgressNotes] = useState('');

  const [prescriptionType, setPrescriptionType] = useState('PhysiotherapyPrescription');
  const [prescriptionStatus, setPrescriptionStatus] = useState<'Draft' | 'Final'>('Draft');
  const [physio, setPhysio] = useState<PhysiotherapyPrescriptionData>(createDefaultPhysiotherapyPrescription());

  const [frozenShoulderComplaint, setFrozenShoulderComplaint] = useState('');
  const [frozenShoulderDuration, setFrozenShoulderDuration] = useState('');
  const [frozenShoulderDurationUnit, setFrozenShoulderDurationUnit] = useState('Months');
  const [frozenShoulderComplaintSide, setFrozenShoulderComplaintSide] = useState('Right');
  const [frozenShoulderNatureOfPain, setFrozenShoulderNatureOfPain] = useState('Continuous');
  const [frozenShoulderSymptoms, setFrozenShoulderSymptoms] = useState('Improving');
  const [frozenShoulderOnset, setFrozenShoulderOnset] = useState('Gradual');
  const [frozenShoulderInjury, setFrozenShoulderInjury] = useState<'Yes' | 'No'>('No');
  const [frozenShoulderTypeOfInjury, setFrozenShoulderTypeOfInjury] = useState('Fall');
  const [frozenShoulderAggravatingFactor, setFrozenShoulderAggravatingFactor] = useState('Any Movement of Shoulder Joint');
  const [frozenShoulderRelievingFactor, setFrozenShoulderRelievingFactor] = useState('Rest');
  const [frozenShoulderNightPain, setFrozenShoulderNightPain] = useState('Increased');
  const [frozenShoulderSleepDisturbance, setFrozenShoulderSleepDisturbance] = useState<'Yes' | 'No'>('No');
  const [frozenShoulderNotes, setFrozenShoulderNotes] = useState('');
  const [frozenShoulderPainLevel, setFrozenShoulderPainLevel] = useState('');
  const [frozenShoulderRangeOfMotion, setFrozenShoulderRangeOfMotion] = useState('');
  const [frozenShoulderTreatmentPlan, setFrozenShoulderTreatmentPlan] = useState('');
  const [frozenShoulderExercises, setFrozenShoulderExercises] = useState('');
  const [frozenShoulderPrecautions, setFrozenShoulderPrecautions] = useState('');

  const [dentalDiagnosis, setDentalDiagnosis] = useState('');
  const [dentalClinicalExaminationCsv, setDentalClinicalExaminationCsv] = useState('');
  const [dentalInvestigationsCsv, setDentalInvestigationsCsv] = useState('');
  const [dentalTreatmentAdviceCsv, setDentalTreatmentAdviceCsv] = useState('');
  const [dentalMedicalHistoryCsv, setDentalMedicalHistoryCsv] = useState('');
  const [dentalMedicinesCsv, setDentalMedicinesCsv] = useState('');
  const [dentalAdditionalNotes, setDentalAdditionalNotes] = useState('');
  const [dentalFollowupDate, setDentalFollowupDate] = useState('');

  const [labSampleId, setLabSampleId] = useState('');
  const [labSampleType, setLabSampleType] = useState('');
  const [labCollectionDateTime, setLabCollectionDateTime] = useState('');
  const [labCollectionLocation, setLabCollectionLocation] = useState('');
  const [labCollectionMethod, setLabCollectionMethod] = useState('');
  const [labCollectedBy, setLabCollectedBy] = useState('');
  const [labReportDate, setLabReportDate] = useState('');
  const [labCollectionNotes, setLabCollectionNotes] = useState('');
  const [labAdditionalNotes, setLabAdditionalNotes] = useState('');
  const [labSelectedTestsCsv, setLabSelectedTestsCsv] = useState('');
  const [labTests, setLabTests] = useState<LabTestInput[]>([]);

  const [drawingName, setDrawingName] = useState('');
  const [drawingJson, setDrawingJson] = useState<string>(JSON.stringify({ version: 'mobile-1', background: '#ffffff', strokes: [] }));
  const isEditing = Boolean(editingRecord);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const templateFromEdit = mapEditingRecordToTemplate(editingRecord);
    const resolvedTemplate = isEditing ? templateFromEdit : template;
    const prescriptionPayload = (editingRecord?.prescription?.detailedPrescription as unknown as Record<string, unknown>) ?? {};
    const notePayload = (editingRecord?.clinicalNote?.notePayload as Record<string, unknown>) ?? {};
    const generalPastHistory = asRecord(prescriptionPayload.pastHistory);
    const generalExamination = asRecord(prescriptionPayload.examination);
    const generalSpecialTests = asRecord(prescriptionPayload.specialTests);
    const generalFunctionalAssessment = asRecord(prescriptionPayload.functionalAssessment);
    const generalManagementPlan = asRecord(prescriptionPayload.managementPlan);
    const frozenChiefComplaint = asRecord(prescriptionPayload.chiefComplaint);
    const frozenPastHistory = asRecord(prescriptionPayload.pastHistory);
    const frozenExamination = asRecord(prescriptionPayload.examination);
    const frozenSpecialTests = asRecord(prescriptionPayload.specialTests);
    const frozenFunctionalAssessment = asRecord(prescriptionPayload.functionalAssessment);
    const frozenManagementPlan = asRecord(prescriptionPayload.managementPlan);

    if (resolvedTemplate !== template) {
      return;
    }

    setErrorMessage(null);

    setGeneralRxComplaint(asText(prescriptionPayload.complaint));
    setGeneralRxDiagnosis(asText(prescriptionPayload.diagnosis));
    setGeneralRxMedicines(asText(prescriptionPayload.medicines));
    setGeneralRxTests(asText(prescriptionPayload.tests));
    setGeneralRxAdditionalNotes(asText(prescriptionPayload.additionalNotes));
    setGeneralRxFollowupDate(asText(prescriptionPayload.followupDate));
    setGeneralPastHtn((asText(generalPastHistory.htn) as 'Yes' | 'No') || 'No');
    setGeneralPastDm2((asText(generalPastHistory.dm2) as 'Yes' | 'No') || 'No');
    setGeneralPastHypothyroidism((asText(generalPastHistory.hypothyroidism) as 'Yes' | 'No') || 'No');
    setGeneralRxHistory(asText(generalPastHistory.rxHistory));
    setGeneralExamSide(asText(generalExamination.examSide) || 'Right');
    setGeneralSwelling((asText(generalExamination.swelling) as 'Yes' | 'No') || 'No');
    setGeneralMuscleWasting((asText(generalExamination.muscleWasting) as 'Yes' | 'No') || 'No');
    setGeneralNeuroDeficit((asText(generalExamination.neuroDeficit) as 'Yes' | 'No') || 'No');
    setGeneralNeuroDeficitType(asText(generalExamination.neuroDeficitType) || 'Motor');
    setGeneralCapsularPattern((asText(generalExamination.capsularPattern) as 'Yes' | 'No') || 'No');
    setGeneralMuscleTightness((asText(generalExamination.muscleTightness) as 'Yes' | 'No') || 'No');
    setGeneralMusclesInvolvedCsv(toCsv(asStringArray(generalExamination.musclesInvolved)));
    setGeneralTendernessCsv(toCsv(asStringArray(generalExamination.tendernessOn)));
    setGeneralMusclePower(asText(generalExamination.musclePower) || 'Decreased due to pain');
    setGeneralGripPinch(asText(generalExamination.gripPinch) || 'Strong');
    setGeneralTone(asText(generalExamination.tone) || 'Normal');
    setGeneralCoordination(asText(generalExamination.coordination) || 'Good');
    setGeneralThumbDropTest(asText(generalSpecialTests.thumpDropTest) || 'Negative');
    setGeneralPainfulArcTest(asText(generalSpecialTests.painfulArcTest) || 'Negative');
    setGeneralAdl(asText(generalFunctionalAssessment.adl) || 'Independent');
    setGeneralDifficultiesCsv(toCsv(asStringArray(generalFunctionalAssessment.difficulties)));
    setGeneralModalitiesCsv(toCsv(asStringArray(generalManagementPlan.modalities)));
    setGeneralExercisePlanCsv(toCsv(asStringArray(generalManagementPlan.exercisePlan)));
    setGeneralPrognosis(asText(generalManagementPlan.prognosis));

    setGeneralNoteText(editingRecord?.clinicalNote?.noteText ?? asText(notePayload.generalNotes));
    setPhysioTxPainLevel(asText(notePayload.painLevel));
    setPhysioTxTreatmentNotes(asText(notePayload.treatmentNotes) || editingRecord?.clinicalNote?.noteText || '');
    setPhysioTxProgressNotes(asText(notePayload.progressNotes));

    setPrescriptionType(editingRecord?.prescription?.prescriptionType ?? 'PhysiotherapyPrescription');
    setPrescriptionStatus((editingRecord?.prescription?.status as 'Draft' | 'Final') ?? 'Draft');
    const mergedPhysio = mergePhysio(createDefaultPhysiotherapyPrescription(), editingRecord?.prescription?.detailedPrescription);
    const treatmentMethodsSet = new Set(asStringArray(notePayload.treatmentMethods).map((item) => item.toLowerCase()));
    setPhysio({
      ...mergedPhysio,
      treatmentMethods: mergedPhysio.treatmentMethods.map((item) =>
        treatmentMethodsSet.size > 0 ? { ...item, selected: treatmentMethodsSet.has(item.value.toLowerCase()) } : item
      ),
    });

    setFrozenShoulderComplaint(asText(prescriptionPayload.complaint));
    setFrozenShoulderComplaintSide(asText(frozenChiefComplaint.complaintSide) || 'Right');
    setFrozenShoulderDuration(asText(frozenChiefComplaint.durationValue) || asText(prescriptionPayload.duration));
    setFrozenShoulderDurationUnit(asText(frozenChiefComplaint.durationUnit) || 'Months');
    setFrozenShoulderNatureOfPain(asText(frozenChiefComplaint.natureOfPain) || 'Continuous');
    setFrozenShoulderSymptoms(asText(frozenChiefComplaint.symptoms) || 'Improving');
    setFrozenShoulderOnset(asText(frozenChiefComplaint.onset) || 'Gradual');
    setFrozenShoulderInjury((asText(frozenChiefComplaint.injury) as 'Yes' | 'No') || 'No');
    setFrozenShoulderTypeOfInjury(asText(frozenChiefComplaint.typeOfInjury) || 'Fall');
    setFrozenShoulderAggravatingFactor(asText(frozenChiefComplaint.aggravatingFactor) || 'Any Movement of Shoulder Joint');
    setFrozenShoulderRelievingFactor(asText(frozenChiefComplaint.relievingFactor) || 'Rest');
    setFrozenShoulderNightPain(asText(frozenChiefComplaint.nightPain) || 'Increased');
    setFrozenShoulderSleepDisturbance((asText(frozenChiefComplaint.sleepDisturbance) as 'Yes' | 'No') || 'No');
    setFrozenShoulderNotes(asText(frozenChiefComplaint.notes));
    setFrozenShoulderPainLevel(asText(prescriptionPayload.painLevel));
    setFrozenShoulderRangeOfMotion(asText(prescriptionPayload.rangeOfMotion) || asText(frozenExamination.notes));
    setFrozenShoulderTreatmentPlan(asText(prescriptionPayload.treatmentPlan));
    setFrozenShoulderExercises(asText(prescriptionPayload.exercises));
    setFrozenShoulderPrecautions(asText(prescriptionPayload.precautions));

    setDentalDiagnosis(asText(prescriptionPayload.diagnosis));
    setDentalClinicalExaminationCsv(toCsv(asStringArray(prescriptionPayload.clinicalExamination)));
    setDentalInvestigationsCsv(toCsv(asStringArray(prescriptionPayload.investigations)));
    setDentalTreatmentAdviceCsv(toCsv(asStringArray(prescriptionPayload.treatmentAdvice)));
    setDentalMedicalHistoryCsv(toCsv(asStringArray(prescriptionPayload.medicalHistory)));
    setDentalMedicinesCsv(toCsv(asStringArray(prescriptionPayload.medicines)));
    setDentalAdditionalNotes(asText(prescriptionPayload.additionalNotes));
    setDentalFollowupDate(asText(prescriptionPayload.followupDate));

    setLabSampleId(asText(prescriptionPayload.sampleId));
    setLabSampleType(asText(prescriptionPayload.sampleType));
    setLabCollectionDateTime(asText(prescriptionPayload.sampleCollectionDateTime));
    setLabCollectionLocation(asText(prescriptionPayload.sampleCollectionLocation));
    setLabCollectionMethod(asText(prescriptionPayload.sampleCollectionMethod));
    setLabCollectedBy(asText(prescriptionPayload.sampleCollectionPerformedBy));
    setLabReportDate(asText(prescriptionPayload.sampleCollectionReportDate));
    setLabCollectionNotes(asText(prescriptionPayload.sampleCollectionNotes));
    setLabAdditionalNotes(asText(prescriptionPayload.additionalNotes));
    const parsedLabTests = (Array.isArray(prescriptionPayload.tests) ? prescriptionPayload.tests : [])
      .map((item, index) => normalizeLabTest(item, index))
      .filter((item) => item.testName || item.parameters.length > 0);
    setLabTests(parsedLabTests);
    setLabSelectedTestsCsv(toCsv(parsedLabTests.map((item) => item.testName).filter(Boolean)));

    setDrawingName(editingRecord?.drawing?.name ?? '');
    setDrawingJson(editingRecord?.drawing?.diagramJson ?? JSON.stringify({ version: 'mobile-1', background: '#ffffff', strokes: [] }));
  }, [editingRecord, isEditing, template, visible]);

  const closeModal = () => {
    setErrorMessage(null);
    onClose();
  };


  const updatePhysioField = <K extends keyof PhysiotherapyPrescriptionData>(key: K, value: PhysiotherapyPrescriptionData[K]) => {
    setPhysio((previousValue) => ({ ...previousValue, [key]: value }));
  };

  const toggleSelectable = (
    key: 'medicalHistoryConditions' | 'painTypes' | 'treatmentMethods',
    value: string
  ) => {
    setPhysio((previousValue) => ({
      ...previousValue,
      [key]: previousValue[key].map((item) => (item.value === value ? { ...item, selected: !item.selected } : item)),
    }));
  };

  const addLabTestsFromCsv = () => {
    const names = fromCsv(labSelectedTestsCsv);

    if (names.length === 0) {
      return;
    }

    setLabTests((previousValue) => {
      const existing = new Set(previousValue.map((item) => item.testName.toLowerCase()).filter(Boolean));
      const nextValue = [...previousValue];

      names.forEach((name) => {
        const normalizedName = name.toLowerCase();

        if (existing.has(normalizedName)) {
          return;
        }

        nextValue.push({
          testId: `MOB-${nextValue.length + 1}`,
          testName: name,
          referenceText: '',
          parameters: [],
        });
        existing.add(normalizedName);
      });

      return nextValue;
    });
  };

  const updateLabTestField = (index: number, key: keyof Omit<LabTestInput, 'parameters'>, value: string) => {
    setLabTests((previousValue) =>
      previousValue.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value,
            }
          : item
      )
    );
  };

  const removeLabTest = (index: number) => {
    setLabTests((previousValue) => previousValue.filter((_, itemIndex) => itemIndex !== index));
  };

  const addLabParameter = (testIndex: number) => {
    setLabTests((previousValue) =>
      previousValue.map((item, itemIndex) =>
        itemIndex === testIndex
          ? {
              ...item,
              parameters: [...item.parameters, createEmptyLabParameter(item.parameters.length)],
            }
          : item
      )
    );
  };

  const removeLabParameter = (testIndex: number, parameterIndex: number) => {
    setLabTests((previousValue) =>
      previousValue.map((item, itemIndex) =>
        itemIndex === testIndex
          ? {
              ...item,
              parameters: item.parameters.filter((_, currentParameterIndex) => currentParameterIndex !== parameterIndex),
            }
          : item
      )
    );
  };

  const updateLabParameterField = (
    testIndex: number,
    parameterIndex: number,
    key: keyof LabParameterInput,
    value: string | boolean
  ) => {
    setLabTests((previousValue) =>
      previousValue.map((item, itemIndex) =>
        itemIndex === testIndex
          ? {
              ...item,
              parameters: item.parameters.map((parameter, currentParameterIndex) =>
                currentParameterIndex === parameterIndex
                  ? {
                      ...parameter,
                      [key]: value,
                    }
                  : parameter
              ),
            }
          : item
      )
    );
  };

  const saveRecord = async () => {
    if (!serviceId) {
      setErrorMessage('Service is not selected.');
      return;
    }

    setErrorMessage(null);
    setSaving(true);

    try {
      if (selectedTemplate === 'generalRx') {
        const payload = {
          complaint: generalRxComplaint.trim(),
          diagnosis: generalRxDiagnosis.trim(),
          medicines: generalRxMedicines.trim(),
          tests: generalRxTests.trim(),
          additionalNotes: generalRxAdditionalNotes.trim(),
          followupDate: generalRxFollowupDate.trim(),
          pastHistory: {
            htn: generalPastHtn,
            dm2: generalPastDm2,
            hypothyroidism: generalPastHypothyroidism,
            rxHistory: generalRxHistory.trim(),
          },
          examination: {
            examSide: generalExamSide,
            swelling: generalSwelling,
            muscleWasting: generalMuscleWasting,
            neuroDeficit: generalNeuroDeficit,
            neuroDeficitType: generalNeuroDeficitType.trim(),
            capsularPattern: generalCapsularPattern,
            muscleTightness: generalMuscleTightness,
            musclesInvolved: fromCsv(generalMusclesInvolvedCsv),
            tendernessOn: fromCsv(generalTendernessCsv),
            rom: DEFAULT_ROM_TEMPLATE,
            musclePower: generalMusclePower.trim(),
            gripPinch: generalGripPinch.trim(),
            tone: generalTone.trim(),
            coordination: generalCoordination.trim(),
          },
          specialTests: {
            thumpDropTest: generalThumbDropTest.trim(),
            painfulArcTest: generalPainfulArcTest.trim(),
          },
          functionalAssessment: {
            adl: generalAdl.trim(),
            difficulties: fromCsv(generalDifficultiesCsv),
          },
          managementPlan: {
            modalities: fromCsv(generalModalitiesCsv),
            exercisePlan: fromCsv(generalExercisePlanCsv),
            prognosis: generalPrognosis.trim(),
          },
        };

        const hasGeneralContent = Boolean(
          payload.complaint ||
            payload.diagnosis ||
            payload.medicines ||
            payload.tests ||
            payload.additionalNotes ||
            payload.followupDate ||
            payload.pastHistory.rxHistory ||
            payload.examination.musclesInvolved.length ||
            payload.examination.tendernessOn.length ||
            payload.functionalAssessment.difficulties.length ||
            payload.managementPlan.modalities.length ||
            payload.managementPlan.exercisePlan.length ||
            payload.managementPlan.prognosis
        );

        if (!hasGeneralContent) {
          setErrorMessage('Please provide at least one General Rx field.');
          return;
        }

        if (isEditing && editingRecord?.id) {
          await updatePrescriptionRecord(token, editingRecord.id, prescriptionStatus, payload);
        } else {
          await addPrescriptionRecord(token, {
            serviceId,
            prescriptionType: PRESCRIPTION_TYPE_VALUE.generalRx,
            status: prescriptionStatus,
            detailedPrescription: payload,
          });
        }
      }

      if (selectedTemplate === 'physiotherapyRx') {
        if (!physio.complaint.trim() && !physio.treatmentPlan.trim() && !physio.painLevelNotes.trim()) {
          setErrorMessage('Please provide at least complaint, treatment plan, or pain notes.');
          return;
        }

        const normalizedPhysio: PhysiotherapyPrescriptionData = {
          ...physio,
          painTypeNotes: physio.painTypeNotes ?? physio.paintTypeNotes ?? '',
          paintTypeNotes: physio.paintTypeNotes ?? physio.painTypeNotes ?? '',
        };

        if (isEditing && editingRecord?.id) {
          await updatePrescriptionRecord(token, editingRecord.id, prescriptionStatus, normalizedPhysio as unknown as Record<string, unknown>);
        } else {
          await addPrescriptionRecord(token, {
            serviceId,
            prescriptionType: PRESCRIPTION_TYPE_VALUE.physiotherapyRx,
            status: prescriptionStatus,
            detailedPrescription: normalizedPhysio as unknown as Record<string, unknown>,
          });
        }
      }

      if (selectedTemplate === 'frozenShoulderRx') {
        const payload = {
          complaint: frozenShoulderComplaint.trim(),
          duration: frozenShoulderDuration.trim(),
          painLevel: frozenShoulderPainLevel.trim(),
          rangeOfMotion: frozenShoulderRangeOfMotion.trim(),
          treatmentPlan: frozenShoulderTreatmentPlan.trim(),
          exercises: frozenShoulderExercises.trim(),
          precautions: frozenShoulderPrecautions.trim(),
          chiefComplaint: {
            complaintSide: frozenShoulderComplaintSide,
            durationValue: frozenShoulderDuration.trim(),
            durationUnit: frozenShoulderDurationUnit,
            natureOfPain: frozenShoulderNatureOfPain,
            symptoms: frozenShoulderSymptoms,
            onset: frozenShoulderOnset,
            injury: frozenShoulderInjury,
            typeOfInjury: frozenShoulderTypeOfInjury.trim(),
            aggravatingFactor: frozenShoulderAggravatingFactor.trim(),
            relievingFactor: frozenShoulderRelievingFactor.trim(),
            nightPain: frozenShoulderNightPain.trim(),
            sleepDisturbance: frozenShoulderSleepDisturbance,
            notes: frozenShoulderNotes.trim(),
          },
          pastHistory: {
            htn: generalPastHtn,
            dm2: generalPastDm2,
            hypothyroidism: generalPastHypothyroidism,
            rxHistory: generalRxHistory.trim(),
            notes: frozenShoulderNotes.trim(),
          },
          examination: {
            examSide: generalExamSide,
            swelling: generalSwelling,
            muscleWasting: generalMuscleWasting,
            neuroDeficit: generalNeuroDeficit,
            neuroDeficitType: generalNeuroDeficitType.trim(),
            capsularPattern: generalCapsularPattern,
            muscleTightness: generalMuscleTightness,
            musclesInvolved: fromCsv(generalMusclesInvolvedCsv),
            tendernessOn: fromCsv(generalTendernessCsv),
            rom: DEFAULT_ROM_TEMPLATE,
            musclePower: generalMusclePower.trim(),
            gripPinch: generalGripPinch.trim(),
            tone: generalTone.trim(),
            coordination: generalCoordination.trim(),
            notes: frozenShoulderRangeOfMotion.trim(),
          },
          specialTests: {
            thumpDropTest: generalThumbDropTest.trim(),
            painfulArcTest: generalPainfulArcTest.trim(),
            notes: frozenShoulderNotes.trim(),
          },
          functionalAssessment: {
            adl: generalAdl.trim(),
            difficulties: fromCsv(generalDifficultiesCsv),
            notes: frozenShoulderNotes.trim(),
          },
          managementPlan: {
            modalities: fromCsv(generalModalitiesCsv),
            exercisePlan: fromCsv(generalExercisePlanCsv),
            prognosis: generalPrognosis.trim() || frozenShoulderTreatmentPlan.trim(),
          },
        };

        const hasFrozenContent = Boolean(
          payload.complaint ||
            payload.duration ||
            payload.painLevel ||
            payload.rangeOfMotion ||
            payload.treatmentPlan ||
            payload.exercises ||
            payload.precautions ||
            payload.chiefComplaint.notes ||
            payload.chiefComplaint.durationValue ||
            payload.chiefComplaint.typeOfInjury ||
            payload.chiefComplaint.aggravatingFactor ||
            payload.chiefComplaint.relievingFactor ||
            payload.examination.musclesInvolved.length ||
            payload.examination.tendernessOn.length ||
            payload.functionalAssessment.difficulties.length ||
            payload.managementPlan.modalities.length ||
            payload.managementPlan.exercisePlan.length ||
            payload.managementPlan.prognosis
        );

        if (!hasFrozenContent) {
          setErrorMessage('Please provide at least one Frozen Shoulder Rx field.');
          return;
        }

        if (isEditing && editingRecord?.id) {
          await updatePrescriptionRecord(token, editingRecord.id, prescriptionStatus, payload);
        } else {
          await addPrescriptionRecord(token, {
            serviceId,
            prescriptionType: PRESCRIPTION_TYPE_VALUE.frozenShoulderRx,
            status: prescriptionStatus,
            detailedPrescription: payload,
          });
        }
      }

      if (selectedTemplate === 'dentalRx') {
        const payload = {
          diagnosis: dentalDiagnosis.trim(),
          clinicalExamination: fromCsv(dentalClinicalExaminationCsv),
          investigations: fromCsv(dentalInvestigationsCsv),
          treatmentAdvice: fromCsv(dentalTreatmentAdviceCsv),
          medicalHistory: fromCsv(dentalMedicalHistoryCsv),
          medicines: fromCsv(dentalMedicinesCsv),
          additionalNotes: dentalAdditionalNotes.trim(),
          followupDate: dentalFollowupDate.trim(),
        };

        const hasDentalContent = Boolean(
          payload.diagnosis ||
            payload.clinicalExamination.length ||
            payload.investigations.length ||
            payload.treatmentAdvice.length ||
            payload.medicalHistory.length ||
            payload.medicines.length ||
            payload.additionalNotes ||
            payload.followupDate
        );

        if (!hasDentalContent) {
          setErrorMessage('Please provide at least one Dental Rx field.');
          return;
        }

        if (isEditing && editingRecord?.id) {
          await updatePrescriptionRecord(token, editingRecord.id, prescriptionStatus, payload);
        } else {
          await addPrescriptionRecord(token, {
            serviceId,
            prescriptionType: PRESCRIPTION_TYPE_VALUE.dentalRx,
            status: prescriptionStatus,
            detailedPrescription: payload,
          });
        }
      }

      if (selectedTemplate === 'labReport') {
        const normalizedLabTests = labTests
          .map((item, index) => ({
            testId: item.testId.trim() || `MOB-${index + 1}`,
            testName: item.testName.trim(),
            referenceText: item.referenceText.trim(),
            parameters: item.parameters
              .map((parameter, parameterIndex) => ({
                selected: parameter.selected,
                parameterId: parameter.parameterId.trim() || `P-${parameterIndex + 1}`,
                parameterName: parameter.parameterName.trim(),
                resultValue: parameter.resultValue.trim(),
                unit: parameter.unit.trim(),
                lowerLimit: parameter.lowerLimit.trim(),
                upperLimit: parameter.upperLimit.trim(),
                status: parameter.status.trim() || 'Normal',
                notes: parameter.notes.trim(),
              }))
              .filter(
                (parameter) =>
                  parameter.parameterName || parameter.resultValue || parameter.unit || parameter.lowerLimit || parameter.upperLimit || parameter.notes
              ),
          }))
          .filter((item) => item.testName || item.parameters.length > 0);

        const fallbackTests = fromCsv(labSelectedTestsCsv).map((testName, index) => ({
          testId: `MOB-${index + 1}`,
          testName,
          referenceText: '',
          parameters: [],
        }));

        const tests = normalizedLabTests.length > 0 ? normalizedLabTests : fallbackTests;

        const payload = {
          sampleId: labSampleId.trim(),
          sampleType: labSampleType.trim(),
          sampleCollectionDateTime: labCollectionDateTime.trim(),
          sampleCollectionLocation: labCollectionLocation.trim(),
          sampleCollectionMethod: labCollectionMethod.trim(),
          sampleCollectionPerformedBy: labCollectedBy.trim(),
          sampleCollectionReportDate: labReportDate.trim(),
          sampleCollectionNotes: labCollectionNotes.trim(),
          additionalNotes: labAdditionalNotes.trim(),
          tests,
        };

        const hasLabContent = Boolean(
          payload.sampleId ||
            payload.sampleType ||
            payload.sampleCollectionDateTime ||
            payload.sampleCollectionLocation ||
            payload.sampleCollectionMethod ||
            payload.sampleCollectionPerformedBy ||
            payload.sampleCollectionReportDate ||
            payload.sampleCollectionNotes ||
            payload.additionalNotes ||
            payload.tests.length
        );

        if (!hasLabContent) {
          setErrorMessage('Please provide at least one Lab Report field.');
          return;
        }

        if (isEditing && editingRecord?.id) {
          await updatePrescriptionRecord(token, editingRecord.id, prescriptionStatus, payload);
        } else {
          await addPrescriptionRecord(token, {
            serviceId,
            prescriptionType: PRESCRIPTION_TYPE_VALUE.labReport,
            status: prescriptionStatus,
            detailedPrescription: payload,
          });
        }
      }

      if (selectedTemplate === 'generalNotes') {
        const noteText = generalNoteText.trim();

        if (!noteText) {
          setErrorMessage('Please enter general notes.');
          return;
        }

        const notePayload = {
          text: noteText,
          generalNotes: noteText,
        };

        if (isEditing && editingRecord?.id) {
          await updateClinicalNote(token, editingRecord.id, noteText, 'General', notePayload);
        } else {
          await addClinicalNote(token, {
            serviceId,
            noteText,
            noteType: 'General',
            notePayload,
          });
        }
      }

      if (selectedTemplate === 'physiotherapyTxNotes') {
        const selectedTreatmentMethods = physio.treatmentMethods
          .filter((item) => item.selected)
          .map((item) => item.value);

        const payload = {
          painLevel: physioTxPainLevel.trim(),
          treatmentMethods: selectedTreatmentMethods,
          treatmentNotes: physioTxTreatmentNotes.trim(),
          progressNotes: physioTxProgressNotes.trim(),
          text: physioTxTreatmentNotes.trim(),
          generalNotes: physioTxTreatmentNotes.trim(),
        };

        if (!payload.treatmentNotes && !payload.progressNotes && !payload.painLevel && payload.treatmentMethods.length === 0) {
          setErrorMessage('Please provide at least one Physiotherapy Tx Notes field.');
          return;
        }

        if (isEditing && editingRecord?.id) {
          await updateClinicalNote(token, editingRecord.id, payload.treatmentNotes || payload.progressNotes, 'PhysiotherapyTreatment', payload);
        } else {
          await addClinicalNote(token, {
            serviceId,
            noteText: payload.treatmentNotes || payload.progressNotes,
            noteType: 'PhysiotherapyTreatment',
            notePayload: payload,
          });
        }
      }

      if (selectedTemplate === 'diagram') {
        if (!drawingName.trim()) {
          setErrorMessage('Please provide a drawing name.');
          return;
        }

        if (isEditing && editingRecord?.id) {
          await updateDrawingRecord(token, editingRecord.id, drawingName.trim(), drawingJson);
        } else {
          await addDrawingRecord(token, {
            serviceId,
            name: drawingName.trim(),
            diagramJson: drawingJson,
          });
        }
      }

      onSaved(toRecordType(mapTemplateToRecordType(selectedTemplate)));
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={closeModal}>
      <View style={allStyles.modalScreen}>
        <View style={allStyles.modalHeader}>
          <Text style={allStyles.modalTitle}>{isEditing ? 'Edit Record' : 'Add Record'}</Text>
          <Pressable onPress={closeModal}>
            <Text style={allStyles.closeText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={allStyles.modalBody}>
          {errorMessage ? <Text style={allStyles.errorText}>{errorMessage}</Text> : null}

          {selectedTemplate === 'generalRx' ? (
            <>
              <Text style={allStyles.label}>Status</Text>
              <View style={allStyles.typeRow}>
                {STATUS_VALUES.map((status) => (
                  <Pressable
                    key={status}
                    style={[allStyles.typeChip, prescriptionStatus === status ? allStyles.typeChipActive : null]}
                    onPress={() => setPrescriptionStatus(status)}
                  >
                    <Text style={[allStyles.typeChipText, prescriptionStatus === status ? allStyles.typeChipTextActive : null]}>{status}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Chief Complaint</Text>
              <SpeechEnabledMultilineInput value={generalRxComplaint} onChangeText={setGeneralRxComplaint} numberOfLines={3} />

              <Text style={allStyles.label}>Past History (HTN/DM2/Hypothyroidism)</Text>
              <View style={allStyles.typeRow}>
                {YES_NO_VALUES.map((item) => (
                  <Pressable key={`htn-${item}`} style={[allStyles.typeChip, generalPastHtn === item ? allStyles.typeChipActive : null]} onPress={() => setGeneralPastHtn(item as 'Yes' | 'No')}>
                    <Text style={[allStyles.typeChipText, generalPastHtn === item ? allStyles.typeChipTextActive : null]}>HTN {item}</Text>
                  </Pressable>
                ))}
                {YES_NO_VALUES.map((item) => (
                  <Pressable key={`dm2-${item}`} style={[allStyles.typeChip, generalPastDm2 === item ? allStyles.typeChipActive : null]} onPress={() => setGeneralPastDm2(item as 'Yes' | 'No')}>
                    <Text style={[allStyles.typeChipText, generalPastDm2 === item ? allStyles.typeChipTextActive : null]}>DM2 {item}</Text>
                  </Pressable>
                ))}
                {YES_NO_VALUES.map((item) => (
                  <Pressable
                    key={`hypo-${item}`}
                    style={[allStyles.typeChip, generalPastHypothyroidism === item ? allStyles.typeChipActive : null]}
                    onPress={() => setGeneralPastHypothyroidism(item as 'Yes' | 'No')}
                  >
                    <Text style={[allStyles.typeChipText, generalPastHypothyroidism === item ? allStyles.typeChipTextActive : null]}>Hypothyroidism {item}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Rx History</Text>
              <SpeechEnabledMultilineInput value={generalRxHistory} onChangeText={setGeneralRxHistory} numberOfLines={2} />

              <Text style={allStyles.label}>Examination Side</Text>
              <View style={allStyles.typeRow}>
                {SIDE_VALUES.map((side) => (
                  <Pressable key={side} style={[allStyles.typeChip, generalExamSide === side ? allStyles.typeChipActive : null]} onPress={() => setGeneralExamSide(side)}>
                    <Text style={[allStyles.typeChipText, generalExamSide === side ? allStyles.typeChipTextActive : null]}>{side}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Exam Flags</Text>
              <View style={allStyles.typeRow}>
                {YES_NO_VALUES.map((item) => (
                  <Pressable key={`swelling-${item}`} style={[allStyles.typeChip, generalSwelling === item ? allStyles.typeChipActive : null]} onPress={() => setGeneralSwelling(item as 'Yes' | 'No')}>
                    <Text style={[allStyles.typeChipText, generalSwelling === item ? allStyles.typeChipTextActive : null]}>Swelling {item}</Text>
                  </Pressable>
                ))}
                {YES_NO_VALUES.map((item) => (
                  <Pressable key={`wasting-${item}`} style={[allStyles.typeChip, generalMuscleWasting === item ? allStyles.typeChipActive : null]} onPress={() => setGeneralMuscleWasting(item as 'Yes' | 'No')}>
                    <Text style={[allStyles.typeChipText, generalMuscleWasting === item ? allStyles.typeChipTextActive : null]}>Wasting {item}</Text>
                  </Pressable>
                ))}
                {YES_NO_VALUES.map((item) => (
                  <Pressable key={`neuro-${item}`} style={[allStyles.typeChip, generalNeuroDeficit === item ? allStyles.typeChipActive : null]} onPress={() => setGeneralNeuroDeficit(item as 'Yes' | 'No')}>
                    <Text style={[allStyles.typeChipText, generalNeuroDeficit === item ? allStyles.typeChipTextActive : null]}>Neuro Deficit {item}</Text>
                  </Pressable>
                ))}
                {YES_NO_VALUES.map((item) => (
                  <Pressable key={`caps-${item}`} style={[allStyles.typeChip, generalCapsularPattern === item ? allStyles.typeChipActive : null]} onPress={() => setGeneralCapsularPattern(item as 'Yes' | 'No')}>
                    <Text style={[allStyles.typeChipText, generalCapsularPattern === item ? allStyles.typeChipTextActive : null]}>Capsular Pattern {item}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Neuro Deficit Type</Text>
              <TextInput value={generalNeuroDeficitType} onChangeText={setGeneralNeuroDeficitType} style={allStyles.input} placeholder="Motor / Sensory" />

              <Text style={allStyles.label}>Muscles Involved (comma separated)</Text>
              <TextInput value={generalMusclesInvolvedCsv} onChangeText={setGeneralMusclesInvolvedCsv} style={allStyles.input} placeholder="e.g. Deltoid, Supraspinatus" />

              <Text style={allStyles.label}>Tenderness On (comma separated)</Text>
              <TextInput value={generalTendernessCsv} onChangeText={setGeneralTendernessCsv} style={allStyles.input} placeholder="e.g. AC Joint, Bicipital Groove" />

              <Text style={allStyles.label}>Diagnosis</Text>
              <SpeechEnabledMultilineInput value={generalRxDiagnosis} onChangeText={setGeneralRxDiagnosis} numberOfLines={3} />

              <Text style={allStyles.label}>Medicines</Text>
              <SpeechEnabledMultilineInput value={generalRxMedicines} onChangeText={setGeneralRxMedicines} numberOfLines={4} />

              <Text style={allStyles.label}>Tests</Text>
              <SpeechEnabledMultilineInput value={generalRxTests} onChangeText={setGeneralRxTests} numberOfLines={3} />

              <Text style={allStyles.label}>Additional Notes</Text>
              <SpeechEnabledMultilineInput value={generalRxAdditionalNotes} onChangeText={setGeneralRxAdditionalNotes} numberOfLines={3} />

              <Text style={allStyles.label}>Functional Assessment (ADL)</Text>
              <TextInput value={generalAdl} onChangeText={setGeneralAdl} style={allStyles.input} placeholder="Independent / Assisted" />

              <Text style={allStyles.label}>Functional Difficulties (comma separated)</Text>
              <TextInput value={generalDifficultiesCsv} onChangeText={setGeneralDifficultiesCsv} style={allStyles.input} placeholder="e.g. Overhead reach, Sleeping" />

              <Text style={allStyles.label}>Modalities (comma separated)</Text>
              <TextInput value={generalModalitiesCsv} onChangeText={setGeneralModalitiesCsv} style={allStyles.input} placeholder="e.g. IFT, US" />

              <Text style={allStyles.label}>Exercise Plan (comma separated)</Text>
              <TextInput value={generalExercisePlanCsv} onChangeText={setGeneralExercisePlanCsv} style={allStyles.input} placeholder="e.g. Pendulum, Wall crawl" />

              <Text style={allStyles.label}>Prognosis</Text>
              <SpeechEnabledMultilineInput value={generalPrognosis} onChangeText={setGeneralPrognosis} numberOfLines={2} />

              <Text style={allStyles.label}>Follow-up Date</Text>
              <TextInput value={generalRxFollowupDate} onChangeText={setGeneralRxFollowupDate} style={allStyles.input} placeholder="YYYY-MM-DD" />
            </>
          ) : null}

          {selectedTemplate === 'physiotherapyRx' ? (
            <>
              <Text style={allStyles.label}>Status</Text>
              <View style={allStyles.typeRow}>
                <Pressable
                  style={[allStyles.typeChip, prescriptionStatus === 'Draft' ? allStyles.typeChipActive : null]}
                  onPress={() => setPrescriptionStatus('Draft')}
                >
                  <Text style={[allStyles.typeChipText, prescriptionStatus === 'Draft' ? allStyles.typeChipTextActive : null]}>Draft</Text>
                </Pressable>
                <Pressable
                  style={[allStyles.typeChip, prescriptionStatus === 'Final' ? allStyles.typeChipActive : null]}
                  onPress={() => setPrescriptionStatus('Final')}
                >
                  <Text style={[allStyles.typeChipText, prescriptionStatus === 'Final' ? allStyles.typeChipTextActive : null]}>Final</Text>
                </Pressable>
              </View>

              <Text style={allStyles.label}>Chief Complaint</Text>
              <SpeechEnabledMultilineInput
                value={physio.complaint}
                onChangeText={(value) => updatePhysioField('complaint', value)}
                numberOfLines={3}
              />

              <Text style={allStyles.label}>Medical History</Text>
              <View style={allStyles.typeRow}>
                {physio.medicalHistoryConditions.map((item) => (
                  <Pressable
                    key={item.value}
                    style={[allStyles.typeChip, item.selected ? allStyles.typeChipActive : null]}
                    onPress={() => toggleSelectable('medicalHistoryConditions', item.value)}
                  >
                    <Text style={[allStyles.typeChipText, item.selected ? allStyles.typeChipTextActive : null]}>{item.displayValue}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Medical History Notes</Text>
              <SpeechEnabledMultilineInput
                value={physio.medicalHistoryNotes}
                onChangeText={(value) => updatePhysioField('medicalHistoryNotes', value)}
                numberOfLines={3}
              />

              <Text style={allStyles.label}>Surgery Details</Text>
              <SpeechEnabledMultilineInput
                value={physio.surgeryDetails}
                onChangeText={(value) => updatePhysioField('surgeryDetails', value)}
                numberOfLines={3}
              />

              <Text style={allStyles.label}>Pain Level (0-10)</Text>
              <TextInput
                value={`${physio.painLevel}`}
                onChangeText={(value) => updatePhysioField('painLevel', Number(value) || 0)}
                keyboardType="numeric"
                style={allStyles.input}
              />

              <Text style={allStyles.label}>Pain Types</Text>
              <View style={allStyles.typeRow}>
                {physio.painTypes.map((item) => (
                  <Pressable
                    key={item.value}
                    style={[allStyles.typeChip, item.selected ? allStyles.typeChipActive : null]}
                    onPress={() => toggleSelectable('painTypes', item.value)}
                  >
                    <Text style={[allStyles.typeChipText, item.selected ? allStyles.typeChipTextActive : null]}>{item.displayValue}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Pain Notes</Text>
              <SpeechEnabledMultilineInput
                value={physio.painTypeNotes ?? physio.paintTypeNotes ?? ''}
                onChangeText={(value) => {
                  updatePhysioField('painTypeNotes', value);
                  updatePhysioField('paintTypeNotes', value);
                }}
                numberOfLines={3}
              />

              <Text style={allStyles.label}>Range Of Motion</Text>
              <SpeechEnabledMultilineInput
                value={physio.rangeOfMotion}
                onChangeText={(value) => updatePhysioField('rangeOfMotion', value)}
                numberOfLines={2}
              />

              <Text style={allStyles.label}>Muscle Strength</Text>
              <SpeechEnabledMultilineInput
                value={physio.muscleStrength}
                onChangeText={(value) => updatePhysioField('muscleStrength', value)}
                numberOfLines={2}
              />

              <Text style={allStyles.label}>Muscle Tightness</Text>
              <SpeechEnabledMultilineInput
                value={physio.muscleTightness}
                onChangeText={(value) => updatePhysioField('muscleTightness', value)}
                numberOfLines={2}
              />

              <Text style={allStyles.label}>Special Tests</Text>
              <SpeechEnabledMultilineInput
                value={physio.specialTests}
                onChangeText={(value) => updatePhysioField('specialTests', value)}
                numberOfLines={2}
              />

              <Text style={allStyles.label}>Treatment Plan</Text>
              <SpeechEnabledMultilineInput
                value={physio.treatmentPlan}
                onChangeText={(value) => updatePhysioField('treatmentPlan', value)}
                numberOfLines={3}
              />

              <Text style={allStyles.label}>Treatment Methods</Text>
              <View style={allStyles.typeRow}>
                {physio.treatmentMethods.map((item) => (
                  <Pressable
                    key={item.value}
                    style={[allStyles.typeChip, item.selected ? allStyles.typeChipActive : null]}
                    onPress={() => toggleSelectable('treatmentMethods', item.value)}
                  >
                    <Text style={[allStyles.typeChipText, item.selected ? allStyles.typeChipTextActive : null]}>{item.displayValue}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Suggested Sessions</Text>
              <TextInput
                value={physio.suggestedSessions}
                onChangeText={(value) => updatePhysioField('suggestedSessions', value)}
                style={allStyles.input}
              />

              <Text style={allStyles.label}>Short Term Goals</Text>
              <SpeechEnabledMultilineInput
                value={physio.shortTermTreatmentGoals}
                onChangeText={(value) => updatePhysioField('shortTermTreatmentGoals', value)}
                numberOfLines={3}
              />

              <Text style={allStyles.label}>Long Term Goals</Text>
              <SpeechEnabledMultilineInput
                value={physio.longTermTreatmentGoals}
                onChangeText={(value) => updatePhysioField('longTermTreatmentGoals', value)}
                numberOfLines={3}
              />

              <Text style={allStyles.label}>Do's and Don'ts</Text>
              <SpeechEnabledMultilineInput
                value={physio.dosDonts}
                onChangeText={(value) => updatePhysioField('dosDonts', value)}
                numberOfLines={3}
              />
            </>
          ) : null}

          {selectedTemplate === 'frozenShoulderRx' ? (
            <>
              <Text style={allStyles.label}>Status</Text>
              <View style={allStyles.typeRow}>
                {STATUS_VALUES.map((status) => (
                  <Pressable
                    key={`frozen-${status}`}
                    style={[allStyles.typeChip, prescriptionStatus === status ? allStyles.typeChipActive : null]}
                    onPress={() => setPrescriptionStatus(status)}
                  >
                    <Text style={[allStyles.typeChipText, prescriptionStatus === status ? allStyles.typeChipTextActive : null]}>{status}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Complaint</Text>
              <SpeechEnabledMultilineInput value={frozenShoulderComplaint} onChangeText={setFrozenShoulderComplaint} numberOfLines={3} />

              <Text style={allStyles.label}>Complaint Side</Text>
              <View style={allStyles.typeRow}>
                {SIDE_VALUES.map((side) => (
                  <Pressable
                    key={`frozen-side-${side}`}
                    style={[allStyles.typeChip, frozenShoulderComplaintSide === side ? allStyles.typeChipActive : null]}
                    onPress={() => setFrozenShoulderComplaintSide(side)}
                  >
                    <Text style={[allStyles.typeChipText, frozenShoulderComplaintSide === side ? allStyles.typeChipTextActive : null]}>{side}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Duration</Text>
              <TextInput value={frozenShoulderDuration} onChangeText={setFrozenShoulderDuration} style={allStyles.input} placeholder="e.g. 3 months" />

              <Text style={allStyles.label}>Duration Unit</Text>
              <TextInput value={frozenShoulderDurationUnit} onChangeText={setFrozenShoulderDurationUnit} style={allStyles.input} placeholder="Days/Weeks/Months" />

              <Text style={allStyles.label}>Nature Of Pain</Text>
              <View style={allStyles.typeRow}>
                {PAIN_NATURE_VALUES.map((item) => (
                  <Pressable
                    key={`nature-${item}`}
                    style={[allStyles.typeChip, frozenShoulderNatureOfPain === item ? allStyles.typeChipActive : null]}
                    onPress={() => setFrozenShoulderNatureOfPain(item)}
                  >
                    <Text style={[allStyles.typeChipText, frozenShoulderNatureOfPain === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Onset</Text>
              <View style={allStyles.typeRow}>
                {ONSET_VALUES.map((item) => (
                  <Pressable key={`onset-${item}`} style={[allStyles.typeChip, frozenShoulderOnset === item ? allStyles.typeChipActive : null]} onPress={() => setFrozenShoulderOnset(item)}>
                    <Text style={[allStyles.typeChipText, frozenShoulderOnset === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Injury</Text>
              <View style={allStyles.typeRow}>
                {YES_NO_VALUES.map((item) => (
                  <Pressable key={`injury-${item}`} style={[allStyles.typeChip, frozenShoulderInjury === item ? allStyles.typeChipActive : null]} onPress={() => setFrozenShoulderInjury(item as 'Yes' | 'No')}>
                    <Text style={[allStyles.typeChipText, frozenShoulderInjury === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Type Of Injury</Text>
              <TextInput value={frozenShoulderTypeOfInjury} onChangeText={setFrozenShoulderTypeOfInjury} style={allStyles.input} placeholder="e.g. Fall" />

              <Text style={allStyles.label}>Aggravating Factor</Text>
              <SpeechEnabledMultilineInput value={frozenShoulderAggravatingFactor} onChangeText={setFrozenShoulderAggravatingFactor} numberOfLines={2} />

              <Text style={allStyles.label}>Relieving Factor</Text>
              <SpeechEnabledMultilineInput value={frozenShoulderRelievingFactor} onChangeText={setFrozenShoulderRelievingFactor} numberOfLines={2} />

              <Text style={allStyles.label}>Night Pain</Text>
              <TextInput value={frozenShoulderNightPain} onChangeText={setFrozenShoulderNightPain} style={allStyles.input} placeholder="Increased/Decreased" />

              <Text style={allStyles.label}>Sleep Disturbance</Text>
              <View style={allStyles.typeRow}>
                {YES_NO_VALUES.map((item) => (
                  <Pressable key={`sleep-${item}`} style={[allStyles.typeChip, frozenShoulderSleepDisturbance === item ? allStyles.typeChipActive : null]} onPress={() => setFrozenShoulderSleepDisturbance(item as 'Yes' | 'No')}>
                    <Text style={[allStyles.typeChipText, frozenShoulderSleepDisturbance === item ? allStyles.typeChipTextActive : null]}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Notes</Text>
              <SpeechEnabledMultilineInput value={frozenShoulderNotes} onChangeText={setFrozenShoulderNotes} numberOfLines={2} />

              <Text style={allStyles.label}>Pain Level</Text>
              <TextInput value={frozenShoulderPainLevel} onChangeText={setFrozenShoulderPainLevel} style={allStyles.input} keyboardType="numeric" placeholder="0-10" />

              <Text style={allStyles.label}>Range Of Motion</Text>
              <SpeechEnabledMultilineInput value={frozenShoulderRangeOfMotion} onChangeText={setFrozenShoulderRangeOfMotion} numberOfLines={2} />

              <Text style={allStyles.label}>Treatment Plan</Text>
              <SpeechEnabledMultilineInput value={frozenShoulderTreatmentPlan} onChangeText={setFrozenShoulderTreatmentPlan} numberOfLines={3} />

              <Text style={allStyles.label}>Exercises</Text>
              <SpeechEnabledMultilineInput value={frozenShoulderExercises} onChangeText={setFrozenShoulderExercises} numberOfLines={3} />

              <Text style={allStyles.label}>Precautions</Text>
              <SpeechEnabledMultilineInput value={frozenShoulderPrecautions} onChangeText={setFrozenShoulderPrecautions} numberOfLines={3} />
            </>
          ) : null}

          {selectedTemplate === 'dentalRx' ? (
            <>
              <Text style={allStyles.label}>Status</Text>
              <View style={allStyles.typeRow}>
                {STATUS_VALUES.map((status) => (
                  <Pressable
                    key={`dental-${status}`}
                    style={[allStyles.typeChip, prescriptionStatus === status ? allStyles.typeChipActive : null]}
                    onPress={() => setPrescriptionStatus(status)}
                  >
                    <Text style={[allStyles.typeChipText, prescriptionStatus === status ? allStyles.typeChipTextActive : null]}>{status}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Diagnosis</Text>
              <SpeechEnabledMultilineInput value={dentalDiagnosis} onChangeText={setDentalDiagnosis} numberOfLines={3} />

              <Text style={allStyles.label}>Clinical Examination (comma separated)</Text>
              <TextInput value={dentalClinicalExaminationCsv} onChangeText={setDentalClinicalExaminationCsv} style={allStyles.input} placeholder="e.g. Caries UL6, Tenderness" />

              <Text style={allStyles.label}>Investigations (comma separated)</Text>
              <TextInput value={dentalInvestigationsCsv} onChangeText={setDentalInvestigationsCsv} style={allStyles.input} placeholder="e.g. OPG, RVG" />

              <Text style={allStyles.label}>Treatment Advice (comma separated)</Text>
              <TextInput value={dentalTreatmentAdviceCsv} onChangeText={setDentalTreatmentAdviceCsv} style={allStyles.input} placeholder="e.g. RCT, Scaling" />

              <Text style={allStyles.label}>Medical History (comma separated)</Text>
              <TextInput value={dentalMedicalHistoryCsv} onChangeText={setDentalMedicalHistoryCsv} style={allStyles.input} placeholder="e.g. Diabetes, Hypertension" />

              <Text style={allStyles.label}>Medicines (comma separated)</Text>
              <TextInput value={dentalMedicinesCsv} onChangeText={setDentalMedicinesCsv} style={allStyles.input} placeholder="e.g. Amoxicillin 500mg" />

              <Text style={allStyles.label}>Additional Notes</Text>
              <SpeechEnabledMultilineInput value={dentalAdditionalNotes} onChangeText={setDentalAdditionalNotes} numberOfLines={3} />

              <Text style={allStyles.label}>Follow-up Date</Text>
              <TextInput value={dentalFollowupDate} onChangeText={setDentalFollowupDate} style={allStyles.input} placeholder="YYYY-MM-DD" />
            </>
          ) : null}

          {selectedTemplate === 'labReport' ? (
            <>
              <Text style={allStyles.label}>Status</Text>
              <View style={allStyles.typeRow}>
                {STATUS_VALUES.map((status) => (
                  <Pressable
                    key={`lab-${status}`}
                    style={[allStyles.typeChip, prescriptionStatus === status ? allStyles.typeChipActive : null]}
                    onPress={() => setPrescriptionStatus(status)}
                  >
                    <Text style={[allStyles.typeChipText, prescriptionStatus === status ? allStyles.typeChipTextActive : null]}>{status}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Sample ID</Text>
              <TextInput value={labSampleId} onChangeText={setLabSampleId} style={allStyles.input} placeholder="Sample identifier" />

              <Text style={allStyles.label}>Sample Type</Text>
              <TextInput value={labSampleType} onChangeText={setLabSampleType} style={allStyles.input} placeholder="Blood / Urine / etc" />

              <Text style={allStyles.label}>Collection Date Time</Text>
              <TextInput value={labCollectionDateTime} onChangeText={setLabCollectionDateTime} style={allStyles.input} placeholder="YYYY-MM-DD HH:mm" />

              <Text style={allStyles.label}>Collection Location</Text>
              <TextInput value={labCollectionLocation} onChangeText={setLabCollectionLocation} style={allStyles.input} placeholder="Lab / OPD / Ward" />

              <Text style={allStyles.label}>Collection Method</Text>
              <TextInput value={labCollectionMethod} onChangeText={setLabCollectionMethod} style={allStyles.input} placeholder="Venipuncture / Swab" />

              <Text style={allStyles.label}>Collected By</Text>
              <TextInput value={labCollectedBy} onChangeText={setLabCollectedBy} style={allStyles.input} placeholder="Technician name" />

              <Text style={allStyles.label}>Report Date</Text>
              <TextInput value={labReportDate} onChangeText={setLabReportDate} style={allStyles.input} placeholder="YYYY-MM-DD" />

              <Text style={allStyles.label}>Collection Notes</Text>
              <SpeechEnabledMultilineInput value={labCollectionNotes} onChangeText={setLabCollectionNotes} numberOfLines={3} />

              <Text style={allStyles.label}>Additional Notes</Text>
              <SpeechEnabledMultilineInput value={labAdditionalNotes} onChangeText={setLabAdditionalNotes} numberOfLines={3} />

              <Text style={allStyles.label}>Quick Add Tests (comma separated)</Text>
              <TextInput value={labSelectedTestsCsv} onChangeText={setLabSelectedTestsCsv} style={allStyles.input} placeholder="Hematology, Biochemistry" />
              <View style={allStyles.typeRow}>
                <Pressable style={allStyles.typeChip} onPress={addLabTestsFromCsv}>
                  <Text style={allStyles.typeChipText}>Add Tests</Text>
                </Pressable>
                <Pressable
                  style={allStyles.typeChip}
                  onPress={() =>
                    setLabTests((previousValue) => [
                      ...previousValue,
                      {
                        testId: `MOB-${previousValue.length + 1}`,
                        testName: '',
                        referenceText: '',
                        parameters: [],
                      },
                    ])
                  }
                >
                  <Text style={allStyles.typeChipText}>Add Empty Test</Text>
                </Pressable>
              </View>

              {labTests.length > 0 ? (
                <>
                  <Text style={allStyles.label}>Detailed Tests</Text>
                  {labTests.map((test, testIndex) => (
                    <View
                      key={`${test.testId}-${testIndex}`}
                      style={{ borderWidth: 1, borderColor: themeColors.border, borderRadius: 10, padding: 10, marginBottom: 10 }}
                    >
                      <View style={allStyles.typeRow}>
                        <Text style={[allStyles.label, { marginBottom: 0, flex: 1 }]}>Test {testIndex + 1}</Text>
                        <Pressable style={allStyles.typeChip} onPress={() => removeLabTest(testIndex)}>
                          <Text style={allStyles.typeChipText}>Remove</Text>
                        </Pressable>
                      </View>

                      <Text style={allStyles.label}>Test ID</Text>
                      <TextInput
                        value={test.testId}
                        onChangeText={(value) => updateLabTestField(testIndex, 'testId', value)}
                        style={allStyles.input}
                        placeholder="e.g. LT12345"
                      />

                      <Text style={allStyles.label}>Test Name</Text>
                      <TextInput
                        value={test.testName}
                        onChangeText={(value) => updateLabTestField(testIndex, 'testName', value)}
                        style={allStyles.input}
                        placeholder="e.g. Hematology"
                      />

                      <Text style={allStyles.label}>Reference Text</Text>
                      <SpeechEnabledMultilineInput
                        value={test.referenceText}
                        onChangeText={(value) => updateLabTestField(testIndex, 'referenceText', value)}
                        numberOfLines={3}
                      />

                      <View style={allStyles.typeRow}>
                        <Text style={[allStyles.label, { marginBottom: 0, flex: 1 }]}>Parameters</Text>
                        <Pressable style={allStyles.typeChip} onPress={() => addLabParameter(testIndex)}>
                          <Text style={allStyles.typeChipText}>Add Parameter</Text>
                        </Pressable>
                      </View>

                      {test.parameters.map((parameter, parameterIndex) => (
                        <View
                          key={`${parameter.parameterId}-${parameterIndex}`}
                          style={{ borderWidth: 1, borderColor: themeColors.border, borderRadius: 8, padding: 8, marginBottom: 8 }}
                        >
                          <View style={allStyles.typeRow}>
                            <Text style={[allStyles.label, { marginBottom: 0, flex: 1 }]}>Parameter {parameterIndex + 1}</Text>
                            <Pressable style={allStyles.typeChip} onPress={() => removeLabParameter(testIndex, parameterIndex)}>
                              <Text style={allStyles.typeChipText}>Remove</Text>
                            </Pressable>
                          </View>

                          <Text style={allStyles.label}>Name</Text>
                          <TextInput
                            value={parameter.parameterName}
                            onChangeText={(value) => updateLabParameterField(testIndex, parameterIndex, 'parameterName', value)}
                            style={allStyles.input}
                            placeholder="e.g. Hemoglobin"
                          />

                          <Text style={allStyles.label}>Result Value</Text>
                          <TextInput
                            value={parameter.resultValue}
                            onChangeText={(value) => updateLabParameterField(testIndex, parameterIndex, 'resultValue', value)}
                            style={allStyles.input}
                            placeholder="e.g. 13.5"
                          />

                          <Text style={allStyles.label}>Unit</Text>
                          <TextInput
                            value={parameter.unit}
                            onChangeText={(value) => updateLabParameterField(testIndex, parameterIndex, 'unit', value)}
                            style={allStyles.input}
                            placeholder="e.g. g/dL"
                          />

                          <Text style={allStyles.label}>Lower Limit</Text>
                          <TextInput
                            value={parameter.lowerLimit}
                            onChangeText={(value) => updateLabParameterField(testIndex, parameterIndex, 'lowerLimit', value)}
                            style={allStyles.input}
                            placeholder="e.g. 13.0"
                          />

                          <Text style={allStyles.label}>Upper Limit</Text>
                          <TextInput
                            value={parameter.upperLimit}
                            onChangeText={(value) => updateLabParameterField(testIndex, parameterIndex, 'upperLimit', value)}
                            style={allStyles.input}
                            placeholder="e.g. 17.0"
                          />

                          <Text style={allStyles.label}>Status</Text>
                          <TextInput
                            value={parameter.status}
                            onChangeText={(value) => updateLabParameterField(testIndex, parameterIndex, 'status', value)}
                            style={allStyles.input}
                            placeholder="Normal/High/Low"
                          />

                          <Text style={allStyles.label}>Notes</Text>
                          <SpeechEnabledMultilineInput
                            value={parameter.notes}
                            onChangeText={(value) => updateLabParameterField(testIndex, parameterIndex, 'notes', value)}
                            numberOfLines={2}
                          />

                          <Text style={allStyles.label}>Selected</Text>
                          <View style={allStyles.typeRow}>
                            <Pressable
                              style={[allStyles.typeChip, parameter.selected ? allStyles.typeChipActive : null]}
                              onPress={() => updateLabParameterField(testIndex, parameterIndex, 'selected', !parameter.selected)}
                            >
                              <Text style={[allStyles.typeChipText, parameter.selected ? allStyles.typeChipTextActive : null]}>
                                {parameter.selected ? 'Yes' : 'No'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </>
              ) : null}
            </>
          ) : null}

          {selectedTemplate === 'generalNotes' ? (
            <>
              <Text style={allStyles.label}>General Notes</Text>
              <SpeechEnabledMultilineInput value={generalNoteText} onChangeText={setGeneralNoteText} numberOfLines={6} placeholder="Add your note" />
            </>
          ) : null}

          {selectedTemplate === 'physiotherapyTxNotes' ? (
            <>
              <Text style={allStyles.label}>Pain Level</Text>
              <TextInput value={physioTxPainLevel} onChangeText={setPhysioTxPainLevel} style={allStyles.input} keyboardType="numeric" placeholder="0-10" />

              <Text style={allStyles.label}>Treatment Methods</Text>
              <View style={allStyles.typeRow}>
                {physio.treatmentMethods.map((item) => (
                  <Pressable
                    key={`tx-${item.value}`}
                    style={[allStyles.typeChip, item.selected ? allStyles.typeChipActive : null]}
                    onPress={() => toggleSelectable('treatmentMethods', item.value)}
                  >
                    <Text style={[allStyles.typeChipText, item.selected ? allStyles.typeChipTextActive : null]}>{item.displayValue}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={allStyles.label}>Treatment Notes</Text>
              <SpeechEnabledMultilineInput value={physioTxTreatmentNotes} onChangeText={setPhysioTxTreatmentNotes} numberOfLines={4} />

              <Text style={allStyles.label}>Progress Notes</Text>
              <SpeechEnabledMultilineInput value={physioTxProgressNotes} onChangeText={setPhysioTxProgressNotes} numberOfLines={4} />
            </>
          ) : null}

          {selectedTemplate === 'diagram' ? (
            <>
              <Text style={allStyles.label}>Drawing Name</Text>
              <TextInput value={drawingName} onChangeText={setDrawingName} style={allStyles.input} placeholder="Body map notes" />

              <Text style={allStyles.label}>Canvas</Text>
              <DrawingCanvasEditor initialJson={drawingJson} onChange={setDrawingJson} />
            </>
          ) : null}

          <Pressable
            style={[allStyles.filterButton, saving ? allStyles.disabledButton : null]}
            disabled={saving}
            onPress={() => void saveRecord()}
          >
            <Text style={allStyles.filterButtonText}>{saving ? 'Saving...' : isEditing ? 'Update Record' : 'Save Record'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
