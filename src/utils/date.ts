import type { ISODateString, Reservation, Screening, TimeString } from '../types';

const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MONTHS = ['Jan.', 'Fév.', 'Mar.', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

function getScreeningDateTimeValue(screening: Screening): Date | null {
  if (!screening.date) return null;

  const date = parseLocalDate(screening.date);
  if (!date) return null;

  const [hoursStr, minutesStr] = (screening.showTime ?? '00:00').split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  date.setHours(
    Number.isNaN(hours) ? 0 : hours,
    Number.isNaN(minutes) ? 0 : minutes,
    0,
    0
  );

  return date;
}

export function getScreeningDateTime(reservation: Reservation): Date | null {
  return reservation.screening ? getScreeningDateTimeValue(reservation.screening) : null;
}

export function formatScreeningDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  if (!date) return dateString;

  if (toISODateString(date) === getTodayDateString()) {
    return 'Aujourd\'hui';
  }

  const dayName = WEEKDAYS[date.getDay()];
  const dayNumber = date.getDate();
  const month = MONTHS[date.getMonth()];

  return `${dayName} ${dayNumber} ${month}`;
}

export function getTodayDateString(): ISODateString {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as ISODateString;
}

export function toISODate(dateString: string): ISODateString {
  return dateString.split('T')[0] as ISODateString;
}

export function toHHMM(timeString: string): TimeString {
  const [hours = '00', minutes = '00'] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}` as TimeString;
}

/** Parse an API calendar date without allowing the runtime to apply a UTC offset. */
export function parseLocalDate(dateString: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toISODate(dateString));
  if (!match) return null;

  const [, yearString, monthString, dayString] = match;
  const date = new Date(Number(yearString), Number(monthString) - 1, Number(dayString));
  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== Number(yearString) ||
    date.getMonth() !== Number(monthString) - 1 ||
    date.getDate() !== Number(dayString)
  ) {
    return null;
  }

  return date;
}

export function isScreeningInFuture(screening: Screening, now = new Date()): boolean {
  const screeningDateTime = getScreeningDateTimeValue(screening);
  return Boolean(screeningDateTime && screeningDateTime.getTime() >= now.getTime());
}

export function formatDuration(minutesValue: number): string {
  const total = minutesValue;
  if (Number.isNaN(total)) return String(minutesValue);

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

function compareScreeningsByDateTime(a: Screening, b: Screening): number {
  const dateA = toISODate(a.date);
  const dateB = toISODate(b.date);
  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }
  return compareShowTimes(a.showTime, b.showTime);
}

/** Compare cinema show times numerically, including unpadded API values such as `8:00`. */
export function compareShowTimes(a: string, b: string): number {
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };

  const minutesA = toMinutes(a);
  const minutesB = toMinutes(b);
  if (minutesA !== null && minutesB !== null && minutesA !== minutesB) {
    return minutesA - minutesB;
  }
  return a.localeCompare(b);
}

export function getNextScreening(screenings: Screening[]): Screening | null {
  const upcoming = screenings.filter((screening) => isScreeningInFuture(screening));
  if (!upcoming.length) return null;
  return [...upcoming].sort(compareScreeningsByDateTime)[0] ?? null;
}

export function toISODateString(date: Date): ISODateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as ISODateString;
}

export function getRemainingDaysOfWeek(fromDate = new Date()): Date[] {
  const days: Date[] = [];
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
  for (let i = 0; i <= daysUntilSunday; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}
