import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { VisitFilterPreference } from '../types/visits';

const FILTER_KEY = 'chp.mobile.visits.datefilter';

function getWebStorage() {
  if (Platform.OS !== 'web') {
    return null;
  }

  return globalThis.localStorage ?? null;
}

export async function saveVisitsDateFilterPreference(preference: VisitFilterPreference) {
  const serialized = JSON.stringify(preference);
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(FILTER_KEY, serialized);
    return;
  }

  await SecureStore.setItemAsync(FILTER_KEY, serialized);
}

export async function loadVisitsDateFilterPreference(): Promise<VisitFilterPreference | null> {
  const webStorage = getWebStorage();

  const serialized = webStorage
    ? webStorage.getItem(FILTER_KEY)
    : await SecureStore.getItemAsync(FILTER_KEY);

  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized) as VisitFilterPreference;
  } catch {
    return null;
  }
}
