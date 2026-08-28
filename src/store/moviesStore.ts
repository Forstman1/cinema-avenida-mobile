import { create } from 'zustand';

import { getApiErrorMessage } from '../api/errors';
import { MovieServiceInstance } from '../services/MovieService';
import type { Movie, Screening } from '../types';

export interface FetchMoviesOptions {
  force?: boolean;
  showLoading?: boolean;
}

export interface FetchByIdOptions {
  force?: boolean;
}

export interface MoviesStore {
  movies: Movie[];
  moviesById: Record<number, Movie>;
  screeningsByMovieId: Record<number, Screening[]>;
  isLoadingMovies: boolean;
  isRefreshingMovies: boolean;
  isLoadingMovieDetails: Record<number, boolean>;
  isLoadingScreenings: Record<number, boolean>;
  moviesError: string | null;
  movieDetailsErrors: Record<number, string | null>;
  screeningsErrors: Record<number, string | null>;
  fetchMovies: (options?: FetchMoviesOptions) => Promise<void>;
  refreshMovies: (options?: Omit<FetchMoviesOptions, 'force'>) => Promise<void>;
  fetchMovieDetails: (movieId: number, options?: FetchByIdOptions) => Promise<Movie | null>;
  fetchScreenings: (movieId: number, options?: FetchByIdOptions) => Promise<Screening[]>;
  reset: () => void;
}

function indexMovies(movies: Movie[]): Record<number, Movie> {
  return movies.reduce<Record<number, Movie>>((result, movie) => {
    result[movie.id] = movie;
    return result;
  }, {});
}

function hasMovie(screeningsByMovieId: Record<number, Screening[]>, movieId: number): boolean {
  return Object.prototype.hasOwnProperty.call(screeningsByMovieId, movieId);
}

let moviesGeneration = 0;
let moviesRequestId = 0;
let inFlightMoviesRequest: Promise<void> | null = null;
const inFlightMovieDetails = new Map<number, Promise<Movie | null>>();
const inFlightScreenings = new Map<number, Promise<Screening[]>>();
const movieDetailsRequestIds = new Map<number, number>();
const screeningsRequestIds = new Map<number, number>();
let moviesOperationVersion = 0;
const latestMovieOperations = new Map<number, number>();

export const useMoviesStore = create<MoviesStore>((set, get) => ({
  movies: [],
  moviesById: {},
  screeningsByMovieId: {},
  isLoadingMovies: false,
  isRefreshingMovies: false,
  isLoadingMovieDetails: {},
  isLoadingScreenings: {},
  moviesError: null,
  movieDetailsErrors: {},
  screeningsErrors: {},

  fetchMovies: async ({ force = true, showLoading = true } = {}) => {
    if (!force && get().movies.length > 0) {
      return;
    }

    if (inFlightMoviesRequest) return inFlightMoviesRequest;

    const generation = moviesGeneration;
    const requestId = ++moviesRequestId;
    const operationVersion = ++moviesOperationVersion;
    const hasCachedMovies = get().movies.length > 0;
    set({
      isLoadingMovies: showLoading && !hasCachedMovies,
      isRefreshingMovies: hasCachedMovies,
      moviesError: null,
    });

    let request: Promise<void> | null = null;
    request = (async () => {
      try {
        const movies = await MovieServiceInstance.getMovies({ current: true });
        if (generation !== moviesGeneration || requestId !== moviesRequestId) return;

        const currentMoviesById = get().moviesById;
        const nextMovies = movies.map((movie) => {
          const latestOperation = latestMovieOperations.get(movie.id) ?? 0;
          if (latestOperation > operationVersion) return currentMoviesById[movie.id] ?? movie;
          latestMovieOperations.set(movie.id, operationVersion);
          return movie;
        });
        set({ movies: nextMovies, moviesById: indexMovies(nextMovies), moviesError: null });
      } catch (error: unknown) {
        if (generation !== moviesGeneration || requestId !== moviesRequestId) return;
        set({ moviesError: getApiErrorMessage(error, 'Impossible de charger le programme.') });
      } finally {
        if (generation === moviesGeneration && requestId === moviesRequestId) {
          set({ isLoadingMovies: false, isRefreshingMovies: false });
        }
        if (inFlightMoviesRequest === request) inFlightMoviesRequest = null;
      }
    })();

    const startedRequest = request as Promise<void>;
    inFlightMoviesRequest = startedRequest;
    return startedRequest;
  },

  refreshMovies: async ({ showLoading = true } = {}) => {
    await get().fetchMovies({ force: true, showLoading });
  },

  fetchMovieDetails: async (movieId, { force = false } = {}) => {
    const cachedMovie = get().moviesById[movieId];
    if (!force && cachedMovie) {
      set({ movieDetailsErrors: { ...get().movieDetailsErrors, [movieId]: null } });
      return cachedMovie;
    }

    const existingRequest = inFlightMovieDetails.get(movieId);
    if (existingRequest) return existingRequest;

    const generation = moviesGeneration;
    const requestId = (movieDetailsRequestIds.get(movieId) ?? 0) + 1;
    movieDetailsRequestIds.set(movieId, requestId);
    const operationVersion = ++moviesOperationVersion;
    latestMovieOperations.set(movieId, operationVersion);

    set({
      isLoadingMovieDetails: { ...get().isLoadingMovieDetails, [movieId]: true },
      movieDetailsErrors: { ...get().movieDetailsErrors, [movieId]: null },
    });

    let request: Promise<Movie | null> | null = null;
    request = (async () => {
      try {
        const movie = await MovieServiceInstance.getMovieById(movieId);
        if (
          generation !== moviesGeneration ||
          movieDetailsRequestIds.get(movieId) !== requestId ||
          latestMovieOperations.get(movieId) !== operationVersion
        ) {
          return null;
        }
        set({
          moviesById: { ...get().moviesById, [movieId]: movie },
          movieDetailsErrors: { ...get().movieDetailsErrors, [movieId]: null },
        });
        return movie;
      } catch (error: unknown) {
        if (
          generation !== moviesGeneration ||
          movieDetailsRequestIds.get(movieId) !== requestId
        ) {
          return null;
        }
        if (latestMovieOperations.get(movieId) === operationVersion) {
          latestMovieOperations.delete(movieId);
        }
        set({
          movieDetailsErrors: {
            ...get().movieDetailsErrors,
            [movieId]: getApiErrorMessage(error, 'Impossible de charger les détails du film.'),
          },
        });
        return null;
      } finally {
        if (
          generation === moviesGeneration &&
          movieDetailsRequestIds.get(movieId) === requestId
        ) {
          set({
            isLoadingMovieDetails: { ...get().isLoadingMovieDetails, [movieId]: false },
          });
        }
        if (inFlightMovieDetails.get(movieId) === request) inFlightMovieDetails.delete(movieId);
      }
    })();

    const startedRequest = request as Promise<Movie | null>;
    inFlightMovieDetails.set(movieId, startedRequest);
    return startedRequest;
  },

  fetchScreenings: async (movieId, { force = false } = {}) => {
    const screeningsByMovieId = get().screeningsByMovieId;
    if (!force && hasMovie(screeningsByMovieId, movieId)) {
      set({ screeningsErrors: { ...get().screeningsErrors, [movieId]: null } });
      return screeningsByMovieId[movieId];
    }

    const existingRequest = inFlightScreenings.get(movieId);
    if (existingRequest) return existingRequest;

    const generation = moviesGeneration;
    const requestId = (screeningsRequestIds.get(movieId) ?? 0) + 1;
    screeningsRequestIds.set(movieId, requestId);

    set({
      isLoadingScreenings: { ...get().isLoadingScreenings, [movieId]: true },
      screeningsErrors: { ...get().screeningsErrors, [movieId]: null },
    });

    let request: Promise<Screening[]> | null = null;
    request = (async () => {
      try {
        const screenings = await MovieServiceInstance.getScreeningsByMovieId(movieId);
        if (
          generation !== moviesGeneration ||
          screeningsRequestIds.get(movieId) !== requestId
        ) {
          return [];
        }
        set({
          screeningsByMovieId: { ...get().screeningsByMovieId, [movieId]: screenings },
          screeningsErrors: { ...get().screeningsErrors, [movieId]: null },
        });
        return screenings;
      } catch (error: unknown) {
        if (
          generation !== moviesGeneration ||
          screeningsRequestIds.get(movieId) !== requestId
        ) {
          return [];
        }
        set({
          screeningsErrors: {
            ...get().screeningsErrors,
            [movieId]: getApiErrorMessage(error, 'Impossible de charger les séances.'),
          },
        });
        return [];
      } finally {
        if (
          generation === moviesGeneration &&
          screeningsRequestIds.get(movieId) === requestId
        ) {
          set({
            isLoadingScreenings: { ...get().isLoadingScreenings, [movieId]: false },
          });
        }
        if (inFlightScreenings.get(movieId) === request) inFlightScreenings.delete(movieId);
      }
    })();

    const startedRequest = request as Promise<Screening[]>;
    inFlightScreenings.set(movieId, startedRequest);
    return startedRequest;
  },

  reset: () => {
    moviesGeneration += 1;
    moviesRequestId += 1;
    inFlightMoviesRequest = null;
    inFlightMovieDetails.clear();
    inFlightScreenings.clear();
    movieDetailsRequestIds.clear();
    screeningsRequestIds.clear();
    latestMovieOperations.clear();
    moviesOperationVersion = 0;
    set({
      movies: [],
      moviesById: {},
      screeningsByMovieId: {},
      isLoadingMovies: false,
      isRefreshingMovies: false,
      isLoadingMovieDetails: {},
      isLoadingScreenings: {},
      moviesError: null,
      movieDetailsErrors: {},
      screeningsErrors: {},
    });
  },
}));
