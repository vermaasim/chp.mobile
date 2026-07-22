import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';
import { useGeneralRxForm } from '../../hooks/forms/useGeneralRxForm';

type AddGeneralRxModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddGeneralRxModal(props: AddGeneralRxModalProps) {
  const generalRxBindings = useGeneralRxForm({
    visible: props.visible,
    editingRecord: props.editingRecord,
  });

  return <BaseRecordTemplateModal {...props} template="generalRx" generalRxBindings={generalRxBindings} />;
}
