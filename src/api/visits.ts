import axios from 'axios';
import { API_BASE_URL } from './config';
import type {
  AvailableSlot,
  ClinicalServiceOption,
  PatientOption,
  PhysicianOption,
  PhysicianScheduleItem,
  VisitBillingSummary,
  VisitCreatePayload,
  VisitDetail,
  VisitFilterPayload,
  VisitLinkedService,
  VisitSummary,
} from '../types/visits';

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

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined;
}

function normalizeVisitSummary(raw: Record<string, unknown>): VisitSummary {
  return {
    id: asString(raw.id) ?? '',
    displayId: asString(raw.displayId),
    visitDisplayId: asString(raw.visitDisplayId),
    patientId: asString(raw.patientId),
    patientPrefix: asString(raw.patientPrefix),
    patientFirstName: asString(raw.patientFirstName),
    patientLastName: asString(raw.patientLastName),
    patientGender: asString(raw.patientGender),
    patientAgeInYears: asNumber(raw.patientAgeInYears),
    patientMobileNo: asString(raw.patientMobileNo),
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

function normalizeVisitLinkedService(raw: Record<string, unknown>): VisitLinkedService {
  return {
    id: asString(raw.id) ?? '',
    displayId: asString(raw.displayId),
    serviceCode: asString(raw.serviceCode),
    serviceName: asString(raw.serviceName),
    assignedToUserName: asString(raw.assignedToUserName),
    scheduledStartDateTime: asString(raw.scheduledStartDateTime),
    scheduledEndDateTime: asString(raw.scheduledEndDateTime),
    status: asString(raw.status),
    billingStatus: asString(raw.billingStatus),
    isPrimary: Boolean(raw.isPrimary),
  };
}

function normalizeAvailableSlots(value: unknown, serviceDurationInMins = 0): AvailableSlot[] {
  const slots: AvailableSlot[] = [];

  const pushSlot = (dateString?: string) => {
    if (!dateString) {
      return;
    }

    const start = new Date(dateString);
    if (Number.isNaN(start.getTime())) {
      return;
    }

    const durationInMs = Math.max(serviceDurationInMins, 30) * 60 * 1000;
    const end = new Date(start.getTime() + durationInMs);

    slots.push({
      startsAtIsoUtc: start.toISOString(),
      endsAtIsoUtc: end.toISOString(),
    });
  };

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === 'string') {
        pushSlot(item);
        return;
      }

      if (item && typeof item === 'object') {
        const asRecordValue = item as Record<string, unknown>;
        const start = asString(asRecordValue.startsAtIsoUtc)
          ?? asString(asRecordValue.scheduledStartDateTime)
          ?? asString(asRecordValue.slot)
          ?? asString(asRecordValue.start)
          ?? asString(asRecordValue.from);
        const end = asString(asRecordValue.endsAtIsoUtc)
          ?? asString(asRecordValue.scheduledEndDateTime)
          ?? asString(asRecordValue.end)
          ?? asString(asRecordValue.to);

        if (start && end) {
          const startDate = new Date(start);
          const endDate = new Date(end);
          if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
            slots.push({ startsAtIsoUtc: startDate.toISOString(), endsAtIsoUtc: endDate.toISOString() });
            return;
          }
        }

        pushSlot(start);
      }
    });
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    Object.values(record).forEach((nestedValue) => {
      const nestedSlots = normalizeAvailableSlots(nestedValue, serviceDurationInMins);
      slots.push(...nestedSlots);
    });
  }

  return slots;
}

export async function loadFacilityVisits(
  token: string,
  facilityId: string,
  filter: VisitFilterPayload,
): Promise<VisitSummary[]> {
  try {
    const response = await apiClient.post(
      `/api/visit/facility/${facilityId}`,
      {
        from: filter.from,
        to: filter.to,
        statusList: filter.statusList,
        physicianId: filter.physicianId,
      },
      withAuth(token),
    );

    return asArray<Record<string, unknown>>(response.data)
      .map(normalizeVisitSummary)
      .filter((item) => Boolean(item.id));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load visits.'));
  }
}

export async function loadVisitDetails(token: string, facilityId: string, visitId: string): Promise<VisitDetail> {
  try {
    const response = await apiClient.get(`/api/visit/${visitId}/facility/${facilityId}`, withAuth(token));
    const normalized = normalizeVisitSummary((response.data ?? {}) as Record<string, unknown>);

    return {
      ...normalized,
      onwardTravelTimeInMins: asNumber((response.data ?? {}).onwardTravelTimeInMins),
      returnTravelTimeInMins: asNumber((response.data ?? {}).returnTravelTimeInMins),
      advanceAmount: asNumber((response.data ?? {}).advanceAmount),
      paymentMode: asString((response.data ?? {}).paymentMode),
      discountInPercentage: asNumber((response.data ?? {}).discountInPercentage),
      shouldGenerateBill: Boolean((response.data ?? {}).shouldGenerateBill),
    };
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load visit details.'));
  }
}

export async function loadVisitLinkedServices(token: string, visitId: string): Promise<VisitLinkedService[]> {
  try {
    const response = await apiClient.get(`/api/providedservices/visit/${visitId}`, withAuth(token));
    return asArray<Record<string, unknown>>(response.data).map(normalizeVisitLinkedService);
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load linked services.'));
  }
}

export async function loadVisitBillingSummary(token: string, visitId: string): Promise<VisitBillingSummary | null> {
  try {
    const response = await apiClient.get(`/api/billing/visitid/${visitId}`, withAuth(token));
    const raw = (response.data ?? {}) as Record<string, unknown>;

    return {
      billId: asString(raw.id),
      billDisplayId: asString(raw.displayId),
      createdByUserName: asString(raw.createdByUserName),
      createdOn: asString(raw.createdOn),
      totalAmount: asNumber(raw.totalAmount),
      paidAmount: asNumber(raw.paidAmount),
      refundedAmount: asNumber(raw.refundedAmount),
      balanceAmount: asNumber(raw.balanceAmount),
    };
  } catch {
    return null;
  }
}

export async function createVisit(token: string, payload: VisitCreatePayload): Promise<void> {
  try {
    await apiClient.post('/api/visit', payload, withAuth(token));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to create visit.'));
  }
}

export async function searchPatients(token: string, facilityId: string, keyword: string): Promise<PatientOption[]> {
  try {
    const response = await apiClient.get(
      `/api/patient/facility/${facilityId}/patientsearch/${encodeURIComponent(keyword)}`,
      withAuth(token),
    );

    return asArray<Record<string, unknown>>(response.data).map((raw) => ({
      id: asString(raw.id) ?? '',
      prefix: asString(raw.prefix),
      firstName: asString(raw.firstName),
      lastName: asString(raw.lastName),
      gender: asString(raw.gender),
      ageInYears: asNumber(raw.ageInYears),
      mobileNo: asString(raw.mobileNo),
      mrn: asString(raw.mrn),
    }));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to search patients.'));
  }
}

export async function loadFacilityPhysicians(token: string, facilityId: string): Promise<PhysicianOption[]> {
  try {
    const response = await apiClient.post(
      '/api/account/search',
      {
        facilityid: facilityId,
        roles: ['Physician'],
      },
      withAuth(token),
    );

    return asArray<Record<string, unknown>>(response.data).map((raw) => ({
      id: asString(raw.id) ?? '',
      salutation: asString(raw.salutation),
      firstName: asString(raw.firstName),
      lastName: asString(raw.lastName),
      suffix: asString(raw.suffix),
    }));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load physicians.'));
  }
}

export async function loadClinicalServices(
  token: string,
  facilityId: string,
  visitType: 'OPD' | 'Home',
): Promise<ClinicalServiceOption[]> {
  try {
    const response = await apiClient.post(
      '/api/facilitysettings/clinicalservices/get',
      {
        facilityId,
        visitType,
      },
      withAuth(token),
    );

    return asArray<Record<string, unknown>>(response.data).map((raw) => ({
      id: asString(raw.id) ?? '',
      name: asString(raw.name),
      fees: asNumber(raw.fees),
      durationInMins: asNumber(raw.durationInMins),
    }));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load clinical services.'));
  }
}

export async function loadPhysicianAvailableSlots(
  token: string,
  physicianId: string,
  dates: string[],
  serviceId?: string,
  serviceDurationInMins = 0,
): Promise<AvailableSlot[]> {
  try {
    const response = await apiClient.post(
      '/api/appointment/availableslots',
      {
        physicianId,
        dates,
        serviceId,
      },
      withAuth(token),
    );

    return normalizeAvailableSlots(response.data, serviceDurationInMins);
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load available slots.'));
  }
}

export async function loadPhysicianScheduleForDate(
  token: string,
  facilityId: string,
  physicianId: string,
  fromIsoUtc: string,
  toIsoUtc: string,
): Promise<PhysicianScheduleItem[]> {
  try {
    const response = await apiClient.post(
      '/api/providedservices/get',
      {
        facilityId,
        from: fromIsoUtc,
        to: toIsoUtc,
        physicianId,
      },
      withAuth(token),
    );

    return asArray<Record<string, unknown>>(response.data).map((raw) => ({
      id: asString(raw.id) ?? '',
      title: [asString(raw.patientFirstName), asString(raw.patientLastName), asString(raw.serviceName)]
        .filter(Boolean)
        .join(' '),
      startsAtIsoUtc: asString(raw.scheduledStartDateTime) ?? '',
      endsAtIsoUtc: asString(raw.scheduledEndDateTime) ?? '',
      onwardTravelTimeInMins: asNumber(raw.onwardTravelTime),
      returnTravelTimeInMins: asNumber(raw.returnTravelTime),
    }));
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load physician schedule.'));
  }
}
