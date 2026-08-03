import axios from 'axios';
import { API_BASE_URL } from './config';

export type SummaryMetricKey = 'allTasks' | 'incompleteTasks' | 'myTasks' | 'newPatients' | 'payments' | 'enquiries' | 'visits';

export type SummaryRole = 'facilityadmin' | 'physician' | 'frontdesk';

export interface SummaryCardItem {
  key: string;
  label: string;
  value: string;
  metric: SummaryMetricKey;
}

interface TodaySummaryResponse {
  facilityId?: string;
  generatedOn?: string;
  fromDateTimeInUTC?: string;
  toDateTimeInUTC?: string;
  newPatientsCount?: number | null;
  allTasksCount?: number | null;
  myTasksCount?: number | null;
  incompleteTasksCount?: number | null;
  enquiriesCount?: number | null;
  paymentsTotal?: number | null;
}

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

function formatCount(value?: number | null) {
  return value == null ? '0' : `${value}`;
}

function formatCurrency(value?: number | null) {
  const numericValue = typeof value === 'number' ? value : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export async function loadTodaySummaryItems(token: string, facilityId: string, role: SummaryRole): Promise<SummaryCardItem[]> {
  if (!token || !facilityId) {
    return [];
  }

  try {
    const response = await apiClient.post<TodaySummaryResponse>(
      '/api/todays-summary/get-summary',
      { facilityId },
      withAuth(token),
    );

    const summary = response.data ?? {};
    const newPatientsCount = formatCount(summary.newPatientsCount);
    const allTasksCount = formatCount(summary.allTasksCount);
    const myTasksCount = formatCount(summary.myTasksCount);
    const incompleteTasksCount = formatCount(summary.incompleteTasksCount);
    const enquiriesCount = formatCount(summary.enquiriesCount);
    const paymentsValue = formatCurrency(summary.paymentsTotal);

    if (role === 'physician') {
      return [
        { key: 'my-tasks', label: 'My Tasks', value: myTasksCount, metric: 'myTasks' },
        { key: 'incomplete-tasks', label: 'Pending Tasks', value: incompleteTasksCount, metric: 'incompleteTasks' },
        { key: 'new-patients', label: 'New Patients', value: newPatientsCount, metric: 'newPatients' },
      ];
    }

    if (role === 'frontdesk') {
      return [
        { key: 'all-tasks', label: 'All Tasks', value: allTasksCount, metric: 'allTasks' },
        { key: 'new-patients', label: 'New Patients', value: newPatientsCount, metric: 'newPatients' },
        { key: 'enquiries', label: 'Enquiries', value: enquiriesCount, metric: 'enquiries' },
      ];
    }

    return [
      { key: 'all-tasks', label: 'All Tasks', value: allTasksCount, metric: 'allTasks' },
      { key: 'incomplete-tasks', label: 'Pending Tasks', value: incompleteTasksCount, metric: 'incompleteTasks' },
      { key: 'new-patients', label: 'New Patients', value: newPatientsCount, metric: 'newPatients' },
      { key: 'payments', label: 'Payments', value: paymentsValue, metric: 'payments' },
      { key: 'enquiries', label: 'Enquiries', value: enquiriesCount, metric: 'enquiries' },
    ];
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to load today summary.'));
  }
}
