import { create } from 'zustand';

import { cancelReservation as cancelReservationRequest, getMyReservations } from '../api/reservations';
import type { Movie, Reservation, Screening, Seat, Ticket } from '../types';
import { useAuthStore } from './authStore';

export interface CompletedBooking {
  userId: number | null;
  reservation: Reservation;
  ticket: Ticket;
  movie: Movie;
  screening: Screening;
  seats: Seat[];
}

export interface BookingsStore {
  reservations: Reservation[];
  isLoadingReservations: boolean;
  isRefreshingReservations: boolean;
  reservationsError: string | null;
  cancellationError: string | null;
  cancellingReservationId: number | null;
  lastCompletedBooking: CompletedBooking | null;
  selectedBooking: CompletedBooking | null;
  fetchMyReservations: () => Promise<void>;
  refreshMyReservations: () => Promise<void>;
  cancelReservation: (reservationId: number) => Promise<void>;
  setLastCompletedBooking: (booking: CompletedBooking) => void;
  selectBooking: (booking: CompletedBooking | null) => void;
  clearBookings: () => void;
  clearLastCompletedBooking: () => void;
}

function getErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message ?? error?.message ?? fallback;
}

function markReservationCancelled(reservation: Reservation): Reservation {
  return {
    ...reservation,
    status: 'CANCELLED',
    ticket: reservation.ticket
      ? { ...reservation.ticket, status: 'CANCELLED' }
      : reservation.ticket,
  };
}

let bookingsGeneration = 0;

export const useBookingsStore = create<BookingsStore>((set, get) => ({
  reservations: [],
  isLoadingReservations: false,
  isRefreshingReservations: false,
  reservationsError: null,
  cancellationError: null,
  cancellingReservationId: null,
  lastCompletedBooking: null,
  selectedBooking: null,

  fetchMyReservations: async () => {
    const generation = bookingsGeneration;
    set({ isLoadingReservations: true, reservationsError: null });
    try {
      const reservations = await getMyReservations();
      if (generation !== bookingsGeneration) return;
      set({ reservations, reservationsError: null });
    } catch (error: any) {
      if (generation !== bookingsGeneration) return;
      set({ reservationsError: getErrorMessage(error, 'Impossible de charger vos réservations.') });
    } finally {
      if (generation === bookingsGeneration) {
        set({ isLoadingReservations: false });
      }
    }
  },

  refreshMyReservations: async () => {
    const generation = bookingsGeneration;
    set({ isRefreshingReservations: true, reservationsError: null });
    try {
      const reservations = await getMyReservations();
      if (generation !== bookingsGeneration) return;
      set({ reservations, reservationsError: null });
    } catch (error: any) {
      if (generation !== bookingsGeneration) return;
      set({ reservationsError: getErrorMessage(error, 'Impossible de charger vos réservations.') });
    } finally {
      if (generation === bookingsGeneration) {
        set({ isRefreshingReservations: false });
      }
    }
  },

  cancelReservation: async (reservationId) => {
    if (get().cancellingReservationId !== null) return;

    const generation = bookingsGeneration;
    set({ cancellingReservationId: reservationId, cancellationError: null });
    try {
      await cancelReservationRequest(reservationId);
      if (generation !== bookingsGeneration) return;

      const updatedReservations = get().reservations.map((reservation) =>
        reservation.id === reservationId ? markReservationCancelled(reservation) : reservation
      );

      const updateCompletedBooking = (booking: CompletedBooking | null) => {
        if (!booking || booking.reservation.id !== reservationId) return booking;
        return {
          ...booking,
          reservation: markReservationCancelled(booking.reservation),
          ticket: { ...booking.ticket, status: 'CANCELLED' },
        };
      };

      set({
        reservations: updatedReservations,
        lastCompletedBooking: updateCompletedBooking(get().lastCompletedBooking),
        selectedBooking: updateCompletedBooking(get().selectedBooking),
        cancellationError: null,
      });

      // Reconcile with the backend after the successful DELETE. If this
      // follow-up request fails, the confirmed local cancellation remains.
      try {
        const reservations = await getMyReservations();
        if (generation !== bookingsGeneration) return;
        set({ reservations });
      } catch {
        // The DELETE already succeeded, so keep the reconciled local state.
      }
    } catch (error: any) {
      const message = getErrorMessage(error, 'Impossible d\'annuler la réservation.');
      if (generation !== bookingsGeneration) return;
      set({ cancellationError: message });
      throw error;
    } finally {
      if (generation === bookingsGeneration) {
        set({ cancellingReservationId: null });
      }
    }
  },

  setLastCompletedBooking: (booking) => {
    set({ lastCompletedBooking: booking, selectedBooking: booking });
  },

  selectBooking: (booking) => {
    set({ selectedBooking: booking });
  },

  clearBookings: () => {
    bookingsGeneration += 1;
    set({
      reservations: [],
      isLoadingReservations: false,
      isRefreshingReservations: false,
      reservationsError: null,
      cancellationError: null,
      cancellingReservationId: null,
      lastCompletedBooking: null,
      selectedBooking: null,
    });
  },

  clearLastCompletedBooking: () => {
    const lastCompletedBooking = get().lastCompletedBooking;
    set({
      lastCompletedBooking: null,
      selectedBooking:
        get().selectedBooking?.reservation.id === lastCompletedBooking?.reservation.id
          ? null
          : get().selectedBooking,
    });
  },
}));

// Bookings and completed tickets are account-scoped, unlike catalogue data.
// Clear them whenever the Phase 1 auth store changes user or logs out.
let knownUserId = useAuthStore.getState().user?.id ?? null;
useAuthStore.subscribe((state) => {
  const nextUserId = state.user?.id ?? null;
  if (nextUserId !== knownUserId) {
    knownUserId = nextUserId;
    useBookingsStore.getState().clearBookings();
  }
});
