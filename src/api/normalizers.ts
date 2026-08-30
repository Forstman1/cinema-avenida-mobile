import { toHHMM, toISODate } from '../utils/date';
import type {
  Movie,
  MovieSummary,
  PaidReservation,
  Reservation,
  ReservationScreening,
  Screening,
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

export function isPaidReservation(reservation: Reservation): reservation is PaidReservation {
  return reservation.ticket !== null && reservation.ticket !== undefined;
}
