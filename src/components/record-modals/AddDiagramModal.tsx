import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';

type AddDiagramModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddDiagramModal(props: AddDiagramModalProps) {
  return <BaseRecordTemplateModal {...props} template="diagram" />;
}
