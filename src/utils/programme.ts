import type { Movie, Screening } from '../types';
import { compareShowTimes, toISODate } from './date';

export type ProgrammeMovie = { movie: Movie; screenings: Screening[] };

export function getUniqueScreeningsForDate(
  movie: Movie,
  dateString: string
): Screening[] {
  const seenIds = new Set<number>();
  const seenTimes = new Set<string>();

  return (movie.screenings ?? [])
    .filter((screening) => toISODate(screening.date) === dateString)
    .sort((a, b) => compareShowTimes(a.showTime, b.showTime))
    .filter((screening) => {
      if (seenIds.has(screening.id) || seenTimes.has(screening.showTime)) return false;
      seenIds.add(screening.id);
      seenTimes.add(screening.showTime);
      return true;
    });
}

export function getProgrammeMovies(movies: Movie[], dateString: string): ProgrammeMovie[] {
  return movies.reduce<ProgrammeMovie[]>((result, movie) => {
    const screenings = getUniqueScreeningsForDate(movie, dateString);
    if (screenings.length > 0) result.push({ movie, screenings });
    return result;
  }, []);
}

export function getFeaturedProgrammeMovie(
  programmeMovies: ProgrammeMovie[]
): ProgrammeMovie | undefined {
  return programmeMovies.reduce<ProgrammeMovie | undefined>((earliest, candidate) => {
    if (!earliest) return candidate;
    return compareShowTimes(
      candidate.screenings[0].showTime,
      earliest.screenings[0].showTime
    ) < 0
      ? candidate
      : earliest;
  }, undefined);
}
