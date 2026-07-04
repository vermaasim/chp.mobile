import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const DEVICE_APP_ID_STORAGE_KEY = 'thebuildershive.mobile.deviceAppId';

function getWebStorage() {
  if (Platform.OS !== 'web') {
    return null;
  }

  return globalThis.localStorage ?? null;
}

function generateGuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function loadDeviceAppId() {
  const webStorage = getWebStorage();

  if (webStorage) {
    return webStorage.getItem(DEVICE_APP_ID_STORAGE_KEY);
  }

  return SecureStore.getItemAsync(DEVICE_APP_ID_STORAGE_KEY);
}

async function saveDeviceAppId(deviceAppId: string) {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(DEVICE_APP_ID_STORAGE_KEY, deviceAppId);
    return;
  }

  await SecureStore.setItemAsync(DEVICE_APP_ID_STORAGE_KEY, deviceAppId, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getOrCreateDeviceAppId() {
  const existingAppId = await loadDeviceAppId();

  if (existingAppId) {
    return existingAppId;
  }

  const generatedAppId = generateGuidV4();
  await saveDeviceAppId(generatedAppId);
  return generatedAppId;
}
