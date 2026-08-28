import type { ISODateString, Reservation, Screening, TimeString } from '../types';

const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MONTHS = ['Jan.', 'Fév.', 'Mar.', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

function getDateTimePartsInTimezone(
  date: Date,
  timezone: string
): Record<string, string> | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const values: Record<string, string> = {};
    parts.forEach((part) => {
      values[part.type] = part.value;
    });
    return values.year && values.month && values.day && values.hour && values.minute
      ? values
      : null;
  } catch {
    return null;
  }
}

function getScreeningDateTimeValue(screening: Screening, timezone?: string): Date | null {
  if (!screening.date) return null;

  const dateString = toISODate(screening.date);
  const date = parseLocalDate(dateString);
  if (!date) return null;

  const normalizedTime = toHHMM(screening.showTime);
  if (!/^\d{2}:\d{2}$/.test(normalizedTime)) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = normalizedTime.split(':').map(Number);

  if (!timezone) {
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Treat the API date/time as a wall-clock value in the cinema timezone,
  // then resolve it to the corresponding instant for accurate hour checks.
  const wallTimeAsUtc = Date.UTC(year, month - 1, day, hours, minutes);
  let timestamp = wallTimeAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getDateTimePartsInTimezone(new Date(timestamp), timezone);
    if (!parts) {
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
    const displayedWallTime = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    const nextTimestamp = wallTimeAsUtc - (displayedWallTime - timestamp);
    if (nextTimestamp === timestamp) break;
    timestamp = nextTimestamp;
  }

  return new Date(timestamp);
}

function getLocalDateTimeKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDateTimeKeyInTimezone(date: Date, timezone?: string): string {
  if (!timezone) return getLocalDateTimeKey(date);

  const values = getDateTimePartsInTimezone(date, timezone);
  return values
    ? `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
    : getLocalDateTimeKey(date);
}

function getScreeningDateTimeKey(screening: Screening): string | null {
  const date = toISODate(screening.date);
  const time = toHHMM(screening.showTime);
  if (!parseLocalDate(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return `${date}T${time}`;
}

export function getScreeningDateTime(reservation: Reservation, timezone?: string): Date | null {
  return reservation.screening
    ? getScreeningDateTimeValue(reservation.screening, timezone)
    : null;
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

export function isScreeningInFuture(
  screening: Screening,
  now = new Date(),
  timezone?: string
): boolean {
  const screeningDateTimeKey = getScreeningDateTimeKey(screening);
  if (!screeningDateTimeKey) return false;
  return screeningDateTimeKey > getDateTimeKeyInTimezone(now, timezone);
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

export function getNextScreening(
  screenings: Screening[],
  now = new Date(),
  timezone?: string
): Screening | null {
  const upcoming = screenings.filter((screening) => isScreeningInFuture(screening, now, timezone));
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
