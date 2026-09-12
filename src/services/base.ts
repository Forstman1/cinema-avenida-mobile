import { getApiErrorDetails } from '../api/errors';

export class ServiceError extends Error {
  readonly statusCode?: number;
  readonly status: number | null;
  readonly body = null;
  readonly isNetworkError = false;
  readonly code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.status = statusCode ?? null;
    this.code = code;
  }
}

export abstract class BaseService {
  protected async handleApiError(error: unknown): Promise<never> {
    if (error instanceof ServiceError) {
      throw error;
    }

    const details = getApiErrorDetails(error);
    throw new ServiceError(
      details.message || 'Une erreur inattendue est survenue. Veuillez réessayer.',
      details.status ?? undefined,
      details.code,
    );
  }
}
