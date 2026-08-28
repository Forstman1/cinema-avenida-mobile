import { create } from 'zustand';
import { getApiErrorMessage } from '../api/errors';

import { MovieServiceInstance } from '../services/MovieService';
import type { Movie, MovieRequest } from '../types';

export interface AdminMoviesStore {
  movies: Movie[];
  isLoadingMovies: boolean;
  isRefreshingMovies: boolean;
  isSubmitting: boolean;
  moviesError: string | null;
  submissionError: string | null;
  lastSavedMovie: Movie | null;
  fetchMovies: () => Promise<void>;
  createMovie: (payload: MovieRequest) => Promise<Movie | null>;
  updateMovie: (movieId: number, payload: MovieRequest) => Promise<Movie | null>;
  clearMovies: () => void;
  clearErrors: () => void;
  reset: () => void;
}

let adminMoviesGeneration = 0;
let adminMoviesRequestId = 0;
let inFlightAdminMoviesRequest: Promise<void> | null = null;

export const useAdminMoviesStore = create<AdminMoviesStore>((set, get) => ({
  movies: [],
  isLoadingMovies: false,
  isRefreshingMovies: false,
  isSubmitting: false,
  moviesError: null,
  submissionError: null,
  lastSavedMovie: null,

  fetchMovies: async () => {
    if (inFlightAdminMoviesRequest) return inFlightAdminMoviesRequest;

    const generation = adminMoviesGeneration;
    const requestId = ++adminMoviesRequestId;
    const hasCachedMovies = get().movies.length > 0;
    set({
      isLoadingMovies: !hasCachedMovies,
      isRefreshingMovies: hasCachedMovies,
      moviesError: null,
    });

    let request: Promise<void> | null = null;
    request = (async () => {
      try {
        const movies = await MovieServiceInstance.getMovies();
        if (generation !== adminMoviesGeneration || requestId !== adminMoviesRequestId) return;
        set({ movies, moviesError: null });
      } catch (error: unknown) {
        if (generation !== adminMoviesGeneration || requestId !== adminMoviesRequestId) return;
        set({ moviesError: getApiErrorMessage(error, 'Impossible de charger les films.') });
      } finally {
        if (generation === adminMoviesGeneration && requestId === adminMoviesRequestId) {
          set({ isLoadingMovies: false, isRefreshingMovies: false });
        }
        if (inFlightAdminMoviesRequest === request) inFlightAdminMoviesRequest = null;
      }
    })();

    const startedRequest = request as Promise<void>;
    inFlightAdminMoviesRequest = startedRequest;
    return startedRequest;
  },

  createMovie: async (payload) => {
    if (get().isSubmitting) return null;
    const generation = adminMoviesGeneration;
    adminMoviesRequestId += 1;
    inFlightAdminMoviesRequest = null;
    set({ isSubmitting: true, submissionError: null, lastSavedMovie: null });

    try {
      const movie = await MovieServiceInstance.createMovie(payload);
      if (generation !== adminMoviesGeneration) return null;
      adminMoviesRequestId += 1;
      set({ lastSavedMovie: movie, submissionError: null });
      return movie;
    } catch (error: unknown) {
      if (generation !== adminMoviesGeneration) return null;
      set({ submissionError: getApiErrorMessage(error, 'Impossible de créer le film.') });
      throw error;
    } finally {
      if (generation === adminMoviesGeneration) {
        set({ isSubmitting: false });
      }
    }
  },

  updateMovie: async (movieId, payload) => {
    if (get().isSubmitting) return null;
    const generation = adminMoviesGeneration;
    adminMoviesRequestId += 1;
    inFlightAdminMoviesRequest = null;
    set({ isSubmitting: true, submissionError: null, lastSavedMovie: null });

    try {
      const movie = await MovieServiceInstance.updateMovie(movieId, payload);
      if (generation !== adminMoviesGeneration) return null;
      adminMoviesRequestId += 1;
      set({ lastSavedMovie: movie, submissionError: null });
      return movie;
    } catch (error: unknown) {
      if (generation !== adminMoviesGeneration) return null;
      set({ submissionError: getApiErrorMessage(error, 'Impossible de mettre à jour le film.') });
      throw error;
    } finally {
      if (generation === adminMoviesGeneration) {
        set({ isSubmitting: false });
      }
    }
  },

  clearMovies: () => {
    adminMoviesGeneration += 1;
    adminMoviesRequestId += 1;
    inFlightAdminMoviesRequest = null;
    set({
      movies: [],
      lastSavedMovie: null,
      isLoadingMovies: false,
      isRefreshingMovies: false,
    });
  },

  clearErrors: () => {
    set({ moviesError: null, submissionError: null });
  },

  reset: () => {
    adminMoviesGeneration += 1;
    adminMoviesRequestId += 1;
    inFlightAdminMoviesRequest = null;
    set({
      movies: [],
      isLoadingMovies: false,
      isRefreshingMovies: false,
      isSubmitting: false,
      moviesError: null,
      submissionError: null,
      lastSavedMovie: null,
    });
  },
}));
