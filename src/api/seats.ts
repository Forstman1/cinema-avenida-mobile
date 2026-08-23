import apiClient from './client';
import type { Seat, Reservation } from '../types';

export async function getSeatsByScreeningId(screeningId: number): Promise<Seat[]> {
  const response = await apiClient.get<Seat[]>(`/screenings/${screeningId}/seats`);
  return response.data;
}

export interface LockReservationPayload {
  screeningId: number;
  seatIds: number[];
}

// Backend returns the created reservation directly (not wrapped in { reservation }).
export type LockReservationSuccess = Reservation;

export interface UnavailableSeat {
  id: number;
  row: string;
  number: number;
}

export interface LockReservationConflict {
  message: string;
  seats: UnavailableSeat[];
}

export async function lockSeats(
  payload: LockReservationPayload
): Promise<LockReservationSuccess> {
  const response = await apiClient.post<LockReservationSuccess>('/reservations/lock', payload);
  return response.data;
}
