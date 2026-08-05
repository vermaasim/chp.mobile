export type DateFilterOption = 'today' | 'yesterday' | 'lastWeek' | 'thisWeek' | 'nextWeek' | 'custom';

export const DATE_FILTER_OPTIONS: Array<{ key: DateFilterOption; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'lastWeek', label: 'Last Week' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'nextWeek', label: 'Next Week' },
  { key: 'custom', label: 'Custom' },
];

export function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const date = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function parseDateInput(value: string) {
  const [year, month, date] = value.split('-').map((part) => Number(part));

  if (!year || !month || !date) {
    return new Date();
  }

  return new Date(year, month - 1, date);
}

function addDays(baseDate: Date, days: number) {
  const copy = new Date(baseDate);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(baseDate: Date) {
  const copy = new Date(baseDate);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function getRangeForOption(option: DateFilterOption) {
  const today = new Date();

  if (option === 'yesterday') {
    const target = addDays(today, -1);
    const value = formatDateInput(target);
    return { fromDate: value, toDate: value };
  }

  if (option === 'lastWeek') {
    const weekStart = startOfWeek(today);
    return {
      fromDate: formatDateInput(addDays(weekStart, -7)),
      toDate: formatDateInput(addDays(weekStart, -1)),
    };
  }

  if (option === 'thisWeek') {
    const weekStart = startOfWeek(today);
    return {
      fromDate: formatDateInput(weekStart),
      toDate: formatDateInput(addDays(weekStart, 6)),
    };
  }

  if (option === 'nextWeek') {
    return {
      fromDate: formatDateInput(addDays(today, 1)),
      toDate: formatDateInput(addDays(today, 7)),
    };
  }

  const value = formatDateInput(today);
  return { fromDate: value, toDate: value };
}

export function getFilterLabel(option: DateFilterOption) {
  const item = DATE_FILTER_OPTIONS.find((filterOption) => filterOption.key === option);
  return item?.label ?? 'Today';
}

export function toUtcIsoRange(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T23:59:59.999`);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function isValidDateRange(fromDate: string, toDate: string) {
  const from = Date.parse(`${fromDate}T00:00:00`);
  const to = Date.parse(`${toDate}T23:59:59.999`);

  return !Number.isNaN(from) && !Number.isNaN(to) && from <= to;
}
