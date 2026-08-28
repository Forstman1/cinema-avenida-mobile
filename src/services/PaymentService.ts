import { Api } from '../api/api';
import { payReservationUrl } from '../api/endpoints';
import { request } from '../api/errors';
import { isPaidReservation, normalizeReservation } from '../api/normalizers';
import type {
  PayReservationApiResponse,
  PayReservationRequest,
  PayReservationResponse,
} from '../types';
import { BaseService, ServiceError } from './base';

class PaymentService extends BaseService {
  public async payReservation(
    reservationId: PayReservationRequest,
  ): Promise<PayReservationResponse> {
    try {
      const reservation = await request(
        Api().post<PayReservationApiResponse>(payReservationUrl(reservationId)),
      );
      const normalizedReservation = normalizeReservation(reservation);
      if (!isPaidReservation(normalizedReservation)) {
        throw new ServiceError(
          'Le paiement a réussi, mais le billet n’a pas été retourné par le serveur.',
        );
      }
      return normalizedReservation;
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}

export const PaymentServiceInstance = new PaymentService();
