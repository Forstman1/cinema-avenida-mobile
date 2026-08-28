import { Api } from '../api/api';
import { reservationByIdUrl, reservationsUrl } from '../api/endpoints';
import { request } from '../api/errors';
import { normalizeReservation } from '../api/normalizers';
import type {
  CancelReservationResponse,
  GetMyReservationsResponse,
} from '../types';
import { BaseService } from './base';

class ReservationService extends BaseService {
  public async getMyReservations(): Promise<GetMyReservationsResponse> {
    try {
      const reservations = await request(
        Api().get<GetMyReservationsResponse>(reservationsUrl()),
      );
      return reservations.map(normalizeReservation);
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async cancelReservation(reservationId: number): Promise<CancelReservationResponse> {
    try {
      return await request(
        Api().delete<CancelReservationResponse>(reservationByIdUrl(reservationId)),
      );
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}

export const ReservationServiceInstance = new ReservationService();
