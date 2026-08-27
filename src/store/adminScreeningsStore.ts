import { create } from 'zustand';
import { getApiErrorDetails, getApiErrorMessage } from '../api/errors';

import {
  createScreening as createScreeningRequest,
  getScreeningsByDate,
  getScreeningsByMovieId,
} from '../api/movies';
import type { ISODateString, Screening, ScreeningRequest } from '../types';
import { compareShowTimes, toISODate } from '../utils/date';

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
  isRefreshingByDate: Record<string, boolean>;
  isLoadingByMovieId: Record<number, boolean>;
  isRefreshingByMovieId: Record<number, boolean>;
  dateErrors: Record<string, string | null>;
  movieErrors: Record<number, string | null>;
  isCreatingScreening: boolean;
  createScreeningError: string | null;
  lastCreatedScreening: Screening | null;
  fetchScreeningsByDate: (date: ISODateString, options?: FetchScreeningsOptions) => Promise<Screening[]>;
  refreshScreeningsByDate: (date: ISODateString) => Promise<Screening[]>;
  fetchScreeningsByMovieId: (movieId: number, options?: FetchScreeningsOptions) => Promise<Screening[]>;
  refreshScreeningsByMovieId: (movieId: number) => Promise<Screening[]>;
  createScreening: (payload: ScreeningRequest) => Promise<Screening | null>;
  invalidateDate: (date: ISODateString) => void;
  invalidateMovie: (movieId: number) => void;
  clearCreateError: () => void;
  clearScreenings: () => void;
  reset: () => void;
}

function getDateKey(date: string): ISODateString {
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
let adminScreeningsDataVersion = 0;
const inFlightDateRequests = new Map<string, Promise<Screening[]>>();
const inFlightMovieRequests = new Map<number, Promise<Screening[]>>();
const dateRequestIds = new Map<string, number>();
const movieRequestIds = new Map<number, number>();

export const useAdminScreeningsStore = create<AdminScreeningsStore>((set, get) => ({
  screeningsById: {},
  screeningIdsByDate: {},
  screeningIdsByMovieId: {},
  isLoadingByDate: {},
  isRefreshingByDate: {},
  isLoadingByMovieId: {},
  isRefreshingByMovieId: {},
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

    const existingRequest = inFlightDateRequests.get(dateKey);
    if (existingRequest) return existingRequest;

    const generation = adminScreeningsGeneration;
    const dataVersion = adminScreeningsDataVersion;
    const requestId = (dateRequestIds.get(dateKey) ?? 0) + 1;
    dateRequestIds.set(dateKey, requestId);
    const hasCachedScreenings = Object.prototype.hasOwnProperty.call(
      get().screeningIdsByDate,
      dateKey
    );
    set({
      isLoadingByDate: { ...get().isLoadingByDate, [dateKey]: !hasCachedScreenings },
      isRefreshingByDate: { ...get().isRefreshingByDate, [dateKey]: hasCachedScreenings },
      dateErrors: { ...get().dateErrors, [dateKey]: null },
    });

    let request: Promise<Screening[]> | null = null;
    request = (async () => {
      try {
        const response = await getScreeningsByDate(dateKey);
        if (
          generation !== adminScreeningsGeneration ||
          dataVersion !== adminScreeningsDataVersion ||
          dateRequestIds.get(dateKey) !== requestId
        ) return [];

        // Never display a response item that the backend returned with a
        // different date key.
        const screenings = response.filter((screening) => getDateKey(screening.date) === dateKey);
        const normalized = replaceDate(get(), dateKey, screenings);
        set({ ...normalized, dateErrors: { ...get().dateErrors, [dateKey]: null } });
        return screenings.slice().sort(compareScreenings);
      } catch (error: unknown) {
        if (
          generation !== adminScreeningsGeneration ||
          dataVersion !== adminScreeningsDataVersion ||
          dateRequestIds.get(dateKey) !== requestId
        ) return [];

        // A 404 means there are no screenings only when no cached result
        // exists. Refresh failures never discard an existing cached result.
        if (getApiErrorDetails(error).status === 404 && !hasCachedScreenings) {
          const normalized = replaceDate(get(), dateKey, []);
          set({ ...normalized, dateErrors: { ...get().dateErrors, [dateKey]: null } });
          return [];
        }

        set({
          dateErrors: {
            ...get().dateErrors,
            [dateKey]: getApiErrorMessage(error, 'Impossible de charger le programme.'),
          },
        });
        return [];
      } finally {
        if (
          generation === adminScreeningsGeneration &&
          dataVersion === adminScreeningsDataVersion &&
          dateRequestIds.get(dateKey) === requestId
        ) {
          set({
            isLoadingByDate: { ...get().isLoadingByDate, [dateKey]: false },
            isRefreshingByDate: { ...get().isRefreshingByDate, [dateKey]: false },
          });
        }
        if (inFlightDateRequests.get(dateKey) === request) inFlightDateRequests.delete(dateKey);
      }
    })();

    const startedRequest = request as Promise<Screening[]>;
    inFlightDateRequests.set(dateKey, startedRequest);
    return startedRequest;
  },

  refreshScreeningsByDate: async (date) => get().fetchScreeningsByDate(date, { force: true }),

  fetchScreeningsByMovieId: async (movieId, { force = true } = {}) => {
    if (!force && Object.prototype.hasOwnProperty.call(get().screeningIdsByMovieId, movieId)) {
      return (get().screeningIdsByMovieId[movieId] ?? [])
        .map((id) => get().screeningsById[id])
        .filter((screening): screening is Screening => Boolean(screening));
    }

    const existingRequest = inFlightMovieRequests.get(movieId);
    if (existingRequest) return existingRequest;

    const generation = adminScreeningsGeneration;
    const dataVersion = adminScreeningsDataVersion;
    const requestId = (movieRequestIds.get(movieId) ?? 0) + 1;
    movieRequestIds.set(movieId, requestId);
    const hasCachedScreenings = Object.prototype.hasOwnProperty.call(
      get().screeningIdsByMovieId,
      movieId
    );
    set({
      isLoadingByMovieId: { ...get().isLoadingByMovieId, [movieId]: !hasCachedScreenings },
      isRefreshingByMovieId: { ...get().isRefreshingByMovieId, [movieId]: hasCachedScreenings },
      movieErrors: { ...get().movieErrors, [movieId]: null },
    });

    let request: Promise<Screening[]> | null = null;
    request = (async () => {
      try {
        const screenings = await getScreeningsByMovieId(movieId);
        if (
          generation !== adminScreeningsGeneration ||
          dataVersion !== adminScreeningsDataVersion ||
          movieRequestIds.get(movieId) !== requestId
        ) return [];
        const normalized = replaceMovie(get(), movieId, screenings);
        set({ ...normalized, movieErrors: { ...get().movieErrors, [movieId]: null } });
        return screenings.slice().sort(compareScreenings);
      } catch (error: unknown) {
        if (
          generation !== adminScreeningsGeneration ||
          dataVersion !== adminScreeningsDataVersion ||
          movieRequestIds.get(movieId) !== requestId
        ) return [];
        set({
          movieErrors: {
            ...get().movieErrors,
            [movieId]: getApiErrorMessage(error, 'Impossible de charger les séances.'),
          },
        });
        return [];
      } finally {
        if (
          generation === adminScreeningsGeneration &&
          dataVersion === adminScreeningsDataVersion &&
          movieRequestIds.get(movieId) === requestId
        ) {
          set({
            isLoadingByMovieId: { ...get().isLoadingByMovieId, [movieId]: false },
            isRefreshingByMovieId: { ...get().isRefreshingByMovieId, [movieId]: false },
          });
        }
        if (inFlightMovieRequests.get(movieId) === request) inFlightMovieRequests.delete(movieId);
      }
    })();

    const startedRequest = request as Promise<Screening[]>;
    inFlightMovieRequests.set(movieId, startedRequest);
    return startedRequest;
  },

  refreshScreeningsByMovieId: async (movieId) =>
    get().fetchScreeningsByMovieId(movieId, { force: true }),

  createScreening: async (payload) => {
    if (get().isCreatingScreening) return null;
    const generation = adminScreeningsGeneration;
    adminScreeningsDataVersion += 1;
    inFlightDateRequests.clear();
    inFlightMovieRequests.clear();
    set({ isCreatingScreening: true, createScreeningError: null, lastCreatedScreening: null });

    try {
      const screening = await createScreeningRequest(payload);
      if (generation !== adminScreeningsGeneration) return null;
      adminScreeningsDataVersion += 1;
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
    } catch (error: unknown) {
      if (generation !== adminScreeningsGeneration) return null;
      set({
        createScreeningError: getApiErrorMessage(error, 'Impossible de créer la séance.'),
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
    adminScreeningsDataVersion += 1;
    dateRequestIds.set(dateKey, (dateRequestIds.get(dateKey) ?? 0) + 1);
    inFlightDateRequests.delete(dateKey);
    inFlightMovieRequests.clear();
    const normalized = replaceDate(get(), dateKey, []);
    set({
      ...normalized,
      isLoadingByDate: { ...get().isLoadingByDate, [dateKey]: false },
      isRefreshingByDate: { ...get().isRefreshingByDate, [dateKey]: false },
      dateErrors: { ...get().dateErrors, [dateKey]: null },
    });
  },

  invalidateMovie: (movieId) => {
    adminScreeningsDataVersion += 1;
    movieRequestIds.set(movieId, (movieRequestIds.get(movieId) ?? 0) + 1);
    inFlightMovieRequests.delete(movieId);
    inFlightDateRequests.clear();
    const normalized = replaceMovie(get(), movieId, []);
    set({
      ...normalized,
      isLoadingByMovieId: { ...get().isLoadingByMovieId, [movieId]: false },
      isRefreshingByMovieId: { ...get().isRefreshingByMovieId, [movieId]: false },
      movieErrors: { ...get().movieErrors, [movieId]: null },
    });
  },

  clearCreateError: () => set({ createScreeningError: null }),

  clearScreenings: () => {
    adminScreeningsGeneration += 1;
    adminScreeningsDataVersion += 1;
    inFlightDateRequests.clear();
    inFlightMovieRequests.clear();
    dateRequestIds.clear();
    movieRequestIds.clear();
    set({
      screeningsById: {},
      screeningIdsByDate: {},
      screeningIdsByMovieId: {},
      isLoadingByDate: {},
      isRefreshingByDate: {},
      isLoadingByMovieId: {},
      isRefreshingByMovieId: {},
      dateErrors: {},
      movieErrors: {},
      isCreatingScreening: false,
      createScreeningError: null,
      lastCreatedScreening: null,
    });
  },

  reset: () => {
    adminScreeningsGeneration += 1;
    adminScreeningsDataVersion += 1;
    inFlightDateRequests.clear();
    inFlightMovieRequests.clear();
    dateRequestIds.clear();
    movieRequestIds.clear();
    set({
      screeningsById: {},
      screeningIdsByDate: {},
      screeningIdsByMovieId: {},
      isLoadingByDate: {},
      isRefreshingByDate: {},
      isLoadingByMovieId: {},
      isRefreshingByMovieId: {},
      dateErrors: {},
      movieErrors: {},
      isCreatingScreening: false,
      createScreeningError: null,
      lastCreatedScreening: null,
    });
  },
}));
