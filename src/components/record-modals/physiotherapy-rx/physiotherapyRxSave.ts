import type { PhysiotherapySelectableItem } from '../../../data/physiotherapy';

export type PhysiotherapyRxSaveInput = {
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

function normalizeSelectableItems(items: PhysiotherapySelectableItem[]) {
  return items.map((item) => ({
    value: item.value,
    selected: item.selected,
    displayValue: item.displayValue,
    additionalText: item.additionalText?.trim() || undefined,
  }));
}

export function buildPhysiotherapyRxPayload(input: PhysiotherapyRxSaveInput): Record<string, unknown> {
  const painTypeNotes = input.painTypeNotes.trim();

  return {
    complaint: input.complaint.trim(),
    medicalHistoryConditions: normalizeSelectableItems(input.medicalHistoryConditions),
    medicalHistoryNotes: input.medicalHistoryNotes.trim(),
    surgeryDetails: input.surgeryDetails.trim(),
    painLevel: input.painLevel,
    painLevelNotes: input.painLevelNotes.trim(),
    painTypes: normalizeSelectableItems(input.painTypes),
    painTypeNotes,
    paintTypeNotes: painTypeNotes,
    rangeOfMotion: input.rangeOfMotion.trim(),
    muscleStrength: input.muscleStrength.trim(),
    muscleTightness: input.muscleTightness.trim(),
    specialTests: input.specialTests.trim(),
    treatmentPlan: input.treatmentPlan.trim(),
    dosDonts: input.dosDonts.trim(),
    suggestedSessions: input.suggestedSessions.trim(),
    shortTermTreatmentGoals: input.shortTermTreatmentGoals.trim(),
    longTermTreatmentGoals: input.longTermTreatmentGoals.trim(),
    treatmentMethods: normalizeSelectableItems(input.treatmentMethods),
  };
}

export function hasPhysiotherapyRxContent(payload: Record<string, unknown>) {
  const hasSelectedItems = (items: unknown) =>
    Array.isArray(items) && items.some((item) => item && typeof item === 'object' && Boolean((item as Record<string, unknown>).selected));

  return Boolean(
    payload.complaint ||
      payload.medicalHistoryNotes ||
      payload.surgeryDetails ||
      (typeof payload.painLevel === 'number' && payload.painLevel > 0) ||
      payload.painLevelNotes ||
      payload.painTypeNotes ||
      payload.rangeOfMotion ||
      payload.muscleStrength ||
      payload.muscleTightness ||
      payload.specialTests ||
      payload.treatmentPlan ||
      payload.dosDonts ||
      payload.suggestedSessions ||
      payload.shortTermTreatmentGoals ||
      payload.longTermTreatmentGoals ||
      hasSelectedItems(payload.medicalHistoryConditions) ||
      hasSelectedItems(payload.painTypes) ||
      hasSelectedItems(payload.treatmentMethods)
  );
}