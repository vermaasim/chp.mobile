import axios from 'axios';
import { API_BASE_URL } from './config';
import type {
  AssignedService,
  MedicalRecordUploadRequest,
  ServiceStatus,
  UpdateServiceStatusRequest,
} from '../types/worklist';

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

export async function loadMyAssignedServices(
  token: string,
  facilityId: string,
  fromIsoUtc: string,
  toIsoUtc: string,
): Promise<AssignedService[]> {
  try {
    const response = await apiClient.post<AssignedService[]>(
      '/api/providedservices/myassignedservices',
      {
        from: fromIsoUtc,
        to: toIsoUtc,
        facilityId,
      },
      withAuth(token),
    );

    return response.data;
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load assigned services.'));
  }
}

export async function loadServiceDetails(token: string, serviceId: string): Promise<AssignedService> {
  try {
    const response = await apiClient.get<AssignedService>(`/api/providedservices/${serviceId}`, withAuth(token));
    return response.data;
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load service details.'));
  }
}

export async function updateServiceStatus(
  token: string,
  request: UpdateServiceStatusRequest,
): Promise<void> {
  try {
    await apiClient.post('/api/providedservices/updatestatus', request, withAuth(token));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to update service status.'));
  }
}

export async function uploadMedicalRecord(token: string, request: MedicalRecordUploadRequest): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('AvailedServiceId', request.availedServiceId);
    formData.append('Name', request.name);
    formData.append('RecordType', request.recordType);
    formData.append('RecordDate', request.recordDate);

    if (request.description?.trim()) {
      formData.append('Description', request.description.trim());
    }

    formData.append('File', {
      uri: request.fileUri,
      name: request.fileName,
      type: request.mimeType,
    } as unknown as Blob);

    await apiClient.post('/api/medicalrecord/UploadMedicalRecord', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'multipart/form-data',
      },
    });
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to upload medical record.'));
  }
}

export function canStartService(status: ServiceStatus) {
  return status !== 'InProgress' && status !== 'Completed';
}
