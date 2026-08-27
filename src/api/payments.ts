import apiClient from './client';
import { request } from './errors';
import { normalizeReservation } from './normalizers';
import type {
  PayReservationRequest,
  PayReservationResponse,
} from '../types';

export async function payReservation(
  reservationId: PayReservationRequest
): Promise<PayReservationResponse> {
  const reservation = await request(
    apiClient.post<PayReservationResponse>(`/reservations/${reservationId}/pay`)
  );
  return normalizeReservation(reservation) as PayReservationResponse;
}
