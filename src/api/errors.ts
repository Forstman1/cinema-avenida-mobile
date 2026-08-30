import { ApiTransportError, type ApiResponse } from './api';
import type { ApiError, ApiErrorBody, ApiErrorDetails } from '../types';

const NETWORK_ERROR_MESSAGE =
  "Impossible de joindre le serveur. Vérifiez l'adresse IP ou votre connexion.";

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
      return "Vous n'êtes pas autorisé à effectuer cette action.";
    case 404:
      return 'Ressource introuvable.';
    case 409:
      return "Cette action est en conflit avec l'état actuel.";
    case 410:
      return 'La réservation a expiré.';
    default:
      return 'Une erreur est survenue.';
  }
}

function getBodyMessage(body: ApiErrorBody | string | null): string | null {
  if (typeof body === 'string' && body.trim()) return body;
  if (!isRecord(body)) return null;
  if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  if (Array.isArray(body?.message) && body.message.length > 0) return body.message.join(', ');
  if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  return null;
}

/** Extracts the safe app error, HTTP status, backend body, and optional code. */
export function getApiErrorDetails(error: unknown): ApiErrorDetails {
  if (error instanceof ApiTransportError) {
    const body = isApiErrorBody(error.body) ? error.body : null;
    return {
      message:
        getBodyMessage(error.body) ?? getStatusMessage(error.status, error.isNetworkError),
      ...(error.code ? { code: error.code } : {}),
      status: error.status,
      body,
      isNetworkError: error.isNetworkError,
    };
  }

  if (isApiErrorDetails(error)) return error;

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

export function getScreeningMutationErrorMessage(
  error: unknown,
  action: 'update' | 'delete',
): string {
  const code = getApiErrorDetails(error).code;
  switch (code) {
    case 'SCREENING_NOT_FOUND':
      return 'Cette séance est introuvable. Elle a peut-être déjà été supprimée.';
    case 'SCREENING_HAS_RESERVATIONS':
      return action === 'delete'
        ? 'Impossible de supprimer cette séance : des réservations existent déjà.'
        : 'Cette séance ne peut pas être modifiée car elle comporte des réservations.';
    case 'SCREENING_PAST_READ_ONLY':
      return 'Cette séance est passée et ne peut plus être modifiée.';
    case 'SCREENING_SLOT_CONFLICT':
      return 'Ce créneau est déjà occupé pour cette date.';
    case 'SCREENING_IN_PAST':
      return action === 'delete'
        ? 'Une séance passée ne peut pas être supprimée.'
        : 'Une séance passée ne peut pas être modifiée.';
    case 'SCREENING_CONFLICT':
      return 'Cette séance entre en conflit avec une autre séance.';
    default:
      return getApiErrorMessage(
        error,
        action === 'delete'
          ? 'Impossible de supprimer la séance.'
          : 'Impossible de modifier la séance.',
      );
  }
}

/** Resolves a transport response to its data and converts failures to typed errors. */
export async function request<T>(requestPromise: Promise<ApiResponse<T>>): Promise<T> {
  try {
    const response = await requestPromise;
    return response.data;
  } catch (error: unknown) {
    throw getApiErrorDetails(error);
  }
}
