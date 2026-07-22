import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';

type AddPhysiotherapyTxNotesModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddPhysiotherapyTxNotesModal(props: AddPhysiotherapyTxNotesModalProps) {
  return <BaseRecordTemplateModal {...props} template="physiotherapyTxNotes" />;
}
