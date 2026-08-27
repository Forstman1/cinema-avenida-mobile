import apiClient from './client';
import { request } from './errors';
import { normalizeReservation } from './normalizers';
import type {
  GetSeatsByScreeningIdRequest,
  GetSeatsByScreeningIdResponse,
  LockReservationRequest,
  LockReservationResponse,
} from '../types';

export async function getSeatsByScreeningId(
  screeningId: GetSeatsByScreeningIdRequest
): Promise<GetSeatsByScreeningIdResponse> {
  return request(apiClient.get<GetSeatsByScreeningIdResponse>(`/screenings/${screeningId}/seats`));
}

export async function lockSeats(
  payload: LockReservationRequest
): Promise<LockReservationResponse> {
  const reservation = await request(
    apiClient.post<LockReservationResponse>('/reservations/lock', payload)
  );
  return normalizeReservation(reservation);
}
