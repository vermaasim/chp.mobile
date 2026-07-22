import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { addMedicalRecord } from '../../api/records';
import { allStyles } from '../../styles/commonStyles';
import type { MedicalRecordUploadRequest } from '../../types/worklist';
import { SpeechEnabledMultilineInput } from '../SpeechEnabledMultilineInput';

const RECORD_TYPES = ['Document', 'LabReport', 'XRay', 'Photo', 'Video', 'Other'];

interface MedicalRecordUploadModalProps {
  visible: boolean;
  token: string;
  serviceId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function MedicalRecordUploadModal({ visible, token, serviceId, onClose, onSaved }: MedicalRecordUploadModalProps) {
  const [recordName, setRecordName] = useState('');
  const [recordType, setRecordType] = useState(RECORD_TYPES[0]);
  const [recordDate, setRecordDate] = useState(toIsoDate(new Date()));
  const [recordDescription, setRecordDescription] = useState('');
  const [recordFile, setRecordFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setRecordName('');
    setRecordType(RECORD_TYPES[0]);
    setRecordDate(toIsoDate(new Date()));
    setRecordDescription('');
    setRecordFile(null);
    setSaving(false);
    setErrorMessage(null);
  }, [visible]);

  const selectFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    setRecordFile(result.assets[0]);
  };

  const saveRecord = async () => {
    if (!serviceId) {
      setErrorMessage('Service is not selected.');
      return;
    }

    if (!recordName.trim() || !recordDate.trim() || !recordType.trim() || !recordFile) {
      setErrorMessage('Please complete all required fields and attach a file.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const payload: MedicalRecordUploadRequest = {
        availedServiceId: serviceId,
        name: recordName.trim(),
        recordDate: recordDate.trim(),
        recordType: recordType.trim(),
        description: recordDescription.trim() || undefined,
        fileUri: recordFile.uri,
        fileName: recordFile.name,
        mimeType: recordFile.mimeType ?? 'application/octet-stream',
      };

      await addMedicalRecord(token, payload);
      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save medical record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={allStyles.modalScreen}>
        <View style={allStyles.modalHeader}>
          <Text style={allStyles.modalTitle}>Add Medical Record</Text>
          <Pressable onPress={onClose}>
            <Text style={allStyles.closeText}>Close</Text>
          </Pressable>
        </View>

        <View style={allStyles.modalContent}>
          <ScrollView style={allStyles.modalScroll} contentContainerStyle={allStyles.modalBodyWithFooter}>
            {errorMessage ? <Text style={allStyles.errorText}>{errorMessage}</Text> : null}

          <Text style={allStyles.label}>Record Name</Text>
          <TextInput value={recordName} onChangeText={setRecordName} style={allStyles.input} placeholder="Record name" />

          <Text style={allStyles.label}>Record Date</Text>
          <TextInput value={recordDate} onChangeText={setRecordDate} style={allStyles.input} placeholder="YYYY-MM-DD" />

          <Text style={allStyles.label}>Record Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={allStyles.typeRow}>
            {RECORD_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[allStyles.typeChip, recordType === type ? allStyles.typeChipActive : null]}
                onPress={() => setRecordType(type)}
              >
                <Text style={[allStyles.typeChipText, recordType === type ? allStyles.typeChipTextActive : null]}>{type}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={allStyles.label}>Description</Text>
          <SpeechEnabledMultilineInput value={recordDescription} onChangeText={setRecordDescription} numberOfLines={4} placeholder="Optional notes" />

          <Pressable style={allStyles.secondaryActionButton} onPress={() => void selectFile()}>
            <Text style={allStyles.secondaryActionButtonText}>Choose File</Text>
          </Pressable>

          <Text style={allStyles.fileNameText}>{recordFile?.name ?? 'No file selected'}</Text>

          </ScrollView>

          <View style={allStyles.modalFooter}>
            <Pressable
              style={[allStyles.filterButton, allStyles.modalFooterButton, saving ? allStyles.disabledButton : null]}
              disabled={saving}
              onPress={() => void saveRecord()}
            >
              <Text style={allStyles.filterButtonText}>{saving ? 'Saving...' : 'Save Medical Record'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
