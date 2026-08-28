import { create } from 'zustand';

import { getApiErrorMessage } from '../api/errors';
import { ReservationServiceInstance } from '../services/ReservationService';
import type { MovieReference, Reservation, ScreeningReference, Seat, Ticket } from '../types';

export interface CompletedBooking {
  userId: number | null;
  reservation: Reservation;
  ticket: Ticket;
  movie: MovieReference;
  screening: ScreeningReference;
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
let bookingsRequestId = 0;
let inFlightReservationsRequest: Promise<void> | null = null;

export const useBookingsStore = create<BookingsStore>((set, get) => {
  const loadReservations = (refresh: boolean): Promise<void> => {
    if (inFlightReservationsRequest) return inFlightReservationsRequest;

    const generation = bookingsGeneration;
    const requestId = ++bookingsRequestId;
    const hasCachedReservations = get().reservations.length > 0;
    set({
      isLoadingReservations: !hasCachedReservations,
      isRefreshingReservations: hasCachedReservations || refresh,
      reservationsError: null,
    });

    let request: Promise<void> | null = null;
    request = (async () => {
      try {
        const reservations = await ReservationServiceInstance.getMyReservations();
        if (generation !== bookingsGeneration || requestId !== bookingsRequestId) return;
        set({ reservations, reservationsError: null });
      } catch (error: unknown) {
        if (generation !== bookingsGeneration || requestId !== bookingsRequestId) return;
        set({ reservationsError: getApiErrorMessage(error, 'Impossible de charger vos réservations.') });
      } finally {
        if (generation === bookingsGeneration && requestId === bookingsRequestId) {
          set({ isLoadingReservations: false, isRefreshingReservations: false });
        }
        if (inFlightReservationsRequest === request) inFlightReservationsRequest = null;
      }
    })();

    const startedRequest = request as Promise<void>;
    inFlightReservationsRequest = startedRequest;
    return startedRequest;
  };

  return {
    reservations: [],
    isLoadingReservations: false,
    isRefreshingReservations: false,
    reservationsError: null,
    cancellationError: null,
    cancellingReservationId: null,
    lastCompletedBooking: null,
    selectedBooking: null,

    fetchMyReservations: async () => {
      await loadReservations(false);
    },

    refreshMyReservations: async () => {
      await loadReservations(true);
    },

    cancelReservation: async (reservationId) => {
      if (get().cancellingReservationId !== null) return;

      const generation = bookingsGeneration;
      bookingsRequestId += 1;
      inFlightReservationsRequest = null;
      set({ cancellingReservationId: reservationId, cancellationError: null });
      try {
        await ReservationServiceInstance.cancelReservation(reservationId);
        if (generation !== bookingsGeneration) return;

        const updatedReservations = get().reservations.map((reservation) =>
          reservation.id === reservationId ? markReservationCancelled(reservation) : reservation
        );

        const updateCompletedBooking = (booking: CompletedBooking | null) => {
          if (!booking || booking.reservation.id !== reservationId) return booking;
          return {
            ...booking,
            reservation: markReservationCancelled(booking.reservation),
            ticket: { ...booking.ticket, status: 'CANCELLED' as const },
          };
        };

        set({
          reservations: updatedReservations,
          lastCompletedBooking: updateCompletedBooking(get().lastCompletedBooking),
          selectedBooking: updateCompletedBooking(get().selectedBooking),
          cancellationError: null,
        });

        // Reconcile with the backend after the successful DELETE. If this
        // optional follow-up fails, the confirmed local cancellation remains.
        const reconciliationRequestId = ++bookingsRequestId;
        try {
          const reservations = await ReservationServiceInstance.getMyReservations();
          if (generation !== bookingsGeneration || reconciliationRequestId !== bookingsRequestId) return;
          set({ reservations });
        } catch {
          // The DELETE already succeeded, so keep the reconciled local state.
        }
      } catch (error: unknown) {
        const message = getApiErrorMessage(error, 'Impossible d\'annuler la réservation.');
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
      bookingsRequestId += 1;
      inFlightReservationsRequest = null;
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
  };
});
