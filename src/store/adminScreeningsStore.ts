import { create } from 'zustand';

import {
  createScreening as createScreeningRequest,
  getScreeningsByDate,
  getScreeningsByMovieId,
  type ScreeningPayload,
} from '../api/movies';
import type { Screening } from '../types';
import { compareShowTimes, toISODate } from '../utils/date';
import { useAuthStore } from './authStore';

export interface FetchScreeningsOptions {
  force?: boolean;
}

interface NormalizedScreenings {
  screeningsById: Record<number, Screening>;
  screeningIdsByDate: Record<string, number[]>;
  screeningIdsByMovieId: Record<number, number[]>;
}

export interface AdminScreeningsStore extends NormalizedScreenings {
  isLoadingByDate: Record<string, boolean>;
  isLoadingByMovieId: Record<number, boolean>;
  dateErrors: Record<string, string | null>;
  movieErrors: Record<number, string | null>;
  isCreatingScreening: boolean;
  createScreeningError: string | null;
  lastCreatedScreening: Screening | null;
  fetchScreeningsByDate: (date: string, options?: FetchScreeningsOptions) => Promise<Screening[]>;
  refreshScreeningsByDate: (date: string) => Promise<Screening[]>;
  fetchScreeningsByMovieId: (movieId: number, options?: FetchScreeningsOptions) => Promise<Screening[]>;
  refreshScreeningsByMovieId: (movieId: number) => Promise<Screening[]>;
  createScreening: (payload: ScreeningPayload) => Promise<Screening | null>;
  invalidateDate: (date: string) => void;
  invalidateMovie: (movieId: number) => void;
  clearCreateError: () => void;
  clearScreenings: () => void;
  reset: () => void;
}

function getErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message ?? error?.message ?? fallback;
}

function getDateKey(date: string): string {
  return toISODate(date);
}

function compareScreenings(a: Screening, b: Screening): number {
  const dateComparison = getDateKey(a.date).localeCompare(getDateKey(b.date));
  return dateComparison !== 0 ? dateComparison : compareShowTimes(a.showTime, b.showTime);
}

function cloneNormalized(state: NormalizedScreenings): NormalizedScreenings {
  return {
    screeningsById: { ...state.screeningsById },
    screeningIdsByDate: Object.fromEntries(
      Object.entries(state.screeningIdsByDate).map(([date, ids]) => [date, [...ids]])
    ),
    screeningIdsByMovieId: Object.fromEntries(
      Object.entries(state.screeningIdsByMovieId).map(([movieId, ids]) => [movieId, [...ids]])
    ),
  };
}

function removeId(ids: number[] | undefined, id: number): number[] {
  return (ids ?? []).filter((candidate) => candidate !== id);
}

function detachScreening(state: NormalizedScreenings, screeningId: number): void {
  const existing = state.screeningsById[screeningId];
  if (!existing) return;

  const dateKey = getDateKey(existing.date);
  const movieId = existing.movieId;
  const dateIds = removeId(state.screeningIdsByDate[dateKey], screeningId);
  const movieIds = removeId(state.screeningIdsByMovieId[movieId], screeningId);

  if (dateIds.length > 0) state.screeningIdsByDate[dateKey] = dateIds;
  else delete state.screeningIdsByDate[dateKey];
  if (movieIds.length > 0) state.screeningIdsByMovieId[movieId] = movieIds;
  else delete state.screeningIdsByMovieId[movieId];
  delete state.screeningsById[screeningId];
}

function attachScreening(state: NormalizedScreenings, screening: Screening): void {
  detachScreening(state, screening.id);
  const dateKey = getDateKey(screening.date);
  state.screeningsById[screening.id] = screening;
  state.screeningIdsByDate[dateKey] = [
    ...(state.screeningIdsByDate[dateKey] ?? []),
    screening.id,
  ];
  state.screeningIdsByMovieId[screening.movieId] = [
    ...(state.screeningIdsByMovieId[screening.movieId] ?? []),
    screening.id,
  ];
}

function replaceDate(
  state: NormalizedScreenings,
  date: string,
  screenings: Screening[]
): NormalizedScreenings {
  const next = cloneNormalized(state);
  const dateKey = getDateKey(date);
  (next.screeningIdsByDate[dateKey] ?? []).forEach((id) => detachScreening(next, id));
  screenings.forEach((screening) => attachScreening(next, screening));
  next.screeningIdsByDate[dateKey] = screenings
    .slice()
    .sort(compareScreenings)
    .map((screening) => screening.id);
  return next;
}

function replaceMovie(
  state: NormalizedScreenings,
  movieId: number,
  screenings: Screening[]
): NormalizedScreenings {
  const next = cloneNormalized(state);
  (next.screeningIdsByMovieId[movieId] ?? []).forEach((id) => detachScreening(next, id));
  screenings.forEach((screening) => attachScreening(next, screening));
  next.screeningIdsByMovieId[movieId] = screenings
    .slice()
    .sort(compareScreenings)
    .map((screening) => screening.id);
  return next;
}

let adminScreeningsGeneration = 0;

export const useAdminScreeningsStore = create<AdminScreeningsStore>((set, get) => ({
  screeningsById: {},
  screeningIdsByDate: {},
  screeningIdsByMovieId: {},
  isLoadingByDate: {},
  isLoadingByMovieId: {},
  dateErrors: {},
  movieErrors: {},
  isCreatingScreening: false,
  createScreeningError: null,
  lastCreatedScreening: null,

  fetchScreeningsByDate: async (date, { force = true } = {}) => {
    const dateKey = getDateKey(date);
    if (!force && Object.prototype.hasOwnProperty.call(get().screeningIdsByDate, dateKey)) {
      return (get().screeningIdsByDate[dateKey] ?? [])
        .map((id) => get().screeningsById[id])
        .filter((screening): screening is Screening => Boolean(screening));
    }

    const generation = adminScreeningsGeneration;
    set({
      isLoadingByDate: { ...get().isLoadingByDate, [dateKey]: true },
      dateErrors: { ...get().dateErrors, [dateKey]: null },
    });

    try {
      const response = await getScreeningsByDate(dateKey);
      if (generation !== adminScreeningsGeneration) return [];

      // The date query is authoritative for its date. Never display a
      // response item that the backend returned with a different date key.
      const screenings = response.filter((screening) => getDateKey(screening.date) === dateKey);
      const normalized = replaceDate(get(), dateKey, screenings);
      set({ ...normalized, dateErrors: { ...get().dateErrors, [dateKey]: null } });
      return screenings.slice().sort(compareScreenings);
    } catch (error: any) {
      if (generation !== adminScreeningsGeneration) return [];

      // The existing programme API behavior uses 404 for a date with no
      // screenings. Other client/server errors remain visible to the admin.
      if (error?.response?.status === 404) {
        const normalized = replaceDate(get(), dateKey, []);
        set({ ...normalized, dateErrors: { ...get().dateErrors, [dateKey]: null } });
        return [];
      }

      set({
        dateErrors: {
          ...get().dateErrors,
          [dateKey]: getErrorMessage(error, 'Impossible de charger le programme.'),
        },
      });
      return [];
    } finally {
      if (generation === adminScreeningsGeneration) {
        set({ isLoadingByDate: { ...get().isLoadingByDate, [dateKey]: false } });
      }
    }
  },

  refreshScreeningsByDate: async (date) => get().fetchScreeningsByDate(date, { force: true }),

  fetchScreeningsByMovieId: async (movieId, { force = true } = {}) => {
    if (!force && Object.prototype.hasOwnProperty.call(get().screeningIdsByMovieId, movieId)) {
      return (get().screeningIdsByMovieId[movieId] ?? [])
        .map((id) => get().screeningsById[id])
        .filter((screening): screening is Screening => Boolean(screening));
    }

    const generation = adminScreeningsGeneration;
    set({
      isLoadingByMovieId: { ...get().isLoadingByMovieId, [movieId]: true },
      movieErrors: { ...get().movieErrors, [movieId]: null },
    });

    try {
      const screenings = await getScreeningsByMovieId(movieId);
      if (generation !== adminScreeningsGeneration) return [];
      const normalized = replaceMovie(get(), movieId, screenings);
      set({ ...normalized, movieErrors: { ...get().movieErrors, [movieId]: null } });
      return screenings.slice().sort(compareScreenings);
    } catch (error: any) {
      if (generation !== adminScreeningsGeneration) return [];
      set({
        movieErrors: {
          ...get().movieErrors,
          [movieId]: getErrorMessage(error, 'Impossible de charger les séances.'),
        },
      });
      return [];
    } finally {
      if (generation === adminScreeningsGeneration) {
        set({ isLoadingByMovieId: { ...get().isLoadingByMovieId, [movieId]: false } });
      }
    }
  },

  refreshScreeningsByMovieId: async (movieId) =>
    get().fetchScreeningsByMovieId(movieId, { force: true }),

  createScreening: async (payload) => {
    const generation = adminScreeningsGeneration;
    set({ isCreatingScreening: true, createScreeningError: null, lastCreatedScreening: null });

    try {
      const screening = await createScreeningRequest(payload);
      if (generation !== adminScreeningsGeneration) return null;
      const normalized = cloneNormalized(get());
      attachScreening(normalized, screening);
      normalized.screeningIdsByDate[getDateKey(screening.date)] = (
        normalized.screeningIdsByDate[getDateKey(screening.date)] ?? []
      ).sort((a, b) => compareScreenings(normalized.screeningsById[a], normalized.screeningsById[b]));
      normalized.screeningIdsByMovieId[screening.movieId] = (
        normalized.screeningIdsByMovieId[screening.movieId] ?? []
      ).sort((a, b) => compareScreenings(normalized.screeningsById[a], normalized.screeningsById[b]));
      set({ ...normalized, createScreeningError: null, lastCreatedScreening: screening });
      return screening;
    } catch (error: any) {
      if (generation !== adminScreeningsGeneration) return null;
      set({
        createScreeningError: getErrorMessage(error, 'Impossible de créer la séance.'),
      });
      throw error;
    } finally {
      if (generation === adminScreeningsGeneration) {
        set({ isCreatingScreening: false });
      }
    }
  },

  invalidateDate: (date) => {
    const dateKey = getDateKey(date);
    const normalized = replaceDate(get(), dateKey, []);
    set({
      ...normalized,
      dateErrors: { ...get().dateErrors, [dateKey]: null },
    });
  },

  invalidateMovie: (movieId) => {
    const normalized = replaceMovie(get(), movieId, []);
    set({
      ...normalized,
      movieErrors: { ...get().movieErrors, [movieId]: null },
    });
  },

  clearCreateError: () => set({ createScreeningError: null }),

  clearScreenings: () => {
    adminScreeningsGeneration += 1;
    set({
      screeningsById: {},
      screeningIdsByDate: {},
      screeningIdsByMovieId: {},
      isLoadingByDate: {},
      isLoadingByMovieId: {},
      dateErrors: {},
      movieErrors: {},
      isCreatingScreening: false,
      createScreeningError: null,
      lastCreatedScreening: null,
    });
  },

  reset: () => {
    adminScreeningsGeneration += 1;
    set({
      screeningsById: {},
      screeningIdsByDate: {},
      screeningIdsByMovieId: {},
      isLoadingByDate: {},
      isLoadingByMovieId: {},
      dateErrors: {},
      movieErrors: {},
      isCreatingScreening: false,
      createScreeningError: null,
      lastCreatedScreening: null,
    });
  },
}));

let knownAdminIdentity = `${useAuthStore.getState().user?.id ?? 'none'}:${useAuthStore.getState().user?.role ?? 'none'}`;
useAuthStore.subscribe((state) => {
  const nextIdentity = `${state.user?.id ?? 'none'}:${state.user?.role ?? 'none'}`;
  if (nextIdentity !== knownAdminIdentity) {
    knownAdminIdentity = nextIdentity;
    useAdminScreeningsStore.getState().reset();
  }
});
