import { create } from 'zustand';

import { payReservation as payReservationRequest, type PayReservationResponse } from '../api/payments';
import { getMyReservations } from '../api/reservations';
import { getSeatsByScreeningId, lockSeats as lockSeatsRequest } from '../api/seats';
import type { Reservation, Seat, Ticket } from '../types';

export interface LoadSeatsOptions {
  showLoading?: boolean;
}

export interface ReservationStore {
  currentScreeningId: number | null;
  seats: Seat[];
  selectedSeatIds: number[];
  reservationId: number | null;
  pendingReservation: Reservation | null;
  confirmedReservation: PayReservationResponse | null;
  lockedUntil: string | null;
  paymentResult: PayReservationResponse | null;
  ticket: Ticket | null;
  isLoadingSeats: boolean;
  isLocking: boolean;
  isPaying: boolean;
  seatError: string | null;
  reservationError: string | null;
  loadSeats: (screeningId: number, options?: LoadSeatsOptions) => Promise<void>;
  loadPendingReservation: (screeningId: number) => Promise<void>;
  toggleSeat: (seatId: number) => void;
  deselectSeats: (seatIds: number[]) => void;
  clearReservationDraft: () => void;
  lockSelectedSeats: (screeningId: number) => Promise<Reservation>;
  payReservation: () => Promise<PayReservationResponse>;
  resetReservationFlow: () => void;
}

function getErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message ?? error?.message ?? fallback;
}

function getLockedUntil(reservation: Reservation | null): string | null {
  const values = (reservation?.reservationSeats ?? [])
    .map((reservationSeat) => reservationSeat.lockedUntil)
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value))
    );

  if (values.length === 0) return null;
  const [firstValue, ...remainingValues] = values;
  return remainingValues.reduce(
    (latest, value) => (Date.parse(value) > Date.parse(latest) ? value : latest),
    firstValue
  );
}

function getReservationSeatIds(reservation: Reservation): number[] {
  return (reservation.reservationSeats ?? [])
    .map((reservationSeat) => reservationSeat.seatId)
    .filter((seatId) => Number.isInteger(seatId));
}

function hasActiveLock(lockedUntil: string | null): boolean {
  return Boolean(lockedUntil && Date.parse(lockedUntil) > Date.now());
}

function emptyReservationState() {
  return {
    reservationId: null,
    pendingReservation: null,
    lockedUntil: null,
    reservationError: null,
  };
}

let reservationFlowGeneration = 0;

export const useReservationStore = create<ReservationStore>((set, get) => ({
  currentScreeningId: null,
  seats: [],
  selectedSeatIds: [],
  reservationId: null,
  pendingReservation: null,
  confirmedReservation: null,
  lockedUntil: null,
  paymentResult: null,
  ticket: null,
  isLoadingSeats: false,
  isLocking: false,
  isPaying: false,
  seatError: null,
  reservationError: null,

  loadSeats: async (screeningId, { showLoading = true } = {}) => {
    const screeningChanged = get().currentScreeningId !== screeningId;
    if (screeningChanged) {
      set({
        currentScreeningId: screeningId,
        seats: [],
        selectedSeatIds: [],
        ...emptyReservationState(),
        seatError: null,
      });
    }

    if (showLoading) set({ isLoadingSeats: true });
    set({ seatError: null });

    try {
      const seats = await getSeatsByScreeningId(screeningId);
      if (get().currentScreeningId !== screeningId) return;
      const availableSeatIds = new Set(
        seats.filter((seat) => seat.status === 'LIBRE').map((seat) => seat.id)
      );
      set({
        seats,
        selectedSeatIds: get().selectedSeatIds.filter((seatId) => availableSeatIds.has(seatId)),
        seatError: null,
      });
    } catch (error: any) {
      if (get().currentScreeningId === screeningId) {
        set({ seatError: getErrorMessage(error, 'Impossible de charger les sièges.') });
      }
    } finally {
      if (showLoading && get().currentScreeningId === screeningId) {
        set({ isLoadingSeats: false });
      }
    }
  },

  loadPendingReservation: async (screeningId) => {
    if (get().currentScreeningId !== screeningId) return;

    try {
      const reservations = await getMyReservations();
      if (get().currentScreeningId !== screeningId) return;

      const pending = reservations.find((reservation) => {
        if (reservation.status !== 'EN_ATTENTE' || reservation.screening?.id !== screeningId) {
          return false;
        }
        return hasActiveLock(getLockedUntil(reservation));
      }) ?? null;

      if (pending) {
        set({
          pendingReservation: pending,
          reservationId: pending.id,
          selectedSeatIds: getReservationSeatIds(pending),
          lockedUntil: getLockedUntil(pending),
          reservationError: null,
        });
      } else {
        set(emptyReservationState());
      }
    } catch {
      // Pending reservations are a convenience for resuming payment; a
      // failure here must not prevent the seat map from loading.
    }
  },

  toggleSeat: (seatId) => {
    const state = get();
    if (hasActiveLock(state.lockedUntil) || state.isLocking) return;

    const seat = state.seats.find((candidate) => candidate.id === seatId);
    if (!seat || seat.status !== 'LIBRE') return;

    const selected = state.selectedSeatIds.includes(seatId);
    set({
      selectedSeatIds: selected
        ? state.selectedSeatIds.filter((id) => id !== seatId)
        : [...state.selectedSeatIds, seatId],
      reservationError: null,
    });
  },

  deselectSeats: (seatIds) => {
    const unavailable = new Set(seatIds);
    set({
      selectedSeatIds: get().selectedSeatIds.filter((seatId) => !unavailable.has(seatId)),
    });
  },

  clearReservationDraft: () => {
    set({ selectedSeatIds: [], ...emptyReservationState() });
  },

  lockSelectedSeats: async (screeningId) => {
    const state = get();
    if (state.currentScreeningId !== screeningId) {
      throw new Error('La séance sélectionnée n\'est plus disponible.');
    }
    if (hasActiveLock(state.lockedUntil)) {
      throw new Error('Vous avez déjà une réservation en cours.');
    }
    if (state.selectedSeatIds.length === 0) {
      set({ reservationError: 'Veuillez sélectionner au moins un siège.' });
      throw new Error('Veuillez sélectionner au moins un siège.');
    }

    const selectedSeatIds = state.selectedSeatIds;
    const invalidSeat = selectedSeatIds.some((seatId) => {
      const seat = state.seats.find((candidate) => candidate.id === seatId);
      return !seat || seat.status !== 'LIBRE';
    });
    if (invalidSeat) {
      set({ reservationError: 'Certains sièges ne sont plus disponibles.' });
      throw new Error('Certains sièges ne sont plus disponibles.');
    }

    set({ isLocking: true, reservationError: null });
    try {
      const reservation = await lockSeatsRequest({ screeningId, seatIds: selectedSeatIds });
      if (get().currentScreeningId !== screeningId) {
        throw new Error('La séance sélectionnée n\'est plus disponible.');
      }
      set({
        reservationId: reservation.id,
        pendingReservation: reservation,
        lockedUntil: getLockedUntil(reservation),
        reservationError: null,
      });
      return reservation;
    } catch (error: any) {
      set({ reservationError: getErrorMessage(error, 'Impossible de verrouiller les sièges.') });
      throw error;
    } finally {
      set({ isLocking: false });
    }
  },

  payReservation: async () => {
    const state = get();
    const generation = reservationFlowGeneration;
    const reservationId = state.reservationId ?? state.pendingReservation?.id;
    if (!reservationId) {
      const error = new Error('Aucune réservation à payer.');
      set({ reservationError: error.message });
      throw error;
    }
    if (!hasActiveLock(state.lockedUntil)) {
      const error = new Error('Réservation expirée.');
      set({ reservationError: error.message });
      throw error;
    }

    set({ isPaying: true, reservationError: null });
    try {
      const result = await payReservationRequest(reservationId);
      if (generation !== reservationFlowGeneration) {
        throw new Error('La session de réservation a été réinitialisée.');
      }
      set({
        confirmedReservation: result,
        paymentResult: result,
        ticket: result.ticket,
        reservationError: null,
      });
      return result;
    } catch (error: any) {
      if (generation !== reservationFlowGeneration) {
        throw error;
      }
      set({ reservationError: getErrorMessage(error, 'Le paiement a échoué.') });
      throw error;
    } finally {
      if (generation === reservationFlowGeneration) {
        set({ isPaying: false });
      }
    }
  },

  resetReservationFlow: () => {
    reservationFlowGeneration += 1;
    set({
      currentScreeningId: null,
      seats: [],
      selectedSeatIds: [],
      ...emptyReservationState(),
      confirmedReservation: null,
      paymentResult: null,
      ticket: null,
      isLoadingSeats: false,
      isLocking: false,
      isPaying: false,
      seatError: null,
    });
  },
}));
