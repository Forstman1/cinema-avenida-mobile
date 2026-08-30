import { toHHMM, toISODate } from '../utils/date';
import type {
  Movie,
  MovieReference,
  MovieSummary,
  PaidReservation,
  Reservation,
  ReservationScreening,
  Screening,
  ScreeningReference,
  Seat,
} from '../types';

export function normalizeScreening(screening: Screening): Screening {
  return {
    ...screening,
    date: toISODate(screening.date),
    showTime: toHHMM(screening.showTime),
  };
}

export function normalizeMovie(movie: Movie): Movie {
  const poster = typeof movie.poster === 'string' ? movie.poster.trim() : null;
  return {
    ...movie,
    poster: poster || null,
    screenings: movie.screenings?.map(normalizeScreening),
  };
}

export function normalizeMovieSummary(movie: MovieSummary): MovieSummary {
  const poster = typeof movie.poster === 'string' ? movie.poster.trim() : null;
  return {
    id: movie.id,
    title: movie.title,
    poster: poster || null,
  };
}

export function normalizeReservationScreening(
  screening: ReservationScreening
): ReservationScreening {
  const normalized = normalizeScreening(screening);
  return {
    id: normalized.id,
    date: normalized.date,
    showTime: normalized.showTime,
    movieId: normalized.movieId,
    movie: normalizeMovieSummary(screening.movie),
  };
}

export function normalizeReservation(reservation: Reservation): Reservation {
  return {
    ...reservation,
    screening: normalizeReservationScreening(reservation.screening),
    reservationSeats: reservation.reservationSeats.map((reservationSeat) => ({
      ...reservationSeat,
      lockedUntil: reservationSeat.lockedUntil ?? null,
    })),
  };
}

function toMovieSummary(movie: MovieReference): MovieSummary {
  return { id: movie.id, title: movie.title, poster: movie.poster };
}

function normalizePaymentReservationScreening(
  source: ScreeningReference | undefined,
  movie: MovieReference | undefined,
): ReservationScreening | undefined {
  if (!source) return undefined;

  const movieSummary = 'movie' in source
    ? source.movie
    : movie
      ? toMovieSummary(movie)
      : undefined;
  if (!movieSummary) return undefined;

  return {
    id: source.id,
    date: toISODate(source.date),
    showTime: source.showTime,
    movieId: source.movieId,
    movie: toMovieSummary(movieSummary),
  };
}

export function normalizePaymentReservation(
  source: Reservation | null | undefined,
  movie: MovieReference | undefined,
  screening: ScreeningReference | undefined,
  seats: Seat[] | undefined,
): Reservation | null {
  if (!source || !Number.isInteger(source.id)) return null;

  const baseScreening = source.screening ?? screening;
  const normalizedScreening = normalizePaymentReservationScreening(baseScreening, movie);

  const reservationSeats = source.reservationSeats.length > 0
    ? source.reservationSeats
    : (seats ?? []).map((seat) => ({
        id: seat.id,
        seatId: seat.id,
        seat,
        reservationId: source.id,
        lockedUntil: null,
      }));

  return {
    ...source,
    screening: normalizedScreening ?? source.screening,
    reservationSeats,
  };
}

export function isPaidReservation(reservation: Reservation): reservation is PaidReservation {
  return reservation.ticket !== null && reservation.ticket !== undefined;
}
