import apiClient from './client';
import { request } from './errors';
import { isPaidReservation, normalizeReservation } from './normalizers';
import type {
  PayReservationApiResponse,
  PayReservationRequest,
  PayReservationResponse,
} from '../types';

export async function payReservation(
  reservationId: PayReservationRequest
): Promise<PayReservationResponse> {
  const reservation = await request(
    apiClient.post<PayReservationApiResponse>(`/reservations/${reservationId}/pay`)
  );
  const normalizedReservation = normalizeReservation(reservation);
  if (!isPaidReservation(normalizedReservation)) {
    throw new Error('Le paiement a réussi, mais le billet n’a pas été retourné par le serveur.');
  }
  return normalizedReservation;
}
