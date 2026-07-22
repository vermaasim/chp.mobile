import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';

type AddGeneralRxModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddGeneralRxModal(props: AddGeneralRxModalProps) {
  return <BaseRecordTemplateModal {...props} template="generalRx" />;
}
