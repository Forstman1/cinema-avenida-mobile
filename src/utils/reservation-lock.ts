import type { Reservation } from '../types';

export const RESERVATION_EXPIRED_MESSAGE =
  'Votre réservation a expiré. Veuillez sélectionner vos sièges à nouveau.';

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export function getRemainingReservationSeconds(
  lockExpiry: number | null,
  nowMs = Date.now(),
): number {
  if (lockExpiry === null) return 0;
  return Math.max(0, Math.floor((lockExpiry - nowMs) / 1000));
}

export function formatReservationCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function startReservationCountdown(
  lockExpiry: number | null,
  onUpdate: (remainingSeconds: number) => void,
): () => void {
  const updateRemaining = () => {
    onUpdate(getRemainingReservationSeconds(lockExpiry));
  };

  updateRemaining();
  const interval = setInterval(updateRemaining, 1000);

  return () => clearInterval(interval);
}

/**
 * Returns the earliest absolute lock expiry for a fully valid reservation.
 * Every reservation seat must have a valid ISO timestamp; one missing or
 * invalid value makes the reservation ineligible for local payment.
 */
export function getReservationLockExpiry(
  reservation: Pick<Reservation, 'reservationSeats'> | null | undefined,
): number | null {
  const reservationSeats = reservation?.reservationSeats ?? [];
  if (reservationSeats.length === 0) return null;

  const expiryTimes: number[] = [];
  for (const reservationSeat of reservationSeats) {
    const lockedUntil = reservationSeat.lockedUntil;
    if (
      typeof lockedUntil !== 'string' ||
      !ISO_TIMESTAMP_PATTERN.test(lockedUntil)
    ) {
      return null;
    }

    const expiryTime = Date.parse(lockedUntil);
    if (!Number.isFinite(expiryTime)) return null;
    expiryTimes.push(expiryTime);
  }

  return Math.min(...expiryTimes);
}
