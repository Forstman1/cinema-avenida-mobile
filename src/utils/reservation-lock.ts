import type { Reservation } from '../types';

export const RESERVATION_EXPIRED_MESSAGE =
  'Votre réservation a expiré. Veuillez sélectionner vos sièges à nouveau.';

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

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
