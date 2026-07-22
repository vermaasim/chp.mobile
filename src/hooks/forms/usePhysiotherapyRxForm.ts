import { useEffect, useState } from 'react';
import type { EditableRecordState } from '../../components/AddRecordModal';
import { mapEditingRecordToTemplate } from '../../components/AddRecordModal';
import {
  createDefaultPhysiotherapyPrescription,
  mergePhysiotherapyPrescription,
} from '../../data/physiotherapy';

type PrescriptionStatus = 'Draft' | 'Final';

type UsePhysiotherapyRxFormParams = {
  visible: boolean;
  editingRecord?: EditableRecordState | null;
};

export function usePhysiotherapyRxForm({ visible, editingRecord }: UsePhysiotherapyRxFormParams) {
  const defaults = createDefaultPhysiotherapyPrescription();
  const [prescriptionStatus, setPrescriptionStatus] = useState<PrescriptionStatus>('Draft');
  const [physio, setPhysio] = useState(defaults);

  const updatePhysioField = <K extends keyof typeof physio>(key: K, value: (typeof physio)[K]) => {
    setPhysio((previousValue) => ({ ...previousValue, [key]: value }));
  };

  const toggleSelectable = (
    key: 'medicalHistoryConditions' | 'painTypes' | 'treatmentMethods',
    value: string
  ) => {
    setPhysio((previousValue) => ({
      ...previousValue,
      [key]: previousValue[key].map((item) =>
        item.value === value
          ? {
              ...item,
              selected: !item.selected,
            }
          : item
      ),
    }));
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    const resolvedTemplate = mapEditingRecordToTemplate(editingRecord);

    if (editingRecord && resolvedTemplate !== 'physiotherapyRx') {
      return;
    }

    setPrescriptionStatus((editingRecord?.prescription?.status as PrescriptionStatus) ?? 'Draft');
    setPhysio(mergePhysiotherapyPrescription(createDefaultPhysiotherapyPrescription(), editingRecord?.prescription?.detailedPrescription));
  }, [editingRecord, visible]);

  return {
    prescriptionStatus,
    setPrescriptionStatus,
    physio,
    updatePhysioField,
    toggleSelectable,
  };
}