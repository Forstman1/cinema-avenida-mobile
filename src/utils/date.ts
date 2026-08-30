import type { ISODateString, Reservation, Screening, TimeString } from '../types';

export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

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

function getEffectiveTimezone(timezone?: string): string {
  if (timezone && getDateTimePartsInTimezone(new Date(0), timezone)) return timezone;
  return 'UTC';
}

function createUtcDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0
): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

export function getCalendarDateParts(dateString: string): CalendarDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toISODate(dateString));
  if (!match) return null;

  const [, yearString, monthString, dayString] = match;
  const parts = {
    year: Number(yearString),
    month: Number(monthString),
    day: Number(dayString),
  };
  const date = createUtcDate(parts.year, parts.month, parts.day);

  return date.getUTCFullYear() === parts.year
    && date.getUTCMonth() === parts.month - 1
    && date.getUTCDate() === parts.day
    ? parts
    : null;
}

function getInstantForWallClock(
  dateString: string,
  timeString: string,
  timezone?: string
): Date | null {
  const dateParts = getCalendarDateParts(dateString);
  const normalizedTime = toHHMM(timeString);
  if (!dateParts || !/^\d{2}:\d{2}$/.test(normalizedTime)) return null;

  const [hours, minutes] = normalizedTime.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;

  const wallTimeAsUtc = createUtcDate(
    dateParts.year,
    dateParts.month,
    dateParts.day,
    hours,
    minutes
  ).getTime();
  const effectiveTimezone = getEffectiveTimezone(timezone);
  let timestamp = wallTimeAsUtc;

  // Resolve the API wall-clock value to an instant in the cinema timezone.
  // A few iterations cover timezone offsets and daylight-saving transitions.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getDateTimePartsInTimezone(new Date(timestamp), effectiveTimezone);
    if (!parts) return null;

    const displayedWallTime = createUtcDate(
      Number(parts.year),
      Number(parts.month),
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    ).getTime();
    const nextTimestamp = wallTimeAsUtc - (displayedWallTime - timestamp);
    if (nextTimestamp === timestamp) break;
    timestamp = nextTimestamp;
  }

  return new Date(timestamp);
}

export function getTodayDateString(
  timezone?: string,
  now = new Date()
): ISODateString {
  const parts = getDateTimePartsInTimezone(now, getEffectiveTimezone(timezone));
  if (!parts) {
    const fallback = new Date(now);
    return `${fallback.getUTCFullYear()}-${String(fallback.getUTCMonth() + 1).padStart(2, '0')}-${String(fallback.getUTCDate()).padStart(2, '0')}` as ISODateString;
  }
  return `${parts.year}-${parts.month}-${parts.day}` as ISODateString;
}

export function getWeekdayIndex(dateString: string): number {
  const parts = getCalendarDateParts(dateString);
  if (!parts) return -1;
  return createUtcDate(parts.year, parts.month, parts.day).getUTCDay();
}

export function addCalendarDays(dateString: string, days: number): ISODateString {
  const parts = getCalendarDateParts(dateString);
  if (!parts) return dateString as ISODateString;

  const date = createUtcDate(parts.year, parts.month, parts.day);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` as ISODateString;
}

export function getStartOfWeekDateString(
  timezone?: string,
  now = new Date()
): ISODateString {
  const today = getTodayDateString(timezone, now);
  const weekday = getWeekdayIndex(today);
  const daysFromMonday = weekday === 0 ? -6 : 1 - weekday;
  return addCalendarDays(today, daysFromMonday);
}

export function getRemainingDaysOfWeek(
  timezone?: string,
  now = new Date()
): ISODateString[] {
  const today = getTodayDateString(timezone, now);
  const weekday = getWeekdayIndex(today);
  const daysUntilSunday = weekday === 0 ? 0 : 7 - weekday;
  return Array.from({ length: daysUntilSunday + 1 }, (_, index) =>
    addCalendarDays(today, index)
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatCalendarDate(
  dateString: string,
  timezone?: string,
  includeYear = false
): string {
  const normalized = toISODate(dateString);
  const parts = getCalendarDateParts(normalized);
  if (!parts) return dateString;

  const instant = getInstantForWallClock(normalized, '12:00', timezone);
  if (!instant) return normalized;

  return capitalize(new Intl.DateTimeFormat('fr-FR', {
    timeZone: getEffectiveTimezone(timezone),
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: includeYear ? 'numeric' : undefined,
  }).format(instant));
}

export function formatScreeningDate(
  dateString: string,
  timezone?: string,
  now = new Date()
): string {
  const normalized = toISODate(dateString);
  if (!getCalendarDateParts(normalized)) return dateString;
  if (normalized === getTodayDateString(timezone, now)) return 'Aujourd\'hui';

  const instant = getInstantForWallClock(normalized, '12:00', timezone);
  if (!instant) return normalized;

  const formatted = new Intl.DateTimeFormat('fr-FR', {
    timeZone: getEffectiveTimezone(timezone),
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(instant);
  const values: Record<string, string> = {};
  formatted.forEach((part) => {
    values[part.type] = part.value;
  });
  return `${capitalize(values.weekday ?? '')} ${values.day ?? ''} ${values.month ?? ''}`.trim();
}

export function toISODate(dateString: string): ISODateString {
  return dateString.split('T')[0] as ISODateString;
}

export function toHHMM(timeString: string): TimeString {
  const [hours = '00', minutes = '00'] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}` as TimeString;
}

/** Parse an API calendar date for date-picker values without parsing an ISO date as UTC. */
export function parseLocalDate(dateString: string): Date | null {
  const parts = getCalendarDateParts(dateString);
  if (!parts) return null;

  const date = new Date(parts.year, parts.month - 1, parts.day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === parts.year
    && date.getMonth() === parts.month - 1
    && date.getDate() === parts.day
    ? date
    : null;
}

export function getScreeningDateTime(
  reservation: Reservation,
  timezone?: string
): Date | null {
  return reservation.screening
    ? getScreeningInstant(reservation.screening, timezone)
    : null;
}

export function getScreeningInstant(
  screening: Screening,
  timezone?: string
): Date | null {
  return getInstantForWallClock(toISODate(screening.date), screening.showTime, timezone);
}

export function compareScreeningDateTime(
  screening: Screening,
  now = new Date(),
  timezone?: string
): number {
  const screeningInstant = getScreeningInstant(screening, timezone);
  return screeningInstant ? screeningInstant.getTime() - now.getTime() : -1;
}

/** Check a calendar date and official show time against the current instant. */
export function isScreeningDateTimeInPast(
  dateString: string,
  showTime: string,
  timezone?: string,
  now = new Date()
): boolean {
  const screeningInstant = getInstantForWallClock(dateString, showTime, timezone);
  return screeningInstant !== null && screeningInstant.getTime() <= now.getTime();
}

export function isScreeningPast(
  screening: Screening,
  timezone?: string,
  now = new Date()
): boolean {
  return isScreeningDateTimeInPast(screening.date, screening.showTime, timezone, now);
}

export function isScreeningInFuture(
  screening: Screening,
  now = new Date(),
  timezone?: string
): boolean {
  return compareScreeningDateTime(screening, now, timezone) > 0;
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
  if (dateA !== dateB) return dateA.localeCompare(dateB);
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

export function getMillisecondsUntilNextCinemaDay(
  timezone?: string,
  now = new Date()
): number {
  const tomorrow = addCalendarDays(getTodayDateString(timezone, now), 1);
  const nextMidnight = getInstantForWallClock(tomorrow, '00:00', timezone);
  if (!nextMidnight) return 60_000;
  return Math.max(1_000, nextMidnight.getTime() - now.getTime() + 1_000);
}
