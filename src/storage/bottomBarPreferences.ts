import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface BottomBarModulePreference {
  selectedModuleKeys: string[];
}

const KEY_PREFIX = 'chp.mobile.bottomBar.modules';

function getWebStorage() {
  if (Platform.OS !== 'web') {
    return null;
  }

  return globalThis.localStorage ?? null;
}

function getPreferenceKey(scope: string) {
  return `${KEY_PREFIX}.${scope}`;
}

export async function saveBottomBarModulePreference(scope: string, preference: BottomBarModulePreference) {
  const serialized = JSON.stringify(preference);
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(getPreferenceKey(scope), serialized);
    return;
  }

  await SecureStore.setItemAsync(getPreferenceKey(scope), serialized);
}

export async function loadBottomBarModulePreference(scope: string): Promise<BottomBarModulePreference | null> {
  const webStorage = getWebStorage();

  const serialized = webStorage
    ? webStorage.getItem(getPreferenceKey(scope))
    : await SecureStore.getItemAsync(getPreferenceKey(scope));

  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as BottomBarModulePreference;
    if (!Array.isArray(parsed.selectedModuleKeys)) {
      return null;
    }

    return {
      selectedModuleKeys: parsed.selectedModuleKeys.filter((value): value is string => typeof value === 'string'),
    };
  } catch {
    return null;
  }
}