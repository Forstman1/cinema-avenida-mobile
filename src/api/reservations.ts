import apiClient from './client';
import type { Reservation } from '../types';

export async function getMyReservations(): Promise<Reservation[]> {
  const response = await apiClient.get<Reservation[]>('/reservations/me');
  return response.data;
}

export async function cancelReservation(reservationId: number): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(`/reservations/${reservationId}`);
  return response.data;
}
