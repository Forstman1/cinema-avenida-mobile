import apiClient from './client';
import type { Movie, Screening } from '../types';

// In development, use public internet images as posters until the backend stores real ones.
function getInternetPosterUrl(id: number): string {
  const safeId = encodeURIComponent(String(id));
  return `https://picsum.photos/seed/${safeId}/400/600`;
}

function ensurePoster(movie: Movie): Movie {
  return { ...movie, poster: getInternetPosterUrl(movie.id) };
}

export async function getMovies(params?: { current?: boolean }): Promise<Movie[]> {
  const response = await apiClient.get<Movie[]>('/movies', { params });
  return response.data.map(ensurePoster);
}

export async function getMovieById(id: number): Promise<Movie> {
  const response = await apiClient.get<Movie>(`/movies/${id}`);
  return ensurePoster(response.data);
}

export async function getScreeningsByMovieId(id: number): Promise<Screening[]> {
  const response = await apiClient.get<Screening[]>(`/movies/${id}/screenings`);
  return response.data;
}

export interface MoviePayload {
  title: string;
  synopsis: string;
  duration: number;
  genre: string;
  poster?: string;
}

export async function getRawMovieById(id: number): Promise<Movie> {
  const response = await apiClient.get<Movie>(`/movies/${id}`);
  return response.data;
}

export async function createMovie(payload: MoviePayload): Promise<Movie> {
  const response = await apiClient.post<Movie>('/movies', payload);
  return response.data;
}

export async function updateMovie(id: number, payload: MoviePayload): Promise<Movie> {
  const response = await apiClient.put<Movie>(`/movies/${id}`, payload);
  return response.data;
}

export interface ScreeningPayload {
  movieId: number;
  date: string;
  showTime: string;
}

export async function createScreening(payload: ScreeningPayload): Promise<Screening> {
  const response = await apiClient.post<Screening>('/screenings', payload);
  return response.data;
}
