const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MONTHS = ['Jan.', 'Fév.', 'Mar.', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

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

export function formatDuration(minutesValue: string | number): string {
  const total = typeof minutesValue === 'string' ? parseInt(minutesValue, 10) : minutesValue;
  if (Number.isNaN(total)) return String(minutesValue);

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
