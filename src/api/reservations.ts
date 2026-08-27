import apiClient from './client';
import { request } from './errors';
import { normalizeReservation } from './normalizers';
import type {
  CancelReservationResponse,
  CancelReservationRequest,
  GetMyReservationsResponse,
} from '../types';

export async function getMyReservations(): Promise<GetMyReservationsResponse> {
  const reservations = await request(apiClient.get<GetMyReservationsResponse>('/reservations/me'));
  return reservations.map(normalizeReservation);
}

export async function cancelReservation(
  reservationId: CancelReservationRequest
): Promise<CancelReservationResponse> {
  return request(apiClient.delete<CancelReservationResponse>(`/reservations/${reservationId}`));
}
