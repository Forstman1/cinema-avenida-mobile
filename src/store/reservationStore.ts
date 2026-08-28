import { create } from 'zustand';

import { getApiErrorMessage } from '../api/errors';
import { PaymentServiceInstance } from '../services/PaymentService';
import { ReservationServiceInstance } from '../services/ReservationService';
import { SeatServiceInstance } from '../services/SeatService';
import { getReservationLockExpiry, RESERVATION_EXPIRED_MESSAGE } from '../utils/reservation-lock';
import type { PayReservationResponse, Reservation, Seat, Ticket } from '../types';

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
  lockedUntil: number | null;
  paymentResult: PayReservationResponse | null;
  ticket: Ticket | null;
  isLoadingSeats: boolean;
  isRefreshingSeats: boolean;
  isLoadingPendingReservation: boolean;
  isLocking: boolean;
  isPaying: boolean;
  seatError: string | null;
  reservationError: string | null;
  loadSeats: (screeningId: number, options?: LoadSeatsOptions) => Promise<void>;
  loadPendingReservation: (screeningId: number) => Promise<void>;
  hydrateReservation: (reservation: Reservation, seats?: Seat[]) => void;
  toggleSeat: (seatId: number) => void;
  deselectSeats: (seatIds: number[]) => void;
  clearReservationDraft: () => void;
  expirePendingReservation: (screeningId: number | null) => Promise<void>;
  lockSelectedSeats: (screeningId: number) => Promise<Reservation>;
  payReservation: () => Promise<PayReservationResponse>;
  resetReservationFlow: () => void;
}

function getReservationSeatIds(reservation: Reservation): number[] {
  return (reservation.reservationSeats ?? [])
    .map((reservationSeat) => reservationSeat.seatId)
    .filter((seatId) => Number.isInteger(seatId));
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
const inFlightSeats = new Map<number, Promise<void>>();
const seatRequestIds = new Map<number, number>();
const inFlightPendingReservations = new Map<number, Promise<void>>();
const pendingRequestIds = new Map<number, number>();

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
  isRefreshingSeats: false,
  isLoadingPendingReservation: false,
  isLocking: false,
  isPaying: false,
  seatError: null,
  reservationError: null,

  loadSeats: async (screeningId, { showLoading = true } = {}) => {
    const screeningChanged = get().currentScreeningId !== screeningId;
    if (screeningChanged) {
      reservationFlowGeneration += 1;
      inFlightSeats.clear();
      inFlightPendingReservations.clear();
      seatRequestIds.clear();
      pendingRequestIds.clear();
      set({
        currentScreeningId: screeningId,
        seats: [],
        selectedSeatIds: [],
        ...emptyReservationState(),
        confirmedReservation: null,
        paymentResult: null,
        ticket: null,
        isLocking: false,
        isPaying: false,
        seatError: null,
      });
    }

    const existingRequest = inFlightSeats.get(screeningId);
    if (existingRequest) return existingRequest;

    const generation = reservationFlowGeneration;
    const requestId = (seatRequestIds.get(screeningId) ?? 0) + 1;
    seatRequestIds.set(screeningId, requestId);
    const hasCachedSeats = get().currentScreeningId === screeningId && get().seats.length > 0;
    set({
      isLoadingSeats: showLoading && !hasCachedSeats,
      isRefreshingSeats: hasCachedSeats,
      seatError: null,
    });

    let request: Promise<void> | null = null;
    request = (async () => {
      try {
        const seats = await SeatServiceInstance.getSeatsByScreeningId(screeningId);
        if (
          generation !== reservationFlowGeneration ||
          get().currentScreeningId !== screeningId ||
          seatRequestIds.get(screeningId) !== requestId
        ) return;
        const availableSeatIds = new Set(
          seats.filter((seat) => seat.status === 'LIBRE').map((seat) => seat.id)
        );
        set({
          seats,
          selectedSeatIds: get().selectedSeatIds.filter((seatId) => availableSeatIds.has(seatId)),
          seatError: null,
        });
      } catch (error: unknown) {
        if (
          generation !== reservationFlowGeneration ||
          get().currentScreeningId !== screeningId ||
          seatRequestIds.get(screeningId) !== requestId
        ) return;
        set({ seatError: getApiErrorMessage(error, 'Impossible de charger les sièges.') });
      } finally {
        if (
          generation === reservationFlowGeneration &&
          get().currentScreeningId === screeningId &&
          seatRequestIds.get(screeningId) === requestId
        ) {
          set({ isLoadingSeats: false, isRefreshingSeats: false });
        }
        if (inFlightSeats.get(screeningId) === request) inFlightSeats.delete(screeningId);
      }
    })();

    inFlightSeats.set(screeningId, request);
    return request;
  },

  loadPendingReservation: async (screeningId) => {
    if (get().currentScreeningId !== screeningId) return;

    const existingRequest = inFlightPendingReservations.get(screeningId);
    if (existingRequest) return existingRequest;

    const generation = reservationFlowGeneration;
    const requestId = (pendingRequestIds.get(screeningId) ?? 0) + 1;
    pendingRequestIds.set(screeningId, requestId);
    set({ isLoadingPendingReservation: true, reservationError: null });

    let request: Promise<void> | null = null;
    request = (async () => {
      try {
        const reservations = await ReservationServiceInstance.getMyReservations();
        if (
          generation !== reservationFlowGeneration ||
          get().currentScreeningId !== screeningId ||
          pendingRequestIds.get(screeningId) !== requestId
        ) return;

        const pending = reservations.find((reservation) => {
          if (reservation.status !== 'EN_ATTENTE' || reservation.screening?.id !== screeningId) {
            return false;
          }
          const lockExpiry = getReservationLockExpiry(reservation);
          return lockExpiry !== null && lockExpiry > Date.now();
        }) ?? null;

        if (pending) {
          const lockExpiry = getReservationLockExpiry(pending);
          set({
            pendingReservation: pending,
            reservationId: pending.id,
            selectedSeatIds: getReservationSeatIds(pending),
            lockedUntil: lockExpiry,
            reservationError: null,
          });
        } else {
          set(emptyReservationState());
        }
      } catch {
        // Pending reservations are optional resume data; a failed lookup must
        // not prevent the seat map from loading or replace a valid draft.
      } finally {
        if (
          generation === reservationFlowGeneration &&
          get().currentScreeningId === screeningId &&
          pendingRequestIds.get(screeningId) === requestId
        ) {
          set({ isLoadingPendingReservation: false });
        }
        if (inFlightPendingReservations.get(screeningId) === request) {
          inFlightPendingReservations.delete(screeningId);
        }
      }
    })();

    inFlightPendingReservations.set(screeningId, request);
    return request;
  },

  hydrateReservation: (reservation, seats = []) => {
    reservationFlowGeneration += 1;
    inFlightSeats.clear();
    inFlightPendingReservations.clear();
    seatRequestIds.clear();
    pendingRequestIds.clear();
    const reservationSeatIds = getReservationSeatIds(reservation);
    const screeningId = reservation.screening?.id ?? null;

    set({
      currentScreeningId: screeningId,
      seats: seats.length > 0 ? seats : get().seats,
      selectedSeatIds: reservationSeatIds.length > 0
        ? reservationSeatIds
        : seats.map((seat) => seat.id),
      reservationId: reservation.id,
      pendingReservation: reservation,
      lockedUntil: getReservationLockExpiry(reservation),
      reservationError: null,
    });
  },

  toggleSeat: (seatId) => {
    const state = get();
    const lockExpiry = getReservationLockExpiry(state.pendingReservation);
    if ((lockExpiry !== null && lockExpiry > Date.now()) || state.isLocking) return;

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
    reservationFlowGeneration += 1;
    inFlightSeats.clear();
    inFlightPendingReservations.clear();
    seatRequestIds.clear();
    pendingRequestIds.clear();
    set({
      selectedSeatIds: [],
      ...emptyReservationState(),
      isLoadingSeats: false,
      isRefreshingSeats: false,
      isLoadingPendingReservation: false,
      isLocking: false,
      isPaying: false,
    });
  },

  expirePendingReservation: async (screeningId) => {
    const state = get();
    const hasMatchingDraft =
      screeningId !== null &&
      state.currentScreeningId === screeningId &&
      (state.pendingReservation !== null || state.lockedUntil !== null);

    if (hasMatchingDraft) get().clearReservationDraft();
    if (screeningId !== null) {
      await get().loadSeats(screeningId, { showLoading: false });
      await get().loadPendingReservation(screeningId);
    }
    set({ reservationError: RESERVATION_EXPIRED_MESSAGE });
  },

  lockSelectedSeats: async (screeningId) => {
    const state = get();
    if (state.isLocking || state.isPaying) {
      throw new Error('Une action de réservation est déjà en cours.');
    }
    if (state.currentScreeningId !== screeningId) {
      throw new Error('La séance sélectionnée n\'est plus disponible.');
    }
    const lockExpiry = getReservationLockExpiry(state.pendingReservation);
    if (lockExpiry !== null && lockExpiry > Date.now()) {
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

    const generation = reservationFlowGeneration;
    set({ isLocking: true, reservationError: null });
    try {
      const reservation = await SeatServiceInstance.lockSeats({ screeningId, seatIds: selectedSeatIds });
      if (
        generation !== reservationFlowGeneration ||
        get().currentScreeningId !== screeningId
      ) {
        throw new Error('La séance sélectionnée n\'est plus disponible.');
      }
      set({
        reservationId: reservation.id,
        pendingReservation: reservation,
        lockedUntil: getReservationLockExpiry(reservation),
        reservationError: null,
      });
      return reservation;
    } catch (error: unknown) {
      if (generation === reservationFlowGeneration) {
        set({ reservationError: getApiErrorMessage(error, 'Impossible de verrouiller les sièges.') });
      }
      throw error;
    } finally {
      if (generation === reservationFlowGeneration) set({ isLocking: false });
    }
  },

  payReservation: async () => {
    const state = get();
    const generation = reservationFlowGeneration;
    if (state.isPaying || state.isLocking) {
      throw new Error('Une action de réservation est déjà en cours.');
    }
    const reservationId = state.reservationId ?? state.pendingReservation?.id;
    if (!reservationId) {
      const error = new Error('Aucune réservation à payer.');
      set({ reservationError: error.message });
      throw error;
    }
    const lockExpiry = getReservationLockExpiry(state.pendingReservation);
    if (lockExpiry === null || lockExpiry <= Date.now()) {
      await get().expirePendingReservation(state.pendingReservation?.screening?.id ?? state.currentScreeningId);
      const error = new Error(RESERVATION_EXPIRED_MESSAGE);
      set({ reservationError: error.message });
      throw error;
    }

    set({ isPaying: true, reservationError: null });
    try {
      const result = await PaymentServiceInstance.payReservation(reservationId);
      if (generation !== reservationFlowGeneration) {
        throw new Error('La session de réservation a été réinitialisée.');
      }
      set({
        confirmedReservation: result,
        paymentResult: result,
        pendingReservation: result,
        reservationId: result.id,
        ticket: result.ticket,
        reservationError: null,
      });
      return result;
    } catch (error: unknown) {
      if (generation !== reservationFlowGeneration) {
        throw error;
      }
      set({ reservationError: getApiErrorMessage(error, 'Le paiement a échoué.') });
      throw error;
    } finally {
      if (generation === reservationFlowGeneration) {
        set({ isPaying: false });
      }
    }
  },

  resetReservationFlow: () => {
    reservationFlowGeneration += 1;
    inFlightSeats.clear();
    inFlightPendingReservations.clear();
    seatRequestIds.clear();
    pendingRequestIds.clear();
    set({
      currentScreeningId: null,
      seats: [],
      selectedSeatIds: [],
      ...emptyReservationState(),
      confirmedReservation: null,
      paymentResult: null,
      ticket: null,
      isLoadingSeats: false,
      isRefreshingSeats: false,
      isLoadingPendingReservation: false,
      isLocking: false,
      isPaying: false,
      seatError: null,
    });
  },
}));
