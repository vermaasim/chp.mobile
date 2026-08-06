export type FrozenShoulderRomInputRow = {
  name: string;
  displayName: string;
  normal: string;
  left: string;
  right: string;
};

export type FrozenShoulderRxSaveInput = {
  complaint: string;
  duration: string;
  painLevel: string;
  rangeOfMotion: string;
  treatmentPlan: string;
  exercises: string;
  precautions: string;
  chiefComplaint: {
    complaintSide: string;
    durationValue: string;
    durationUnit: string;
    natureOfPain: string;
    symptoms: string;
    onset: string;
    injury: 'Yes' | 'No';
    typeOfInjury: string;
    aggravatingFactor: string;
    relievingFactor: string;
    nightPain: string;
    sleepDisturbance: 'Yes' | 'No';
    notes: string;
  };
  pastHistory: {
    htn: 'Yes' | 'No';
    dm2: 'Yes' | 'No';
    hypothyroidism: 'Yes' | 'No';
    rxHistory: string;
    notes: string;
  };
  examination: {
    examSide: string;
    swelling: 'Yes' | 'No';
    muscleWasting: 'Yes' | 'No';
    neuroDeficit: 'Yes' | 'No';
    neuroDeficitType: string;
    capsularPattern: 'Yes' | 'No';
    muscleTightness: 'Yes' | 'No';
    musclesInvolvedCsv: string;
    tendernessOnCsv: string;
    rom: FrozenShoulderRomInputRow[];
    musclePower: string;
    gripPinch: string;
    tone: string;
    coordination: string;
    notes: string;
  };
  specialTests: {
    thumbDropTest: string;
    painfulArcTest: string;
    notes: string;
  };
  functionalAssessment: {
    adl: string;
    difficultiesCsv: string;
    notes: string;
  };
  managementPlan: {
    modalitiesCsv: string;
    exercisePlanCsv: string;
    prognosis: string;
  };
};

function fromCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildFrozenShoulderRxPayload(input: FrozenShoulderRxSaveInput): Record<string, unknown> {
  const treatmentPlan = input.treatmentPlan.trim();

  return {
    complaint: input.complaint.trim(),
    duration: input.duration.trim(),
    painLevel: input.painLevel.trim(),
    rangeOfMotion: input.rangeOfMotion.trim(),
    treatmentPlan,
    exercises: input.exercises.trim(),
    precautions: input.precautions.trim(),
    chiefComplaint: {
      complaintSide: input.chiefComplaint.complaintSide,
      durationValue: input.chiefComplaint.durationValue.trim(),
      durationUnit: input.chiefComplaint.durationUnit.trim(),
      natureOfPain: input.chiefComplaint.natureOfPain,
      symptoms: input.chiefComplaint.symptoms,
      onset: input.chiefComplaint.onset,
      injury: input.chiefComplaint.injury,
      typeOfInjury: input.chiefComplaint.typeOfInjury.trim(),
      aggravatingFactor: input.chiefComplaint.aggravatingFactor.trim(),
      relievingFactor: input.chiefComplaint.relievingFactor.trim(),
      nightPain: input.chiefComplaint.nightPain.trim(),
      sleepDisturbance: input.chiefComplaint.sleepDisturbance,
      notes: input.chiefComplaint.notes.trim(),
    },
    pastHistory: {
      htn: input.pastHistory.htn,
      dm2: input.pastHistory.dm2,
      hypothyroidism: input.pastHistory.hypothyroidism,
      hypothyroid: input.pastHistory.hypothyroidism,
      rxHistory: input.pastHistory.rxHistory.trim(),
      notes: input.pastHistory.notes.trim(),
    },
    examination: {
      examSide: input.examination.examSide,
      swelling: input.examination.swelling,
      muscleWasting: input.examination.muscleWasting,
      neuroDeficit: input.examination.neuroDeficit,
      neuroDeficitType: input.examination.neuroDeficitType.trim(),
      capsularPattern: input.examination.capsularPattern,
      muscleTightness: input.examination.muscleTightness,
      musclesInvolved: fromCsv(input.examination.musclesInvolvedCsv),
      tendernessOn: fromCsv(input.examination.tendernessOnCsv),
      rom: input.examination.rom.map((item) => ({
        name: item.name,
        displayName: item.displayName,
        normal: item.normal.trim(),
        left: item.left.trim(),
        right: item.right.trim(),
      })),
      musclePower: input.examination.musclePower.trim(),
      gripPinch: input.examination.gripPinch.trim(),
      tone: input.examination.tone.trim(),
      coordination: input.examination.coordination.trim(),
      notes: input.examination.notes.trim(),
    },
    specialTests: {
      thumpDropTest: input.specialTests.thumbDropTest.trim(),
      thumbDropTest: input.specialTests.thumbDropTest.trim(),
      painfulArcTest: input.specialTests.painfulArcTest.trim(),
      notes: input.specialTests.notes.trim(),
    },
    functionalAssessment: {
      adl: input.functionalAssessment.adl.trim(),
      difficulties: fromCsv(input.functionalAssessment.difficultiesCsv),
      notes: input.functionalAssessment.notes.trim(),
    },
    managementPlan: {
      modalities: fromCsv(input.managementPlan.modalitiesCsv),
      exercisePlan: fromCsv(input.managementPlan.exercisePlanCsv),
      prognosis: input.managementPlan.prognosis.trim() || treatmentPlan,
    },
  };
}

export function hasFrozenShoulderRxContent(payload: Record<string, unknown>) {
  const chiefComplaint = (payload.chiefComplaint ?? {}) as Record<string, unknown>;
  const examination = (payload.examination ?? {}) as Record<string, unknown>;
  const functionalAssessment = (payload.functionalAssessment ?? {}) as Record<string, unknown>;
  const managementPlan = (payload.managementPlan ?? {}) as Record<string, unknown>;
  const rom = Array.isArray(examination.rom) ? examination.rom : [];

  return Boolean(
    payload.complaint ||
      payload.duration ||
      payload.painLevel ||
      payload.rangeOfMotion ||
      payload.treatmentPlan ||
      payload.exercises ||
      payload.precautions ||
      chiefComplaint.notes ||
      chiefComplaint.durationValue ||
      chiefComplaint.typeOfInjury ||
      chiefComplaint.aggravatingFactor ||
      chiefComplaint.relievingFactor ||
      rom.some((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return false;
        }

        const row = item as Record<string, unknown>;
        return Boolean(row.left || row.right);
      }) ||
      (Array.isArray(examination.musclesInvolved) && examination.musclesInvolved.length > 0) ||
      (Array.isArray(examination.tendernessOn) && examination.tendernessOn.length > 0) ||
      (Array.isArray(functionalAssessment.difficulties) && functionalAssessment.difficulties.length > 0) ||
      (Array.isArray(managementPlan.modalities) && managementPlan.modalities.length > 0) ||
      (Array.isArray(managementPlan.exercisePlan) && managementPlan.exercisePlan.length > 0) ||
      managementPlan.prognosis
  );
}
