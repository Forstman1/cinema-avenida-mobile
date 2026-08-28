import { Api } from '../api/api';
import {
  movieByIdUrl,
  movieScreeningsUrl,
  moviesUrl,
  screeningByIdUrl,
  screeningsUrl,
} from '../api/endpoints';
import { request } from '../api/errors';
import { normalizeMovie, normalizeScreening } from '../api/normalizers';
import type {
  CreateMovieRequest,
  CreateMovieResponse,
  CreateScreeningRequest,
  CreateScreeningResponse,
  DeleteScreeningRequest,
  DeleteScreeningResponse,
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
  UpdateScreeningRequest,
  UpdateScreeningResponse,
} from '../types';
import { BaseService } from './base';

class MovieService extends BaseService {
  public async getMovies(params?: GetMoviesRequest): Promise<GetMoviesResponse> {
    try {
      const movies = await request(Api().get<GetMoviesResponse>(moviesUrl(), { params }));
      return movies.map(normalizeMovie);
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async getMovieById(id: GetMovieByIdRequest): Promise<GetMovieByIdResponse> {
    try {
      const movie = await request(Api().get<GetMovieByIdResponse>(movieByIdUrl(id)));
      return normalizeMovie(movie);
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async getRawMovieById(id: GetMovieByIdRequest): Promise<GetMovieByIdResponse> {
    return this.getMovieById(id);
  }

  public async getScreeningsByMovieId(
    id: GetScreeningsByMovieIdRequest,
  ): Promise<GetScreeningsByMovieIdResponse> {
    try {
      const screenings = await request(
        Api().get<GetScreeningsByMovieIdResponse>(movieScreeningsUrl(id)),
      );
      return screenings.map(normalizeScreening);
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async createMovie(payload: CreateMovieRequest): Promise<CreateMovieResponse> {
    try {
      const movie = await request(Api().post<CreateMovieResponse>(moviesUrl(), payload));
      return normalizeMovie(movie);
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async updateMovie(
    id: UpdateMovieRequest['id'],
    payload: UpdateMovieRequest['payload'],
  ): Promise<UpdateMovieResponse> {
    try {
      const movie = await request(Api().put<UpdateMovieResponse>(movieByIdUrl(id), payload));
      return normalizeMovie(movie);
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async createScreening(
    payload: CreateScreeningRequest,
  ): Promise<CreateScreeningResponse> {
    try {
      const screening = await request(
        Api().post<CreateScreeningResponse>(screeningsUrl(), payload),
      );
      return normalizeScreening(screening);
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async updateScreening(
    id: UpdateScreeningRequest['id'],
    payload: UpdateScreeningRequest['payload'],
  ): Promise<UpdateScreeningResponse> {
    try {
      const screening = await request(
        Api().put<UpdateScreeningResponse>(screeningByIdUrl(id), payload),
      );
      return normalizeScreening(screening);
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async deleteScreening(
    id: DeleteScreeningRequest,
  ): Promise<DeleteScreeningResponse> {
    try {
      return await request(
        Api().delete<DeleteScreeningResponse>(screeningByIdUrl(id)),
      );
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async getScreeningsByDate(
    date: GetScreeningsByDateRequest,
  ): Promise<GetScreeningsByDateResponse> {
    try {
      const screenings = await request(
        Api().get<GetScreeningsByDateResponse>(screeningsUrl(), { params: { date } }),
      );
      return screenings.map(normalizeScreening);
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}

export const MovieServiceInstance = new MovieService();
