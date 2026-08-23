import apiClient from './client';
import type { Reservation, Ticket } from '../types';

// Backend returns the reservation with the ticket nested inside it.
export type PayReservationResponse = Reservation & { ticket: Ticket };

export async function payReservation(reservationId: number): Promise<PayReservationResponse> {
  const response = await apiClient.post<PayReservationResponse>(`/reservations/${reservationId}/pay`);
  return response.data;
}
