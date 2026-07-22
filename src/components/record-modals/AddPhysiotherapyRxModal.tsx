import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';

type AddPhysiotherapyRxModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddPhysiotherapyRxModal(props: AddPhysiotherapyRxModalProps) {
  return <BaseRecordTemplateModal {...props} template="physiotherapyRx" />;
}
