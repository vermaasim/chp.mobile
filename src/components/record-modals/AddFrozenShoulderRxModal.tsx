import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';

type AddFrozenShoulderRxModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddFrozenShoulderRxModal(props: AddFrozenShoulderRxModalProps) {
  return <BaseRecordTemplateModal {...props} template="frozenShoulderRx" />;
}
