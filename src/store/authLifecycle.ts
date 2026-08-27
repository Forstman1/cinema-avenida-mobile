import { useAuthStore } from './authStore';
import { useAdminDashboardStore } from './adminDashboardStore';
import { useAdminMoviesStore } from './adminMoviesStore';
import { useAdminScreeningsStore } from './adminScreeningsStore';
import { useBookingsStore } from './bookingsStore';
import { useMoviesStore } from './moviesStore';
import { useReservationStore } from './reservationStore';

function getAuthIdentity(user: ReturnType<typeof useAuthStore.getState>['user']): string {
  return `${user?.id ?? 'none'}:${user?.role ?? 'none'}`;
}

let knownAuthIdentity = getAuthIdentity(useAuthStore.getState().user);

// One account-boundary listener owns all cross-store resets. This keeps logout
// and account switching safe regardless of which screen initiated the change.
useAuthStore.subscribe((state) => {
  const nextAuthIdentity = getAuthIdentity(state.user);
  if (nextAuthIdentity === knownAuthIdentity) return;

  knownAuthIdentity = nextAuthIdentity;
  useMoviesStore.getState().reset();
  useBookingsStore.getState().clearBookings();
  useReservationStore.getState().resetReservationFlow();
  useAdminMoviesStore.getState().reset();
  useAdminScreeningsStore.getState().reset();
  useAdminDashboardStore.getState().clearDashboard();
});
