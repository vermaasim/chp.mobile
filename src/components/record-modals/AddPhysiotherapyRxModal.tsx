import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';
import { usePhysiotherapyRxForm } from '../../hooks/forms/usePhysiotherapyRxForm';

type AddPhysiotherapyRxModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddPhysiotherapyRxModal(props: AddPhysiotherapyRxModalProps) {
  const physiotherapyRxBindings = usePhysiotherapyRxForm({
    visible: props.visible,
    editingRecord: props.editingRecord,
  });

  return <BaseRecordTemplateModal {...props} template="physiotherapyRx" physiotherapyRxBindings={physiotherapyRxBindings} />;
}
