import type { Reservation } from '../types';

const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MONTHS = ['Jan.', 'Fév.', 'Mar.', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

export function getScreeningDateTime(reservation: Reservation): Date | null {
  const screening = reservation.screening;
  if (!screening?.date) return null;

  const date = new Date(screening.date);
  if (Number.isNaN(date.getTime())) return null;

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

export function formatScreeningDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return 'Aujourd\'hui';
  }

  const dayName = WEEKDAYS[date.getDay()];
  const dayNumber = date.getDate();
  const month = MONTHS[date.getMonth()];

  return `${dayName} ${dayNumber} ${month}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toISODate(dateString: string): string {
  return dateString.split('T')[0];
}

export function formatDuration(minutesValue: string | number): string {
  const total = typeof minutesValue === 'string' ? parseInt(minutesValue, 10) : minutesValue;
  if (Number.isNaN(total)) return String(minutesValue);

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
