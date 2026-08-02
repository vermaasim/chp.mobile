import { loadPatientsByCreatedDateRange } from './patients';
import { loadFacilityVisits, loadVisitDetails } from './visits';
import { loadMyAssignedServices } from './worklist';
import { formatDateInput, toUtcIsoRange } from '../utils/dateRangeFilter';

export type SummaryMetricKey = 'allTasks' | 'incompleteTasks' | 'myTasks' | 'newPatients' | 'payments' | 'enquiries' | 'visits';

export type SummaryRole = 'facilityadmin' | 'physician' | 'frontdesk';

export interface SummaryCardItem {
  key: string;
  label: string;
  value: string;
  metric: SummaryMetricKey;
}

function getTodayDateRange() {
  const today = new Date();
  const fromDate = formatDateInput(today);
  const toDate = formatDateInput(today);

  return toUtcIsoRange(fromDate, toDate);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeStatus(status?: string) {
  return status?.trim().toLowerCase() ?? '';
}

function isTaskIncomplete(status?: string) {
  return normalizeStatus(status) !== 'completed';
}

export async function loadTodaySummaryItems(token: string, facilityId: string, role: SummaryRole): Promise<SummaryCardItem[]> {
  if (!token || !facilityId) {
    return [];
  }

  const { from, to } = getTodayDateRange();

  const [services, patients, visits] = await Promise.all([
    loadMyAssignedServices(token, facilityId, from, to),
    loadPatientsByCreatedDateRange(token, facilityId, formatDateInput(new Date()), formatDateInput(new Date())),
    loadFacilityVisits(token, facilityId, {
      from,
      to,
      statusList: [],
    }),
  ]);

  const allTasksCount = services.length;
  const incompleteTasksCount = services.filter((service) => isTaskIncomplete(service.status)).length;
  const newPatientsCount = patients.length;

  const paymentTotal = await visits.reduce(async (memoPromise, visit) => {
    const memo = await memoPromise;

    if (!visit.id) {
      return memo;
    }

    try {
      const detail = await loadVisitDetails(token, facilityId, visit.id);
      return memo + (detail.advanceAmount ?? 0);
    } catch {
      return memo;
    }
  }, Promise.resolve(0));

  if (role === 'physician') {
    return [
      { key: 'my-tasks', label: 'My Tasks', value: `${allTasksCount}`, metric: 'myTasks' },
      { key: 'incomplete-tasks', label: 'Incomplete Tasks', value: `${incompleteTasksCount}`, metric: 'incompleteTasks' },
      { key: 'new-patients', label: 'New Patients', value: `${newPatientsCount}`, metric: 'newPatients' },
    ];
  }

  if (role === 'frontdesk') {
    return [
      { key: 'all-tasks', label: 'All Tasks', value: `${allTasksCount}`, metric: 'allTasks' },
      { key: 'new-patients', label: 'New Patients', value: `${newPatientsCount}`, metric: 'newPatients' },
      { key: 'enquiries', label: 'Enquiries', value: '0', metric: 'enquiries' },
    ];
  }

  return [
    { key: 'all-tasks', label: 'All Tasks', value: `${allTasksCount}`, metric: 'allTasks' },
    { key: 'incomplete-tasks', label: 'Incomplete Tasks', value: `${incompleteTasksCount}`, metric: 'incompleteTasks' },
    { key: 'new-patients', label: 'New Patients', value: `${newPatientsCount}`, metric: 'newPatients' },
    { key: 'payments', label: 'Payments', value: formatCurrency(paymentTotal), metric: 'payments' },
    { key: 'enquiries', label: 'Enquiries', value: '0', metric: 'enquiries' },
  ];
}
