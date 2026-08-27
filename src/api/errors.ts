import axios, { type AxiosResponse } from 'axios';

import type { ApiError, ApiErrorBody, ApiErrorDetails } from '../types';

const NETWORK_ERROR_MESSAGE =
  'Impossible de joindre le serveur. Vérifiez l\'adresse IP ou votre connexion.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return isRecord(value);
}

function isApiErrorDetails(value: unknown): value is ApiErrorDetails {
  return (
    isRecord(value) &&
    typeof value.message === 'string' &&
    ('status' in value || 'isNetworkError' in value)
  );
}

export function isApiError(value: unknown): value is ApiError {
  return isRecord(value) && typeof value.message === 'string';
}

function getStatusMessage(status: number | null, isNetworkError: boolean): string {
  if (isNetworkError) return NETWORK_ERROR_MESSAGE;
  switch (status) {
    case 400:
      return 'La requête est invalide.';
    case 401:
      return 'Votre session a expiré. Veuillez vous reconnecter.';
    case 403:
      return 'Vous n\'êtes pas autorisé à effectuer cette action.';
    case 404:
      return 'Ressource introuvable.';
    case 409:
      return 'Cette action est en conflit avec l\'état actuel.';
    case 410:
      return 'La réservation a expiré.';
    default:
      return 'Une erreur est survenue.';
  }
}

function getBodyMessage(body: ApiErrorBody | null): string | null {
  if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  if (Array.isArray(body?.message) && body.message.length > 0) return body.message.join(', ');
  if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  return null;
}

/** Extracts the safe app error, HTTP status, backend body, and optional code. */
export function getApiErrorDetails(error: unknown): ApiErrorDetails {
  if (isApiErrorDetails(error)) return error;

  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const status = error.response?.status ?? null;
    const body = isApiErrorBody(error.response?.data) ? error.response.data : null;
    const isNetworkError = !error.response;
    return {
      message: getBodyMessage(body) ?? getStatusMessage(status, isNetworkError),
      ...(body?.code || error.code ? { code: body?.code ?? error.code } : {}),
      status,
      body,
      isNetworkError,
    };
  }

  if (isApiError(error)) {
    return {
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
      status: null,
      body: null,
      isNetworkError: false,
    };
  }

  return {
    message: error instanceof Error && error.message ? error.message : NETWORK_ERROR_MESSAGE,
    status: null,
    body: null,
    isNetworkError: true,
  };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const details = getApiErrorDetails(error);
  return details.message || fallback;
}

/** Resolves an Axios request to its data and converts failures to typed errors. */
export async function request<T>(requestPromise: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await requestPromise;
    return response.data;
  } catch (error: unknown) {
    throw getApiErrorDetails(error);
  }
}
