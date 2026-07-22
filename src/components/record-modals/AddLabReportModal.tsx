import { BaseRecordTemplateModal, type AddRecordModalProps } from '../AddRecordModal';

type AddLabReportModalProps = Omit<AddRecordModalProps, 'template'>;

export function AddLabReportModal(props: AddLabReportModalProps) {
  return <BaseRecordTemplateModal {...props} template="labReport" />;
}
