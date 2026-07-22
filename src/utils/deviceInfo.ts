import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { getOrCreateDeviceAppId } from '../storage/deviceIdentity';
import { getOrCreatePublicEncryptionKey } from '../storage/deviceKeys';
import type { MobileLoginDeviceInfo } from '../types/auth';

const FALLBACK_APP_VERSION = '1.0.0';

async function getDeviceId() {
  if (Platform.OS === 'android') {
    return Application.getAndroidId();
  }

  if (Platform.OS === 'ios') {
    return Application.getIosIdForVendorAsync();
  }

  return null;
}

function getOsType() {
  if (Platform.OS === 'android') {
    return 'Android';
  }

  if (Platform.OS === 'ios') {
    return 'iOS';
  }

  return Platform.OS;
}

export async function buildMobileLoginDeviceInfo(
  publicEncryptionKey: string,
): Promise<MobileLoginDeviceInfo> {
  const deviceId = await getDeviceId();
  const appId = await getOrCreateDeviceAppId();

  return {
    appId,
    osType: getOsType(),
    version: Application.nativeApplicationVersion ?? FALLBACK_APP_VERSION,
    publicEncryptionKey,
    deviceId: deviceId ?? undefined,
    deviceModel: Device.modelName ?? undefined,
    deviceManufacturer: Device.manufacturer ?? undefined,
    osVersion: Device.osVersion ?? undefined,
    appBuildNumber: Application.nativeBuildVersion ?? undefined,
  };
}

export async function buildMobileLoginDeviceInfoWithKeyLookup(): Promise<MobileLoginDeviceInfo> {
  const [publicEncryptionKey, deviceId, appId] = await Promise.all([
    getOrCreatePublicEncryptionKey(),
    getDeviceId(),
    getOrCreateDeviceAppId(),
  ]);

  return {
    appId,
    osType: getOsType(),
    version: Application.nativeApplicationVersion ?? FALLBACK_APP_VERSION,
    publicEncryptionKey,
    deviceId: deviceId ?? undefined,
    deviceModel: Device.modelName ?? undefined,
    deviceManufacturer: Device.manufacturer ?? undefined,
    osVersion: Device.osVersion ?? undefined,
    appBuildNumber: Application.nativeBuildVersion ?? undefined,
  };
}
