import apiClient from './client';
import type { Movie, Screening } from '../types/movie';

// Public internet images used as posters until the backend returns real ones.
function getInternetPosterUrl(id: string): string {
  const safeId = encodeURIComponent(id);
  return `https://picsum.photos/seed/${safeId}/400/600`;
}

function ensurePoster(movie: Movie): Movie {
  return { ...movie, poster: getInternetPosterUrl(movie.id) };
}

export async function getMovies(): Promise<Movie[]> {
  const response = await apiClient.get<Movie[]>('/movies');
  return response.data.map(ensurePoster);
}

export async function getMovieById(id: string): Promise<Movie> {
  const response = await apiClient.get<Movie>(`/movies/${id}`);
  return ensurePoster(response.data);
}

export async function getScreeningsByMovieId(id: string): Promise<Screening[]> {
  const response = await apiClient.get<Screening[]>(`/movies/${id}/screenings`);
  return response.data;
}
