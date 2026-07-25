import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type WorklistDateFilterOption = 'today' | 'yesterday' | 'lastWeek' | 'nextWeek' | 'custom';

export interface WorklistDateFilterPreference {
  option: WorklistDateFilterOption;
  fromDate: string;
  toDate: string;
}

const FILTER_KEY = 'chp.mobile.worklist.datefilter';

function getWebStorage() {
  if (Platform.OS !== 'web') {
    return null;
  }

  return globalThis.localStorage ?? null;
}

export async function saveWorklistDateFilterPreference(preference: WorklistDateFilterPreference) {
  const serialized = JSON.stringify(preference);
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(FILTER_KEY, serialized);
    return;
  }

  await SecureStore.setItemAsync(FILTER_KEY, serialized);
}

export async function loadWorklistDateFilterPreference(): Promise<WorklistDateFilterPreference | null> {
  const webStorage = getWebStorage();

  const serialized = webStorage
    ? webStorage.getItem(FILTER_KEY)
    : await SecureStore.getItemAsync(FILTER_KEY);

  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized) as WorklistDateFilterPreference;
  } catch {
    return null;
  }
}
