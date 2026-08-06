import axios from 'axios';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import { API_BASE_URL } from './config';
import { uploadMedicalRecord } from './worklist';
import type { PhysiotherapyPrescriptionData } from '../data/physiotherapy';
import type { MedicalRecordUploadRequest, TaskDetailRecord } from '../types/worklist';

export type { PhysiotherapyPrescriptionData, PhysiotherapySelectableItem } from '../data/physiotherapy';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

function toFriendlyErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const responseData = error.response?.data;

  if (typeof responseData === 'string') {
    return responseData;
  }

  if (responseData && typeof responseData === 'object') {
    if ('message' in responseData && typeof responseData.message === 'string') {
      return responseData.message;
    }

    if ('title' in responseData && typeof responseData.title === 'string') {
      return responseData.title;
    }
  }

  return fallback;
}

function withAuth(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return `${value}`;
  }

  return undefined;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  return [];
}

function normalizePrescription(raw: Record<string, unknown>): TaskDetailRecord {
  return {
    id: asString(raw.id) ?? asString(raw.prescriptionId) ?? asString(raw.displayId) ?? `${Date.now()}`,
    displayId: asString(raw.displayId),
    status: asString(raw.status),
    name: asString(raw.name),
    prescriptionType: asString(raw.prescriptionType),
    createdByUserName: asString(raw.createdByUserName),
    lastModifiedByUserName: asString(raw.lastModifiedByUserName),
    createdOn: asString(raw.createdOn),
    lastModifiedOn: asString(raw.lastModifiedOn),
    sourceType: 'prescription',
  };
}

function normalizeClinicalNote(raw: Record<string, unknown>): TaskDetailRecord {
  return {
    id: asString(raw.id) ?? asString(raw.noteId) ?? asString(raw.displayId) ?? `${Date.now()}`,
    displayId: asString(raw.displayId),
    status: asString(raw.status),
    name: asString(raw.name),
    noteType: asString(raw.noteType),
    createdByUserName: asString(raw.createdByUserName),
    lastModifiedByUserName: asString(raw.lastModifiedByUserName),
    createdOn: asString(raw.createdOn),
    lastModifiedOn: asString(raw.lastModifiedOn),
    sourceType: 'clinicalnote',
  };
}

function normalizeDiagram(raw: Record<string, unknown>): TaskDetailRecord {
  return {
    id: asString(raw.id) ?? asString(raw.diagramId) ?? asString(raw.displayId) ?? `${Date.now()}`,
    diagramId: asString(raw.id) ?? asString(raw.diagramId),
    displayId: asString(raw.displayId),
    status: asString(raw.status),
    name: asString(raw.name),
    createdByUserName: asString(raw.createdByUserName),
    lastModifiedByUserName: asString(raw.lastModifiedByUserName),
    createdOn: asString(raw.createdOn),
    lastModifiedOn: asString(raw.lastModifiedOn),
    sourceType: 'drawing',
  };
}

function normalizeMedicalRecord(raw: Record<string, unknown>): TaskDetailRecord {
  return {
    id: asString(raw.id) ?? asString(raw.medicalRecordId) ?? asString(raw.displayId) ?? `${Date.now()}`,
    displayId: asString(raw.displayId),
    name: asString(raw.name),
    status: asString(raw.status),
    recordType: asString(raw.recordType),
    createdByUserName: asString(raw.createdByUserName) ?? asString(raw.uploadedBy),
    createdOn: asString(raw.createdOn),
    dateOfUpload: asString(raw.dateOfUpload),
    recordDateTime: asString(raw.recordDateTime) ?? asString(raw.recordDate),
    sourceType: 'medicalRecord',
  };
}

export async function loadServiceLinkedRecords(token: string, serviceId: string): Promise<TaskDetailRecord[]> {
  const requests = [
    apiClient.get(`/api/prescription/service/${serviceId}`, withAuth(token)),
    apiClient.get(`/api/clinicalnote/service/${serviceId}`, withAuth(token)),
    apiClient.get(`/api/diagram/all/${serviceId}`, withAuth(token)),
    apiClient.get(`/api/medicalrecord/getdocsmetadata/${serviceId}`, withAuth(token)),
  ] as const;

  const [prescriptionsResult, notesResult, diagramsResult, medicalResult] = await Promise.allSettled(requests);

  const allFailed = [prescriptionsResult, notesResult, diagramsResult, medicalResult].every(
    (item) => item.status === 'rejected'
  );

  if (allFailed) {
    throw new Error('Unable to load linked records.');
  }

  const prescriptions =
    prescriptionsResult.status === 'fulfilled'
      ? asArray<Record<string, unknown>>(prescriptionsResult.value.data).map(normalizePrescription)
      : [];

  const notes =
    notesResult.status === 'fulfilled'
      ? asArray<Record<string, unknown>>(notesResult.value.data).map(normalizeClinicalNote)
      : [];

  const diagrams =
    diagramsResult.status === 'fulfilled'
      ? asArray<Record<string, unknown>>(diagramsResult.value.data).map(normalizeDiagram)
      : [];

  const medicalRecords =
    medicalResult.status === 'fulfilled'
      ? asArray<Record<string, unknown>>(medicalResult.value.data).map(normalizeMedicalRecord)
      : [];

  return [...prescriptions, ...notes, ...diagrams, ...medicalRecords].sort((left, right) => {
    const leftDate = new Date(
      left.createdOn || left.lastModifiedOn || left.dateOfUpload || left.recordDateTime || 0
    ).getTime();
    const rightDate = new Date(
      right.createdOn || right.lastModifiedOn || right.dateOfUpload || right.recordDateTime || 0
    ).getTime();

    return rightDate - leftDate;
  });
}

export interface AddClinicalNoteRequest {
  serviceId: string;
  noteText: string;
  noteType: string;
  notePayload?: Record<string, unknown>;
}

export interface ClinicalNoteDetail {
  id: string;
  noteType?: string;
  status?: string;
  noteJson?: string;
  noteText?: string;
  notePayload?: Record<string, unknown>;
}

export async function addClinicalNote(token: string, request: AddClinicalNoteRequest): Promise<string | undefined> {
  try {
    const notePayload = request.notePayload ?? {
      generalNotes: request.noteText,
      text: request.noteText,
    };

    const response = await apiClient.post(
      '/api/clinicalNote',
      {
        availedServiceId: request.serviceId,
        noteJson: JSON.stringify(notePayload),
        noteType: request.noteType,
      },
      withAuth(token)
    );

    return asString(response.data);
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to save clinical note.'));
  }
}

export async function getClinicalNoteDetail(token: string, noteId: string): Promise<ClinicalNoteDetail> {
  try {
    const response = await apiClient.get(`/api/clinicalnote/${noteId}`, withAuth(token));
    const payload = (response.data ?? {}) as Record<string, unknown>;
    const parsed = safeParseJson<Record<string, unknown>>(asString(payload.noteJson));

    return {
      id: asString(payload.id) ?? asString(payload.noteId) ?? noteId,
      status: asString(payload.status),
      noteType: asString(payload.noteType),
      noteJson: asString(payload.noteJson),
      notePayload: parsed,
      noteText: asString(parsed?.text) ?? asString(parsed?.generalNotes) ?? '',
    };
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load clinical note.'));
  }
}

export async function updateClinicalNote(
  token: string,
  noteId: string,
  noteText: string,
  noteType?: string,
  notePayload?: Record<string, unknown>
): Promise<void> {
  try {
    const payload = notePayload ?? {
      text: noteText,
      generalNotes: noteText,
    };

    await apiClient.put(
      `/api/clinicalNote/${noteId}`,
      {
        noteId,
        noteType,
        noteJson: JSON.stringify(payload),
      },
      withAuth(token)
    );
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to update clinical note.'));
  }
}

export async function deleteClinicalNote(token: string, noteId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/clinicalNote/${noteId}`, withAuth(token));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to delete clinical note.'));
  }
}

export interface PrescriptionDetail {
  id: string;
  displayId?: string;
  status?: string;
  prescriptionType?: string;
  detailedPrescription?: PhysiotherapyPrescriptionData;
}

export interface AddPrescriptionRequest {
  serviceId: string;
  prescriptionType: string;
  status: 'Draft' | 'Final';
  detailedPrescription: Record<string, unknown>;
}

export async function addPrescriptionRecord(token: string, request: AddPrescriptionRequest): Promise<string | undefined> {
  try {
    const response = await apiClient.post(
      '/api/prescription',
      {
        availedServiceId: request.serviceId,
        detailedPrescription: JSON.stringify(request.detailedPrescription),
        status: request.status,
        prescriptionType: request.prescriptionType,
      },
      withAuth(token)
    );

    return asString(response.data);
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to save prescription.'));
  }
}

export async function getPrescriptionDetail(token: string, prescriptionId: string): Promise<PrescriptionDetail> {
  try {
    const response = await apiClient.get(`/api/prescription/${prescriptionId}`, withAuth(token));
    const payload = (response.data ?? {}) as Record<string, unknown>;

    return {
      id: asString(payload.id) ?? asString(payload.prescriptionId) ?? prescriptionId,
      displayId: asString(payload.displayId),
      status: asString(payload.status),
      prescriptionType: asString(payload.prescriptionType),
      detailedPrescription: safeParseJson<PhysiotherapyPrescriptionData>(asString(payload.detailedPrescription)),
    };
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load prescription.'));
  }
}

export async function updatePrescriptionRecord(
  token: string,
  prescriptionId: string,
  status: 'Draft' | 'Final',
  detailedPrescription: Record<string, unknown>
): Promise<void> {
  try {
    await apiClient.put(
      `/api/prescription/${prescriptionId}`,
      {
        detailedPrescription: JSON.stringify(detailedPrescription),
        status,
      },
      withAuth(token)
    );
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to update prescription.'));
  }
}

export async function deletePrescriptionRecord(token: string, prescriptionId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/prescription/${prescriptionId}`, withAuth(token));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to delete prescription.'));
  }
}

export interface AddDrawingRequest {
  serviceId: string;
  name: string;
  diagramJson: string;
}

export async function addDrawingRecord(token: string, request: AddDrawingRequest): Promise<string | undefined> {
  try {
    const response = await apiClient.post(
      '/api/diagram',
      {
        name: request.name,
        diagramJson: request.diagramJson,
        availedServiceId: request.serviceId,
      },
      withAuth(token)
    );

    const payload = response.data as Record<string, unknown> | string;

    if (typeof payload === 'string') {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      return asString(payload.id) ?? asString(payload.diagramId);
    }

    return undefined;
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to save drawing.'));
  }
}

export interface DrawingDetail {
  id: string;
  name?: string;
  diagramJson: string;
}

export async function getDrawingDetail(token: string, drawingId: string): Promise<DrawingDetail> {
  try {
    const response = await apiClient.get(`/api/diagram/${drawingId}`, withAuth(token));
    const payload = (response.data ?? {}) as Record<string, unknown>;

    return {
      id: asString(payload.id) ?? asString(payload.diagramId) ?? drawingId,
      name: asString(payload.name),
      diagramJson: asString(payload.diagramJson) ?? JSON.stringify({ version: 'mobile-1', strokes: [] }),
    };
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load drawing.'));
  }
}

export async function updateDrawingRecord(
  token: string,
  drawingId: string,
  name: string,
  diagramJson: string
): Promise<void> {
  try {
    await apiClient.put(
      '/api/diagram',
      {
        id: drawingId,
        name,
        diagramJson,
      },
      withAuth(token)
    );
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to update drawing.'));
  }
}

export async function deleteDrawingRecord(token: string, drawingId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/diagram/${drawingId}`, withAuth(token));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to delete drawing.'));
  }
}

export async function deleteMedicalRecord(token: string, medicalRecordId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/medicalrecord/${medicalRecordId}`, withAuth(token));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to delete medical record.'));
  }
}

function sanitizeFileName(input: string) {
  return input.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function ensureCacheDir() {
  return Paths.cache;
}

function ensureToken(token: string) {
  if (!token.trim()) {
    throw new Error('Authentication token is missing.');
  }
}

function isLikelyGuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function openOrShareNativeFile(fileUri: string) {
  try {
    await Linking.openURL(fileUri);
    return;
  } catch {
    // Fallback to share sheet when direct file opening is unavailable.
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri);
    return;
  }

  throw new Error('Unable to open the downloaded file on this device.');
}

async function openOrDownloadWebBlob(blob: Blob, targetFileName: string, openInNewTab: boolean) {
  const webGlobal = globalThis as {
    URL?: { createObjectURL: (value: Blob) => string; revokeObjectURL: (value: string) => void };
    open?: (url?: string, target?: string, features?: string) => unknown;
    document?: {
      body?: { appendChild: (node: unknown) => void; removeChild: (node: unknown) => void };
      createElement: (tagName: string) => {
        href: string;
        download: string;
        rel: string;
        target: string;
        style: { display: string };
        click: () => void;
      };
    };
    setTimeout: (handler: () => void, timeout?: number) => unknown;
  };

  if (!webGlobal.URL || !webGlobal.document) {
    throw new Error('Web download is not available in this environment.');
  }

  const blobUrl = webGlobal.URL.createObjectURL(blob);

  if (openInNewTab && webGlobal.open) {
    const opened = webGlobal.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (opened) {
      webGlobal.setTimeout(() => {
        webGlobal.URL?.revokeObjectURL(blobUrl);
      }, 60000);
      return;
    }
  }

  const anchor = webGlobal.document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = sanitizeFileName(targetFileName);
  anchor.rel = 'noopener noreferrer';
  anchor.target = '_blank';
  anchor.style.display = 'none';

  webGlobal.document.body?.appendChild(anchor);
  anchor.click();
  webGlobal.document.body?.removeChild(anchor);

  webGlobal.setTimeout(() => {
    webGlobal.URL?.revokeObjectURL(blobUrl);
  }, 1000);
}

async function downloadRemoteFileWeb(
  token: string,
  endpointPath: string,
  targetFileName: string,
  openInNewTab: boolean
) {
  const response = await axios.get(`${API_BASE_URL}${endpointPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: '*/*',
    },
    responseType: 'blob',
  });

  await openOrDownloadWebBlob(response.data as Blob, targetFileName, openInNewTab);
}

async function downloadAndShareFile(token: string, endpointPath: string, targetFileName: string) {
  ensureToken(token);

  if (Platform.OS === 'web') {
    await downloadRemoteFileWeb(token, endpointPath, targetFileName, targetFileName.toLowerCase().endsWith('.pdf'));
    return targetFileName;
  }

  const directory = ensureCacheDir();
  const file = new File(directory, sanitizeFileName(targetFileName));
  const downloadUrl = `${API_BASE_URL}${endpointPath}`;

  await File.downloadFileAsync(downloadUrl, file, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: '*/*',
    },
    idempotent: true,
  });

  await openOrShareNativeFile(file.uri);

  return file.uri;
}

async function writeAndShareTextFile(targetFileName: string, content: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    await openOrDownloadWebBlob(blob, targetFileName, false);
    return targetFileName;
  }

  const directory = ensureCacheDir();
  const file = new File(directory, sanitizeFileName(targetFileName));
  file.write(content, { encoding: 'utf8' });

  await openOrShareNativeFile(file.uri);

  return file.uri;
}

export async function downloadPrescriptionPdf(token: string, prescriptionId: string, displayId?: string) {
  const inputId = prescriptionId.trim();

  if (!inputId) {
    throw new Error('Prescription ID is missing.');
  }

  let resolvedPrescriptionId = inputId;

  if (!isLikelyGuid(inputId)) {
    const detail = await getPrescriptionDetail(token, inputId);
    const canonicalId = detail.id?.trim();

    if (!canonicalId) {
      throw new Error('Unable to resolve prescription identifier for download.');
    }

    resolvedPrescriptionId = canonicalId;
  }

  return downloadAndShareFile(
    token,
    `/api/prescription/download/${encodeURIComponent(resolvedPrescriptionId)}`,
    `${displayId ?? `prescription-${resolvedPrescriptionId}`}.pdf`
  );
}

export async function downloadMedicalRecordFile(token: string, medicalRecordId: string, name?: string) {
  return downloadAndShareFile(
    token,
    `/api/medicalrecord/downloadmedicalrecord/${medicalRecordId}`,
    name ?? `medical-record-${medicalRecordId}`
  );
}

export async function downloadClinicalNoteFile(token: string, noteId: string, displayId?: string) {
  const detail = await getClinicalNoteDetail(token, noteId);
  const content = detail.noteText || detail.noteJson || '';
  return writeAndShareTextFile(`${displayId ?? `clinical-note-${noteId}`}.txt`, content);
}

export async function downloadDrawingFile(token: string, drawingId: string, displayId?: string) {
  const detail = await getDrawingDetail(token, drawingId);
  if (Platform.OS === 'web') {
    const blob = new Blob([detail.diagramJson], { type: 'application/json;charset=utf-8' });
    const targetFileName = `${displayId ?? `drawing-${drawingId}`}.json`;
    await openOrDownloadWebBlob(blob, targetFileName, false);
    return targetFileName;
  }

  return writeAndShareTextFile(`${displayId ?? `drawing-${drawingId}`}.json`, detail.diagramJson);
}

function safeParseJson<T>(jsonString?: string) {
  if (!jsonString) {
    return undefined;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return undefined;
  }
}

export async function addMedicalRecord(token: string, request: MedicalRecordUploadRequest): Promise<void> {
  await uploadMedicalRecord(token, request);
}
