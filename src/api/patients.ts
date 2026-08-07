import axios from 'axios';
import { API_BASE_URL } from './config';
import type { PatientCreatePayload, PatientDetail, PatientSummary, PatientVisitSummary } from '../types/patients';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

function withAuth(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

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

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return `${value}`;
  }

  return undefined;
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined;
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizePatientSummary(raw: Record<string, unknown>): PatientSummary {
  return {
    id: asString(raw.id) ?? '',
    mrn: asString(raw.mrn),
    prefix: asString(raw.prefix),
    firstName: asString(raw.firstName),
    lastName: asString(raw.lastName),
    gender: asString(raw.gender),
    ageInYears: asNumber(raw.ageInYears),
    mobileNo: asString(raw.mobileNo),
    emailId: asString(raw.emailId),
    isActive: asBoolean(raw.isActive),
  };
}

function normalizePatientVisitSummary(raw: Record<string, unknown>): PatientVisitSummary {
  return {
    id: asString(raw.id) ?? '',
    displayId: asString(raw.displayId),
    visitDisplayId: asString(raw.visitDisplayId),
    physicianId: asString(raw.physicianId),
    physicianPrefix: asString(raw.physicianPrefix),
    physicianFirstName: asString(raw.physicianFirstName),
    physicianLastName: asString(raw.physicianLastName),
    primaryClinicalServiceId: asString(raw.primaryClinicalServiceId),
    primaryServiceName: asString(raw.primaryServiceName),
    scheduledStartDateTime: asString(raw.scheduledStartDateTime),
    scheduledEndDateTime: asString(raw.scheduledEndDateTime),
    visitStatus: asString(raw.visitStatus),
    status: asString(raw.status),
    currentVisitType: asString(raw.currentVisitType),
    notes: asString(raw.notes),
    referredBy: asString(raw.referredBy),
  };
}

function normalizePatientDetail(raw: Record<string, unknown>): PatientDetail {
  return {
    ...normalizePatientSummary(raw),
    suffix: asString(raw.suffix),
    dateOfBirth: asString(raw.dateOfBirth),
    bloodGroup: asString(raw.bloodGroup),
    maritalStatus: asString(raw.maritalStatus),
    nationalIdType: asString(raw.nationalIdType),
    nationalId: asString(raw.nationalId),
    emergencyContactPerson: asString(raw.emergencyContactPerson),
    emergencyContactRelationship: asString(raw.emergencyContactRelationship),
    emergencyContactPhoneNumber: asString(raw.emergencyContactPhoneNumber),
    addressHouseNo: asString(raw.addressHouseNo),
    addressStreet: asString(raw.addressStreet),
    addressCity: asString(raw.addressCity),
    addressState: asString(raw.addressState),
    addressPIN: asString(raw.addressPIN) ?? asString(raw.addressPin),
    addressCountry: asString(raw.addressCountry),
    photo: asString(raw.photo),
    visits: asArray<Record<string, unknown>>(raw.visits)
      .map(normalizePatientVisitSummary)
      .filter((item) => Boolean(item.id)),
  };
}

export async function loadPatientsByCreatedDateRange(
  token: string,
  facilityId: string,
  fromDate: string,
  toDate: string,
): Promise<PatientSummary[]> {
  try {
    const response = await apiClient.post(
      '/api/patient/createddaterange',
      {
        facilityId,
        from: fromDate,
        to: toDate,
      },
      withAuth(token),
    );

    return asArray<Record<string, unknown>>(response.data)
      .map(normalizePatientSummary)
      .filter((item) => Boolean(item.id));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load patients.'));
  }
}

export async function loadLastAccessedPatients(
  token: string,
  facilityId: string,
  count: number,
): Promise<PatientSummary[]> {
  try {
    const response = await apiClient.get(`/api/patient/lastaccessed/${facilityId}/${count}`, withAuth(token));

    return asArray<Record<string, unknown>>(response.data)
      .map(normalizePatientSummary)
      .filter((item) => Boolean(item.id));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load patients.'));
  }
}

export async function searchFacilityPatients(
  token: string,
  facilityId: string,
  keyword: string,
): Promise<PatientSummary[]> {
  try {
    const response = await apiClient.get(
      `/api/patient/facility/${facilityId}/patientsearch/${encodeURIComponent(keyword)}`,
      withAuth(token),
    );

    return asArray<Record<string, unknown>>(response.data)
      .map(normalizePatientSummary)
      .filter((item) => Boolean(item.id));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to search patients.'));
  }
}

export async function loadPatientDetails(token: string, facilityId: string, patientId: string): Promise<PatientDetail> {
  try {
    const response = await apiClient.get(`/api/patient/${patientId}/facility/${facilityId}`, withAuth(token));
    return normalizePatientDetail((response.data ?? {}) as Record<string, unknown>);
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load patient details.'));
  }
}

export async function createPatient(token: string, payload: PatientCreatePayload): Promise<void> {
  try {
    await apiClient.post('/api/patient', payload, withAuth(token));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to create patient.'));
  }
}