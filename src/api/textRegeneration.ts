import axios from 'axios';
import { API_BASE_URL } from './config';

export type RegenerationLanguageHint = 'en' | 'hi' | 'auto';

export type RegenerationContextTextType = 'complaint' | 'assessment' | 'treatment' | 'dos_donts' | 'follow_up' | 'other';

export interface RegenerationContextEnvelope {
  textType?: RegenerationContextTextType;
  clinicalContext?: string;
  styleHints?: string;
}

export interface RegenerateTextRequest {
  sourceText: string;
  facilityId: string;
  idempotencyKey: string;
  languageHint?: RegenerationLanguageHint;
  context?: RegenerationContextEnvelope;
}

export interface RegenerateTextResponse {
  regeneratedText: string;
  detectedLanguage: 'en' | 'hi';
  isIdempotentReplay: boolean;
  isDedupeCacheHit: boolean;
  usageRecordId?: string;
  providerCost?: number | null;
  billableCost?: number | null;
  currency?: string;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

function withAuth(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function toFriendlyErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (error.response?.status === 429) {
    return 'AI limit reached. Try again in a minute.';
  }

  const responseData = error.response?.data;

  if (typeof responseData === 'string') {
    return responseData;
  }

  if (responseData && typeof responseData === 'object') {
    if ('message' in responseData && typeof responseData.message === 'string') {
      return responseData.message;
    }

    if ('title' in responseData && typeof responseData.title === 'string') {
      return responseData.title;
    }
  }

  return fallback;
}

function sanitizeRequest(request: RegenerateTextRequest): RegenerateTextRequest {
  const sourceText = request.sourceText.trim();
  const facilityId = request.facilityId.trim();
  const idempotencyKey = request.idempotencyKey.trim();

  if (!sourceText) {
    throw new Error('Please enter text before using AI rewrite.');
  }

  if (sourceText.length > 1000) {
    throw new Error('Text is too long for AI rewrite. Keep it under 1000 characters.');
  }

  if (!facilityId) {
    throw new Error('Facility is required for AI rewrite.');
  }

  if (facilityId.length > 100) {
    throw new Error('Facility identifier is too long for AI rewrite.');
  }

  if (!idempotencyKey) {
    throw new Error('Unable to process AI rewrite right now. Please try again.');
  }

  if (idempotencyKey.length > 100) {
    throw new Error('Unable to process AI rewrite right now. Please try again.');
  }

  const clinicalContext = request.context?.clinicalContext?.trim();
  const styleHints = request.context?.styleHints?.trim();

  if (clinicalContext && clinicalContext.length > 500) {
    throw new Error('Clinical context is too long for AI rewrite.');
  }

  if (styleHints && styleHints.length > 200) {
    throw new Error('Style hints are too long for AI rewrite.');
  }

  return {
    ...request,
    sourceText,
    facilityId,
    idempotencyKey,
    languageHint: request.languageHint ?? 'auto',
    context: request.context
      ? {
          textType: request.context.textType,
          clinicalContext,
          styleHints,
        }
      : undefined,
  };
}

export async function regenerateText(token: string, request: RegenerateTextRequest): Promise<RegenerateTextResponse> {
  const payload = sanitizeRequest(request);

  try {
    const response = await apiClient.post<RegenerateTextResponse>(
      '/api/ai-text-regeneration/regenerate',
      payload,
      withAuth(token),
    );
    return response.data;
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error, 'Unable to rewrite text right now. Please try again.'));
  }
}