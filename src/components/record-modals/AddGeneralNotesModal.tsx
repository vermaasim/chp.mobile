import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';

type AddGeneralNotesModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddGeneralNotesModal(props: AddGeneralNotesModalProps) {
  return <BaseRecordTemplateModal {...props} template="generalNotes" />;
}
