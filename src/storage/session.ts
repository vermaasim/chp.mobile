import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthSession } from '../types/auth';

const SESSION_KEY = 'chp.mobile.session';

function getWebStorage() {
  if (Platform.OS !== 'web') {
    return null;
  }

  return globalThis.localStorage ?? null;
}

export async function saveSession(user: AuthSession) {
  const serializedValue = JSON.stringify(user);
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(SESSION_KEY, serializedValue);
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, serializedValue);
}

export async function loadSession(): Promise<AuthSession | null> {
  const webStorage = getWebStorage();

  const serializedValue = webStorage
    ? webStorage.getItem(SESSION_KEY)
    : await SecureStore.getItemAsync(SESSION_KEY);

  if (!serializedValue) {
    return null;
  }

  try {
    return JSON.parse(serializedValue) as AuthSession;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.removeItem(SESSION_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}