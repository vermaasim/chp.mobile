export interface LoginCredentials {
  userName: string;
  password: string;
}

export interface MobileLoginDeviceInfo {
  appId: string;
  osType: string;
  version: string;
  publicEncryptionKey: string;
  deviceId?: string;
  deviceModel?: string;
  deviceManufacturer?: string;
  osVersion?: string;
  appBuildNumber?: string;
}

export interface MobileLoginRequest {
  userName: string;
  password: string;
  deviceInfo: MobileLoginDeviceInfo;
}

export interface Facility {
  id: string;
  name: string;
  addressLine2?: string | null;
  city?: string | null;
  logo?: string | null;
}

export interface LoginResponse {
  userId: string;
  userName: string;
  email: string;
  prefix: string;
  firstName: string;
  lastName: string;
  token: string;
  companyName: string;
  timeZone: string;
  companyId: string;
  customerParticipationType: string;
  designation: string;
  departmentId: string | null;
  departmentName: string | null;
  roles: string[];
}

export interface AuthSession extends LoginResponse {
  associatedFacilities: Facility[];
  selectedFacility: Facility | null;
}