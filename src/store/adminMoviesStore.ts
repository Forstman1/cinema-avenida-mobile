import { create } from 'zustand';

import {
  createMovie as createMovieRequest,
  getMovies,
  updateMovie as updateMovieRequest,
  type MoviePayload,
} from '../api/movies';
import type { Movie } from '../types';
import { useAuthStore } from './authStore';

export interface AdminMoviesStore {
  movies: Movie[];
  isLoadingMovies: boolean;
  isSubmitting: boolean;
  moviesError: string | null;
  submissionError: string | null;
  lastSavedMovie: Movie | null;
  fetchMovies: () => Promise<void>;
  createMovie: (payload: MoviePayload) => Promise<Movie | null>;
  updateMovie: (movieId: number, payload: MoviePayload) => Promise<Movie | null>;
  clearMovies: () => void;
  clearErrors: () => void;
  reset: () => void;
}

function getErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message ?? error?.message ?? fallback;
}

let adminMoviesGeneration = 0;

export const useAdminMoviesStore = create<AdminMoviesStore>((set) => ({
  movies: [],
  isLoadingMovies: false,
  isSubmitting: false,
  moviesError: null,
  submissionError: null,
  lastSavedMovie: null,

  fetchMovies: async () => {
    const generation = adminMoviesGeneration;
    set({ isLoadingMovies: true, moviesError: null });

    try {
      const movies = await getMovies();
      if (generation !== adminMoviesGeneration) return;
      set({ movies, moviesError: null });
    } catch (error: any) {
      if (generation !== adminMoviesGeneration) return;
      set({ moviesError: getErrorMessage(error, 'Impossible de charger les films.') });
    } finally {
      if (generation === adminMoviesGeneration) {
        set({ isLoadingMovies: false });
      }
    }
  },

  createMovie: async (payload) => {
    const generation = adminMoviesGeneration;
    set({ isSubmitting: true, submissionError: null, lastSavedMovie: null });

    try {
      const movie = await createMovieRequest(payload);
      if (generation !== adminMoviesGeneration) return null;
      set({ lastSavedMovie: movie, submissionError: null });
      return movie;
    } catch (error: any) {
      if (generation !== adminMoviesGeneration) return null;
      set({ submissionError: getErrorMessage(error, 'Impossible de créer le film.') });
      throw error;
    } finally {
      if (generation === adminMoviesGeneration) {
        set({ isSubmitting: false });
      }
    }
  },

  updateMovie: async (movieId, payload) => {
    const generation = adminMoviesGeneration;
    set({ isSubmitting: true, submissionError: null, lastSavedMovie: null });

    try {
      const movie = await updateMovieRequest(movieId, payload);
      if (generation !== adminMoviesGeneration) return null;
      set({ lastSavedMovie: movie, submissionError: null });
      return movie;
    } catch (error: any) {
      if (generation !== adminMoviesGeneration) return null;
      set({ submissionError: getErrorMessage(error, 'Impossible de mettre à jour le film.') });
      throw error;
    } finally {
      if (generation === adminMoviesGeneration) {
        set({ isSubmitting: false });
      }
    }
  },

  clearMovies: () => {
    adminMoviesGeneration += 1;
    set({ movies: [], lastSavedMovie: null });
  },

  clearErrors: () => {
    set({ moviesError: null, submissionError: null });
  },

  reset: () => {
    adminMoviesGeneration += 1;
    set({
      movies: [],
      isLoadingMovies: false,
      isSubmitting: false,
      moviesError: null,
      submissionError: null,
      lastSavedMovie: null,
    });
  },
}));

// The admin catalogue is not persisted and must not survive an account or
// role change. Catalogue data used by customers remains in moviesStore.
let knownAdminIdentity = `${useAuthStore.getState().user?.id ?? 'none'}:${useAuthStore.getState().user?.role ?? 'none'}`;
useAuthStore.subscribe((state) => {
  const nextIdentity = `${state.user?.id ?? 'none'}:${state.user?.role ?? 'none'}`;
  if (nextIdentity !== knownAdminIdentity) {
    knownAdminIdentity = nextIdentity;
    useAdminMoviesStore.getState().reset();
  }
});
