import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import forge from 'node-forge';

const DEVICE_KEYPAIR_STORAGE_KEY = 'thebuildershive.mobile.deviceKeypair';

interface DeviceKeyPair {
  publicKey: string;
  privateKey: string;
}

function getWebStorage() {
  if (Platform.OS !== 'web') {
    return null;
  }

  return globalThis.localStorage ?? null;
}

function generateRsaKeyPair(): Promise<DeviceKeyPair> {
  return new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (error, keypair) => {
      if (error || !keypair) {
        reject(error ?? new Error('Failed to generate device keypair.'));
        return;
      }

      resolve({
        publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
        privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
      });
    });
  });
}

async function saveDeviceKeyPair(keypair: DeviceKeyPair) {
  const serializedValue = JSON.stringify(keypair);
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(DEVICE_KEYPAIR_STORAGE_KEY, serializedValue);
    return;
  }

  await SecureStore.setItemAsync(DEVICE_KEYPAIR_STORAGE_KEY, serializedValue, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function loadDeviceKeyPair(): Promise<DeviceKeyPair | null> {
  const webStorage = getWebStorage();

  const serializedValue = webStorage
    ? webStorage.getItem(DEVICE_KEYPAIR_STORAGE_KEY)
    : await SecureStore.getItemAsync(DEVICE_KEYPAIR_STORAGE_KEY);

  if (!serializedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(serializedValue) as DeviceKeyPair;

    if (!parsed.publicKey || !parsed.privateKey) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function getOrCreatePublicEncryptionKey() {
  const existingKeyPair = await loadDeviceKeyPair();

  if (existingKeyPair?.publicKey) {
    return existingKeyPair.publicKey;
  }

  const generatedKeyPair = await generateRsaKeyPair();
  await saveDeviceKeyPair(generatedKeyPair);

  return generatedKeyPair.publicKey;
}

export async function getOrCreatePrivateSigningKey() {
  const existingKeyPair = await loadDeviceKeyPair();

  if (existingKeyPair?.privateKey) {
    return existingKeyPair.privateKey;
  }

  const generatedKeyPair = await generateRsaKeyPair();
  await saveDeviceKeyPair(generatedKeyPair);

  return generatedKeyPair.privateKey;
}

export async function clearDeviceKeyPair() {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.removeItem(DEVICE_KEYPAIR_STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(DEVICE_KEYPAIR_STORAGE_KEY);
}
