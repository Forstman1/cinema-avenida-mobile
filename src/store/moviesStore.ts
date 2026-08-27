import { create } from 'zustand';

import { getMovieById, getMovies, getScreeningsByMovieId } from '../api/movies';
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
  isLoadingMovieDetails: Record<number, boolean>;
  isLoadingScreenings: Record<number, boolean>;
  moviesError: string | null;
  movieDetailsErrors: Record<number, string | null>;
  screeningsErrors: Record<number, string | null>;
  fetchMovies: (options?: FetchMoviesOptions) => Promise<void>;
  refreshMovies: (options?: Omit<FetchMoviesOptions, 'force'>) => Promise<void>;
  fetchMovieDetails: (movieId: number, options?: FetchByIdOptions) => Promise<Movie | null>;
  fetchScreenings: (movieId: number, options?: FetchByIdOptions) => Promise<Screening[]>;
}

function getErrorMessage(error: any, fallback: string): string {
  return error?.message ?? fallback;
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

export const useMoviesStore = create<MoviesStore>((set, get) => ({
  movies: [],
  moviesById: {},
  screeningsByMovieId: {},
  isLoadingMovies: false,
  isLoadingMovieDetails: {},
  isLoadingScreenings: {},
  moviesError: null,
  movieDetailsErrors: {},
  screeningsErrors: {},

  fetchMovies: async ({ force = true, showLoading = true } = {}) => {
    if (!force && get().movies.length > 0) {
      return;
    }

    if (showLoading) {
      set({ isLoadingMovies: true });
    }
    set({ moviesError: null });

    try {
      const movies = await getMovies({ current: true });
      set({ movies, moviesById: indexMovies(movies) });
    } catch (error: any) {
      set({ moviesError: getErrorMessage(error, 'Impossible de charger le programme.') });
    } finally {
      if (showLoading) {
        set({ isLoadingMovies: false });
      }
    }
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

    set({
      isLoadingMovieDetails: { ...get().isLoadingMovieDetails, [movieId]: true },
      movieDetailsErrors: { ...get().movieDetailsErrors, [movieId]: null },
    });

    try {
      const movie = await getMovieById(movieId);
      set({
        moviesById: { ...get().moviesById, [movieId]: movie },
        movieDetailsErrors: { ...get().movieDetailsErrors, [movieId]: null },
      });
      return movie;
    } catch (error: any) {
      set({
        movieDetailsErrors: {
          ...get().movieDetailsErrors,
          [movieId]: getErrorMessage(error, 'Impossible de charger les détails du film.'),
        },
      });
      return null;
    } finally {
      set({
        isLoadingMovieDetails: { ...get().isLoadingMovieDetails, [movieId]: false },
      });
    }
  },

  fetchScreenings: async (movieId, { force = false } = {}) => {
    const screeningsByMovieId = get().screeningsByMovieId;
    if (!force && hasMovie(screeningsByMovieId, movieId)) {
      set({ screeningsErrors: { ...get().screeningsErrors, [movieId]: null } });
      return screeningsByMovieId[movieId];
    }

    set({
      isLoadingScreenings: { ...get().isLoadingScreenings, [movieId]: true },
      screeningsErrors: { ...get().screeningsErrors, [movieId]: null },
    });

    try {
      const screenings = await getScreeningsByMovieId(movieId);
      set({
        screeningsByMovieId: { ...get().screeningsByMovieId, [movieId]: screenings },
        screeningsErrors: { ...get().screeningsErrors, [movieId]: null },
      });
      return screenings;
    } catch (error: any) {
      set({
        screeningsErrors: {
          ...get().screeningsErrors,
          [movieId]: getErrorMessage(error, 'Impossible de charger les séances.'),
        },
      });
      return [];
    } finally {
      set({
        isLoadingScreenings: { ...get().isLoadingScreenings, [movieId]: false },
      });
    }
  },
}));
