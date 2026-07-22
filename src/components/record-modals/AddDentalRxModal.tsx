import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';

type AddDentalRxModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddDentalRxModal(props: AddDentalRxModalProps) {
  return <BaseRecordTemplateModal {...props} template="dentalRx" />;
}
