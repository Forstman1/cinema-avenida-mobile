import { Api } from '../api/api';
import { lockReservationUrl, seatsByScreeningIdUrl } from '../api/endpoints';
import { request } from '../api/errors';
import { normalizeReservation } from '../api/normalizers';
import type {
  GetSeatsByScreeningIdResponse,
  LockReservationRequest,
  LockReservationResponse,
} from '../types';
import { BaseService } from './base';

class SeatService extends BaseService {
  public async getSeatsByScreeningId(screeningId: number): Promise<GetSeatsByScreeningIdResponse> {
    try {
      return await request(
        Api().get<GetSeatsByScreeningIdResponse>(seatsByScreeningIdUrl(screeningId)),
      );
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async lockSeats(payload: LockReservationRequest): Promise<LockReservationResponse> {
    try {
      const reservation = await request(
        Api().post<LockReservationResponse>(lockReservationUrl(), payload),
      );
      return normalizeReservation(reservation);
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}

export const SeatServiceInstance = new SeatService();
