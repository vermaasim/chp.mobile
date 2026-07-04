import axios from 'axios';
import type {
  AttendanceAllowedLocation,
  AttendanceCoordinates,
  AttendanceEntry,
  MyAttendanceFilter,
} from '../types/attendance';
import forge from 'node-forge';
import { API_BASE_URL } from './config';
import { getOrCreatePrivateSigningKey } from '../storage/deviceKeys';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  //timeout: 15000,
});

function buildCanonicalString(method: string, path: string, timestampRaw: string, body: string) {
  const bodyDigest = forge.md.sha256.create();
  bodyDigest.update(body, 'utf8');
  const bodyHash = forge.util.encode64(bodyDigest.digest().getBytes());

  return `${timestampRaw.trim()}\n${method.toUpperCase()}\n${path}\n${bodyHash}`;
}

async function buildSigningHeaders(method: string, path: string, body: unknown) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const serializedBody = JSON.stringify(body ?? {});
  const canonical = buildCanonicalString(method, path, timestamp, serializedBody);

  const privateKeyPem = await getOrCreatePrivateSigningKey();
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const messageDigest = forge.md.sha256.create();
  messageDigest.update(canonical, 'utf8');
  const signature = forge.util.encode64(privateKey.sign(messageDigest));

  return {
    'X-Device-Timestamp': timestamp,
    'X-Device-Signature': signature,
  };
}

export async function loadAllowedAttendanceLocations(): Promise<AttendanceAllowedLocation[]> {
  const response = await apiClient.get<AttendanceAllowedLocation[]>('/api/attendance/allowed-locations');
  return response.data;
}

export function setAttendanceAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}

export async function checkInAttendance(
  coordinates: AttendanceCoordinates,
): Promise<AttendanceEntry> {
  const path = '/api/attendance/check-in';
  const signingHeaders = await buildSigningHeaders('POST', path, coordinates);
  const response = await apiClient.post<AttendanceEntry>(path, coordinates, {
    headers: signingHeaders,
  });

  return response.data;
}

export async function checkOutAttendance(
  coordinates: AttendanceCoordinates,
): Promise<AttendanceEntry> {
  const path = '/api/attendance/check-out';
  const signingHeaders = await buildSigningHeaders('POST', path, coordinates);
  const response = await apiClient.post<AttendanceEntry>(path, coordinates, {
    headers: signingHeaders,
  });

  return response.data;
}

export async function loadMyAttendance(
  filter: MyAttendanceFilter,
): Promise<AttendanceEntry[]> {
  const response = await apiClient.post<AttendanceEntry[]>('/api/attendance/mine', {
    Month: filter.month,
    Year: filter.year,
  });
  return response.data;
}
