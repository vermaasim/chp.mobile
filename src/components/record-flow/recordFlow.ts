import { PRESCRIPTION_TYPE_VALUE, type ScopedCreatableTemplateKey } from './recordTemplates';

export type RecordCreateOptionKey = ScopedCreatableTemplateKey | 'medicalRecord';

export interface RecordCreateOption {
  key: RecordCreateOptionKey;
  label: string;
  description: string;
}

const BASE_CREATE_OPTIONS: RecordCreateOption[] = [
  {
    key: 'generalRx',
    label: 'General Rx',
    description: 'Create a standard prescription with diagnosis, medicines, and follow-up.',
  },
  {
    key: 'physiotherapyRx',
    label: 'Physiotherapy Rx',
    description: 'Capture pain, movement, treatment plan, and physiotherapy guidance.',
  },
  {
    key: 'frozenShoulderRx',
    label: 'Frozen Shoulder Rx',
    description: 'Document frozen shoulder assessment, special tests, and management plan.',
  },
  {
    key: 'generalNotes',
    label: 'General Notes',
    description: 'Add free-text clinical notes for this service.',
  },
  {
    key: 'physiotherapyTxNotes',
    label: 'Physio Treatment Notes',
    description: 'Capture treatment-session progress and physiotherapy intervention notes.',
  },
  {
    key: 'diagram',
    label: 'Drawing',
    description: 'Create a clinical drawing or annotated sketch for the task.',
  },
  {
    key: 'medicalRecord',
    label: 'Medical Record',
    description: 'Attach scanned copies, photos, or video records.',
  },
];

export function getScopedCreateOptions(allowedPrescriptionTypes?: string[]) {
  const hasAllowedList = Boolean(allowedPrescriptionTypes && allowedPrescriptionTypes.length > 0);

  if (!hasAllowedList) {
    return BASE_CREATE_OPTIONS;
  }

  const allowedSet = new Set(allowedPrescriptionTypes);

  return BASE_CREATE_OPTIONS.filter((option) => {
    if (option.key === 'generalRx') {
      return allowedSet.has(PRESCRIPTION_TYPE_VALUE.generalRx);
    }

    if (option.key === 'physiotherapyRx') {
      return allowedSet.has(PRESCRIPTION_TYPE_VALUE.physiotherapyRx);
    }

    if (option.key === 'frozenShoulderRx') {
      return allowedSet.has(PRESCRIPTION_TYPE_VALUE.frozenShoulderRx);
    }

    return true;
  });
}
