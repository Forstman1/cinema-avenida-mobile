import apiClient from './client';
import { request } from './errors';
import { normalizeMovie, normalizeScreening } from './normalizers';
import type {
  CreateMovieRequest,
  CreateMovieResponse,
  CreateScreeningRequest,
  CreateScreeningResponse,
  GetMovieByIdRequest,
  GetMovieByIdResponse,
  GetMoviesRequest,
  GetMoviesResponse,
  GetScreeningsByDateRequest,
  GetScreeningsByDateResponse,
  GetScreeningsByMovieIdRequest,
  GetScreeningsByMovieIdResponse,
  UpdateMovieRequest,
  UpdateMovieResponse,
} from '../types';

export async function getMovies(params?: GetMoviesRequest): Promise<GetMoviesResponse> {
  const movies = await request(apiClient.get<GetMoviesResponse>('/movies', { params }));
  return movies.map(normalizeMovie);
}

export async function getMovieById(id: GetMovieByIdRequest): Promise<GetMovieByIdResponse> {
  const movie = await request(apiClient.get<GetMovieByIdResponse>(`/movies/${id}`));
  return normalizeMovie(movie);
}

export async function getScreeningsByMovieId(
  id: GetScreeningsByMovieIdRequest
): Promise<GetScreeningsByMovieIdResponse> {
  const screenings = await request(
    apiClient.get<GetScreeningsByMovieIdResponse>(`/movies/${id}/screenings`)
  );
  return screenings.map(normalizeScreening);
}

export async function getRawMovieById(id: GetMovieByIdRequest): Promise<GetMovieByIdResponse> {
  return getMovieById(id);
}

export async function createMovie(payload: CreateMovieRequest): Promise<CreateMovieResponse> {
  const movie = await request(apiClient.post<CreateMovieResponse>('/movies', payload));
  return normalizeMovie(movie);
}

export async function updateMovie(
  id: UpdateMovieRequest['id'],
  payload: UpdateMovieRequest['payload']
): Promise<UpdateMovieResponse> {
  const movie = await request(apiClient.put<UpdateMovieResponse>(`/movies/${id}`, payload));
  return normalizeMovie(movie);
}

export async function createScreening(
  payload: CreateScreeningRequest
): Promise<CreateScreeningResponse> {
  const screening = await request(apiClient.post<CreateScreeningResponse>('/screenings', payload));
  return normalizeScreening(screening);
}

export async function getScreeningsByDate(
  date: GetScreeningsByDateRequest
): Promise<GetScreeningsByDateResponse> {
  const screenings = await request(
    apiClient.get<GetScreeningsByDateResponse>('/screenings', { params: { date } })
  );
  return screenings.map(normalizeScreening);
}
