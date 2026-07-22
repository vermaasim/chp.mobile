import type { ComponentProps } from 'react';
import { MedicalRecordUploadModal } from '../record-flow/MedicalRecordUploadModal';

export type AddMedicalRecordModalProps = ComponentProps<typeof MedicalRecordUploadModal>;

export function AddMedicalRecordModal(props: AddMedicalRecordModalProps) {
  return <MedicalRecordUploadModal {...props} />;
}
