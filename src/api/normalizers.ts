import { toHHMM, toISODate } from '../utils/date';
import type { Movie, Reservation, Screening } from '../types';

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

export function normalizeReservation(reservation: Reservation): Reservation {
  if (!reservation.screening) return reservation;

  return {
    ...reservation,
    screening: {
      ...normalizeScreening(reservation.screening),
      movie: normalizeMovie(reservation.screening.movie),
    },
  };
}
