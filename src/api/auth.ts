import axios from 'axios';
import { API_BASE_URL } from './config';
import type { Facility, LoginResponse, MobileLoginRequest } from '../types/auth';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 20000,
});

function logAuthTiming(step: string, startedAt: number) {
  if (!__DEV__) {
    return;
  }

  const elapsedMs = Date.now() - startedAt;
  console.info(`[auth-timing] ${step} took ${elapsedMs}ms`);
}

function toFriendlyErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'Login failed. Please try again.';
  }

  const responseData = error.response?.data;
  const statusCode = error.response?.status;
  let serverMessage: string | null = null;

  if (typeof responseData === 'string') {
    serverMessage = responseData;
  } else if (responseData && typeof responseData === 'object') {
    if ('message' in responseData && typeof responseData.message === 'string') {
      serverMessage = responseData.message;
    } else if ('title' in responseData && typeof responseData.title === 'string') {
      serverMessage = responseData.title;
    } else if ('errors' in responseData && responseData.errors && typeof responseData.errors === 'object') {
      const firstError = Object.values(responseData.errors)[0];

      if (Array.isArray(firstError)) {
        serverMessage = typeof firstError[0] === 'string' ? firstError[0] : null;
      } else if (typeof firstError === 'string') {
        serverMessage = firstError;
      }
    }
  }

  if (statusCode === 401) {
    return serverMessage ?? 'Username or password is incorrect.';
  }

  if (statusCode === 400) {
    return serverMessage ?? 'Invalid login request. Please verify your credentials and device information.';
  }

  return serverMessage ?? 'Unable to sign in right now. Please try again.';
}

export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}

export async function login(payload: MobileLoginRequest): Promise<LoginResponse> {
  const startedAt = Date.now();

  try {
    const response = await apiClient.post<LoginResponse>('/api/account/login', {
      userName: payload.userName,
      password: payload.password,
    });
    logAuthTiming('POST /api/account/login', startedAt);
    return response.data;
  } catch (error) {
    // Fallback for environments still using the dedicated mobile-login endpoint.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      try {
        const fallbackStartedAt = Date.now();
        const mobileResponse = await apiClient.post<LoginResponse>('/api/account/mobile-login', payload);
        logAuthTiming('POST /api/account/mobile-login', fallbackStartedAt);
        return mobileResponse.data;
      } catch (mobileLoginError) {
        throw new Error(toFriendlyErrorMessage(mobileLoginError));
      }
    }

    throw new Error(toFriendlyErrorMessage(error));
  }
}

export async function loadMyFacilities(): Promise<Facility[]> {
  const startedAt = Date.now();

  try {
    const response = await apiClient.get<Facility[]>('/api/facility/my');
    logAuthTiming('GET /api/facility/my', startedAt);
    return response.data;
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error));
  }
}