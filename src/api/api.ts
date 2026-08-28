import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../config/api';
import type { ApiErrorBody } from '../types';

const TOKEN_STORAGE_KEY = 'token';

type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export interface ApiRequestOptions {
  params?: object;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export class ApiTransportError extends Error {
  readonly status: number | null;
  readonly body: ApiErrorBody | string | null;
  readonly code?: string;
  readonly isNetworkError: boolean;

  constructor({
    message,
    status = null,
    body = null,
    code,
    isNetworkError = false,
  }: {
    message: string;
    status?: number | null;
    body?: ApiErrorBody | string | null;
    code?: string;
    isNetworkError?: boolean;
  }) {
    super(message);
    this.name = 'ApiTransportError';
    this.status = status;
    this.body = body;
    this.code = code;
    this.isNetworkError = isNetworkError;
  }
}

let unauthorizedHandler: (() => void | Promise<void>) | null = null;

/** Registers the app-level response to an expired authenticated session. */
export function setUnauthorizedHandler(handler: () => void | Promise<void>): void {
  unauthorizedHandler = handler;
}

/**
 * The app currently has one configured API base URL. The optional version
 * keeps the call shape compatible with services that may need versioned APIs.
 */
export function Api(_apiVersion?: string) {
  return apiClient;
}

function buildUrl(path: string, params?: object): string {
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (params) {
    Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
      } else {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getHeader(headers: Headers, name: string): string | null {
  return headers.get(name) ?? headers.get(name.toLowerCase());
}

function getErrorMessage(body: ApiErrorBody | string | null, status: number): string {
  if (typeof body === 'string' && body.trim()) return body;
  if (isRecord(body)) {
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
    if (Array.isArray(body.message) && body.message.length > 0) {
      return body.message.join(', ');
    }
    if (typeof body.error === 'string' && body.error.trim()) return body.error;
  }
  return `La requête a échoué (${status}).`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function persistResponseTokens(headers: Headers): Promise<void> {
  const token = getHeader(headers, 'token');
  if (token) await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
}

async function request<T>(
  path: string,
  method: HttpMethod,
  payload?: unknown,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = buildUrl(path, options.params);
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let body: string | undefined;
  if (payload !== undefined && payload !== null) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, { method, headers, body });
    await persistResponseTokens(response.headers);
    const data = await parseResponseBody(response);

    if (!response.ok) {
      const errorBody = isRecord(data) || typeof data === 'string' ? data : null;
      if (response.status === 401 && token && unauthorizedHandler) {
        await unauthorizedHandler();
      }
      throw new ApiTransportError({
        message: getErrorMessage(errorBody, response.status),
        status: response.status,
        body: errorBody,
        code: isRecord(errorBody) && typeof errorBody.code === 'string' ? errorBody.code : undefined,
      });
    }

    return { data: data as T, status: response.status, headers: response.headers };
  } catch (error: unknown) {
    if (error instanceof ApiTransportError) throw error;
    throw new ApiTransportError({
      message: error instanceof Error ? error.message : 'Impossible de joindre le serveur.',
      code: error instanceof Error ? undefined : 'ERR_NETWORK',
      isNetworkError: true,
    });
  }
}

const apiClient = {
  get<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(path, 'GET', undefined, options);
  },
  post<T>(path: string, payload?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(path, 'POST', payload, options);
  },
  put<T>(path: string, payload?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(path, 'PUT', payload, options);
  },
  patch<T>(path: string, payload?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(path, 'PATCH', payload, options);
  },
  delete<T>(path: string, payload?: unknown, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return request<T>(path, 'DELETE', payload, options);
  },
};

export default Api;
