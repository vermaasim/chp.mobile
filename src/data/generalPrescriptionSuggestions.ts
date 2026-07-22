import { GENERAL_PRESCRIPTION_FREQUENCIES, GENERAL_PRESCRIPTION_DURATION_OPTIONS, GENERAL_PRESCRIPTION_MEDICINE_INSTRUCTIONS, GENERAL_PRESCRIPTION_TEST_INSTRUCTIONS, GENERAL_PRESCRIPTION_TESTS } from './generalPrescriptionAutocompleteCatalogs';
import { MedicineList } from './generalPrescriptionMedicineCatalog';

export type GeneralPrescriptionSuggestionCatalog = {
  medicines: string[];
  dosages: string[];
  frequencies: string[];
  medicineInstructions: string[];
  tests: string[];
  durations: string[];
  testInstructions: string[];
};

function uniqueValues(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = value.toLowerCase();

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

export const GENERAL_PRESCRIPTION_SUGGESTIONS: GeneralPrescriptionSuggestionCatalog = {
  medicines: uniqueValues(MedicineList.map((item) => item.name)),
  dosages: uniqueValues(MedicineList.map((item) => item.strength)),
  frequencies: GENERAL_PRESCRIPTION_FREQUENCIES,
  medicineInstructions: GENERAL_PRESCRIPTION_MEDICINE_INSTRUCTIONS,
  durations: GENERAL_PRESCRIPTION_DURATION_OPTIONS,
  tests: GENERAL_PRESCRIPTION_TESTS,
  testInstructions: GENERAL_PRESCRIPTION_TEST_INSTRUCTIONS,
};

type TopSuggestionParams = {
  catalog: string[];
  query: string;
  recentValues?: string[];
  limit?: number;
};

function normalizeValue(value: string) {
  return value.trim();
}

function matchesQuery(value: string, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  return value.toLowerCase().includes(normalizedQuery);
}

export function getTopSuggestions({ catalog, query, recentValues = [], limit = 5 }: TopSuggestionParams) {
  const normalizedQuery = query.trim().toLowerCase();
  const recent = uniqueValues(recentValues.map(normalizeValue).filter(Boolean));
  const catalogValues = uniqueValues(catalog.map(normalizeValue).filter(Boolean));

  const rankedRecent = recent.filter((value) => matchesQuery(value, normalizedQuery));
  const rankedCatalog = catalogValues.filter(
    (value) => matchesQuery(value, normalizedQuery) && !rankedRecent.some((recentValue) => recentValue.toLowerCase() === value.toLowerCase())
  );

  return [...rankedRecent, ...rankedCatalog].slice(0, limit);
}