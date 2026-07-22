export type RecordTemplateKey =
  | 'generalRx'
  | 'physiotherapyRx'
  | 'frozenShoulderRx'
  | 'dentalRx'
  | 'labReport'
  | 'generalNotes'
  | 'physiotherapyTxNotes'
  | 'diagram';

export const RECORD_TEMPLATE_LABELS: Record<RecordTemplateKey, string> = {
  generalRx: 'General Rx',
  physiotherapyRx: 'Physiotherapy Rx',
  frozenShoulderRx: 'Frozen Shoulder Rx',
  dentalRx: 'Dental Rx',
  labReport: 'Lab Report',
  generalNotes: 'General Notes',
  physiotherapyTxNotes: 'Physiotherapy Tx Notes',
  diagram: 'Diagram',
};

export const PRESCRIPTION_TYPE_VALUE = {
  generalRx: 'GeneralPrescription',
  physiotherapyRx: 'PhysiotherapyPrescription',
  frozenShoulderRx: 'FrozenShoulders',
  dentalRx: 'DentalPrescription',
  labReport: 'PathologyLabReport',
} as const;

export type ScopedCreatableTemplateKey =
  | 'generalRx'
  | 'physiotherapyRx'
  | 'frozenShoulderRx'
  | 'generalNotes'
  | 'physiotherapyTxNotes'
  | 'diagram';

export function getPrescriptionTemplateByType(type?: string): RecordTemplateKey | null {
  if (!type) {
    return null;
  }

  if (type === PRESCRIPTION_TYPE_VALUE.generalRx) return 'generalRx';
  if (type === PRESCRIPTION_TYPE_VALUE.physiotherapyRx) return 'physiotherapyRx';
  if (type === PRESCRIPTION_TYPE_VALUE.frozenShoulderRx) return 'frozenShoulderRx';
  if (type === PRESCRIPTION_TYPE_VALUE.dentalRx) return 'dentalRx';
  if (type === PRESCRIPTION_TYPE_VALUE.labReport) return 'labReport';

  return null;
}

export function isOutOfScopePrescriptionType(type?: string) {
  const template = getPrescriptionTemplateByType(type);
  return template === 'dentalRx' || template === 'labReport';
}
