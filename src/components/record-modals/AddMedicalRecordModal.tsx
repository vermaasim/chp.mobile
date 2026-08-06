import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Aliased: a bare `File` import here would shadow the DOM File type module-wide.
import { File as FileSystemFile } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { addMedicalRecord } from '../../api/records';
import { allStyles } from '../../styles/commonStyles';
import type { MedicalRecordUploadRequest } from '../../types/worklist';
import { themeColors } from '../../theme/colors';
import { SpeechEnabledMultilineInput } from '../SpeechEnabledMultilineInput';

const RECORD_TYPES = ['Document', 'LabReport', 'XRay', 'Photo', 'Video', 'Other'];
const MAX_VIDEO_DURATION_MS = 60 * 1000;
const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024;

type AttachmentSource = 'cameraPhoto' | 'cameraVideo' | 'gallery' | 'filePicker';

interface SelectedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  durationMs?: number;
  /** Populated by the pickers on web only; undefined on native. */
  file?: Blob;
}

interface AddMedicalRecordModalProps {
  visible: boolean;
  token: string;
  facilityId: string;
  serviceId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getFileExtensionFromMime(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType === 'video/quicktime') return 'mov';
  if (mimeType === 'video/x-m4v') return 'm4v';

  const slashIndex = mimeType.lastIndexOf('/');
  if (slashIndex >= 0 && slashIndex < mimeType.length - 1) {
    return mimeType.slice(slashIndex + 1);
  }

  return 'bin';
}

function ensureFileName(name: string | null | undefined, mimeType: string, fallbackPrefix: string) {
  if (name?.trim()) {
    return name.trim();
  }

  const extension = getFileExtensionFromMime(mimeType);
  const stamp = Date.now();
  return `${fallbackPrefix}-${stamp}.${extension}`;
}

function inferMimeFromName(name: string | null | undefined) {
  const normalized = (name || '').toLowerCase();

  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.pdf')) return 'application/pdf';
  if (normalized.endsWith('.mp4')) return 'video/mp4';
  if (normalized.endsWith('.mov')) return 'video/quicktime';
  if (normalized.endsWith('.m4v')) return 'video/x-m4v';
  if (normalized.endsWith('.avi')) return 'video/x-msvideo';
  if (normalized.endsWith('.heic')) return 'image/heic';

  return 'application/octet-stream';
}

function isVideoMime(mimeType: string) {
  return mimeType.toLowerCase().startsWith('video/');
}

async function resolveFileSizeBytes(uri: string) {
  try {
    const file = new FileSystemFile(uri);
    const info = await file.info();
    if (typeof info.size === 'number' && Number.isFinite(info.size)) {
      return info.size;
    }
  } catch {
    // Fallback to undefined when metadata is not available.
  }

  return undefined;
}

async function requestCameraPermission() {
  const result = await ImagePicker.requestCameraPermissionsAsync();
  return result.granted;
}

async function requestMediaPermission() {
  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return result.granted;
}

export function AddMedicalRecordModal({
  visible,
  token,
  facilityId,
  serviceId,
  onClose,
  onSaved,
}: AddMedicalRecordModalProps) {
  const insets = useSafeAreaInsets();
  const [recordName, setRecordName] = useState('');
  const [recordType, setRecordType] = useState(RECORD_TYPES[0]);
  const [recordDate, setRecordDate] = useState(toIsoDate(new Date()));
  const [recordDescription, setRecordDescription] = useState('');
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setRecordName('');
    setRecordType(RECORD_TYPES[0]);
    setRecordDate(toIsoDate(new Date()));
    setRecordDescription('');
    setAttachment(null);
    setSaving(false);
    setErrorMessage(null);
    setPickerVisible(false);
  }, [visible]);

  const validateAttachment = (nextAttachment: SelectedAttachment) => {
    if (!isVideoMime(nextAttachment.mimeType)) {
      return null;
    }

    if (
      typeof nextAttachment.durationMs === 'number' &&
      Number.isFinite(nextAttachment.durationMs) &&
      nextAttachment.durationMs > MAX_VIDEO_DURATION_MS
    ) {
      return 'Video duration exceeds 60 seconds. Please select a shorter video.';
    }

    if (
      typeof nextAttachment.sizeBytes === 'number' &&
      Number.isFinite(nextAttachment.sizeBytes) &&
      nextAttachment.sizeBytes > MAX_VIDEO_SIZE_BYTES
    ) {
      return 'Video file exceeds 25 MB. Please choose a smaller file.';
    }

    return null;
  };

  const setAttachmentWithValidation = (nextAttachment: SelectedAttachment) => {
    const validationError = validateAttachment(nextAttachment);
    if (validationError) {
      setAttachment(null);
      setErrorMessage(validationError);
      return;
    }

    setAttachment(nextAttachment);
    setErrorMessage(null);
  };

  const pickFromFileSystem = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? inferMimeFromName(asset.name);
    const fileName = ensureFileName(asset.name, mimeType, 'medical-record-file');
    const sizeBytes = typeof asset.size === 'number' ? asset.size : await resolveFileSizeBytes(asset.uri);

    setAttachmentWithValidation({
      uri: asset.uri,
      name: fileName,
      mimeType,
      sizeBytes,
      file: asset.file,
    });
  };

  const pickFromGallery = async () => {
    const mediaGranted = await requestMediaPermission();
    if (!mediaGranted) {
      setErrorMessage('Media library permission is required to choose photos or videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
    const fileName = ensureFileName(asset.fileName, mimeType, 'medical-record-gallery');
    const sizeBytes = typeof asset.fileSize === 'number' ? asset.fileSize : await resolveFileSizeBytes(asset.uri);

    setAttachmentWithValidation({
      uri: asset.uri,
      name: fileName,
      mimeType,
      sizeBytes,
      durationMs: typeof asset.duration === 'number' ? asset.duration : undefined,
      file: asset.file,
    });
  };

  const captureWithCamera = async (source: Exclude<AttachmentSource, 'gallery' | 'filePicker'>) => {
    const cameraGranted = await requestCameraPermission();
    if (!cameraGranted) {
      setErrorMessage('Camera permission is required to capture photos or videos.');
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync({
      mediaTypes: source === 'cameraVideo' ? ['videos'] : ['images'],
      allowsEditing: false,
      quality: 1,
      ...(source === 'cameraVideo' ? { videoMaxDuration: 60 } : {}),
    });

    if (cameraResult.canceled || !cameraResult.assets?.[0]) {
      return;
    }

    const asset = cameraResult.assets[0];
    const mimeType =
      asset.mimeType ??
      (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
    const fileName = ensureFileName(asset.fileName, mimeType, source === 'cameraVideo' ? 'medical-record-video' : 'medical-record-photo');
    const sizeBytes = typeof asset.fileSize === 'number' ? asset.fileSize : await resolveFileSizeBytes(asset.uri);

    setAttachmentWithValidation({
      uri: asset.uri,
      name: fileName,
      mimeType,
      sizeBytes,
      durationMs: typeof asset.duration === 'number' ? asset.duration : undefined,
      file: asset.file,
    });
  };

  const handlePickSource = async (source: AttachmentSource) => {
    setPickerVisible(false);
    setErrorMessage(null);

    try {
      if (source === 'filePicker') {
        await pickFromFileSystem();
        return;
      }

      if (source === 'gallery') {
        await pickFromGallery();
        return;
      }

      await captureWithCamera(source);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to select attachment source.');
    }
  };

  const saveRecord = async () => {
    if (!serviceId) {
      setErrorMessage('Service is not selected.');
      return;
    }

    if (!recordName.trim() || !recordDate.trim() || !recordType.trim() || !attachment) {
      setErrorMessage('Please complete all required fields and attach a file.');
      return;
    }

    if (!attachment.uri?.trim()) {
      setErrorMessage('Selected attachment is invalid. Please choose the file again.');
      return;
    }

    const validationError = validateAttachment(attachment);
    if (validationError) {
      setErrorMessage(validationError);
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
        fileUri: attachment.uri,
        fileName: attachment.name,
        mimeType: attachment.mimeType,
        file: attachment.file,
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
          <ScrollView
            style={allStyles.modalScroll}
            contentContainerStyle={[
              allStyles.modalBodyWithFooter,
              { paddingBottom: Math.max(20, insets.bottom + 20) },
            ]}
          >
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
            <SpeechEnabledMultilineInput
              value={recordDescription}
              onChangeText={setRecordDescription}
              numberOfLines={4}
              placeholder="Optional notes"
              token={token}
              facilityId={facilityId}
              regenerationContext={{
                textType: 'other',
                clinicalContext: 'Medical record upload description.',
                styleHints: 'Brief professional clinical wording.',
              }}
            />

            <Text style={allStyles.label}>Attachment</Text>
            <Pressable style={allStyles.secondaryActionButton} onPress={() => setPickerVisible(true)}>
              <Feather name="camera" size={14} color={themeColors.textPrimary} />
              <Text style={allStyles.secondaryActionButtonText}>Choose source</Text>
            </Pressable>

            <Text style={allStyles.fileNameText}>{attachment?.name ?? 'No file selected'}</Text>
            {attachment && isVideoMime(attachment.mimeType) ? (
              <Text style={allStyles.fileNameText}>
                Max allowed: 60s and 25 MB
              </Text>
            ) : null}
          </ScrollView>

          <View style={[allStyles.modalFooter, { paddingBottom: Math.max(14, insets.bottom + 14) }]}> 
            <Pressable
              style={[allStyles.filterButton, allStyles.modalFooterButton, saving ? allStyles.disabledButton : null]}
              disabled={saving}
              onPress={() => void saveRecord()}
            >
              <Text style={allStyles.filterButtonText}>{saving ? 'Saving...' : 'Save Medical Record'}</Text>
            </Pressable>
          </View>
        </View>

        <Modal
          animationType="fade"
          visible={pickerVisible}
          transparent
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={allStyles.pickerModalOverlay}>
            <Pressable style={allStyles.pickerModalBackdrop} onPress={() => setPickerVisible(false)} />
            <View style={allStyles.pickerModalCard}>
              <Text style={allStyles.pickerModalTitle}>Select attachment source</Text>

              <Pressable style={allStyles.secondaryActionButton} onPress={() => void handlePickSource('cameraPhoto')}>
                <Text style={allStyles.secondaryActionButtonText}>Camera photo</Text>
              </Pressable>

              <Pressable style={[allStyles.secondaryActionButton, { marginTop: 8 }]} onPress={() => void handlePickSource('cameraVideo')}>
                <Text style={allStyles.secondaryActionButtonText}>Camera video</Text>
              </Pressable>

              <Pressable style={[allStyles.secondaryActionButton, { marginTop: 8 }]} onPress={() => void handlePickSource('gallery')}>
                <Text style={allStyles.secondaryActionButtonText}>Gallery</Text>
              </Pressable>

              <Pressable style={[allStyles.secondaryActionButton, { marginTop: 8 }]} onPress={() => void handlePickSource('filePicker')}>
                <Text style={allStyles.secondaryActionButtonText}>File system</Text>
              </Pressable>

              <View style={allStyles.pickerModalActions}>
                <Pressable style={allStyles.dialogCancelButton} onPress={() => setPickerVisible(false)}>
                  <Text style={allStyles.dialogCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
