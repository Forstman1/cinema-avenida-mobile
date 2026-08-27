import { create } from 'zustand';

import { getAdminDashboard } from '../api/admin';
import type { AdminDashboard as AdminDashboardData } from '../types';
import { useAuthStore } from './authStore';

const ADMIN_ROLE = 'ADMIN';

export interface AdminDashboardStore {
  dashboard: AdminDashboardData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  clearDashboard: () => void;
}

let dashboardGeneration = 0;
let inFlightDashboardRequest: Promise<void> | null = null;

function isAdmin(): boolean {
  return useAuthStore.getState().user?.role === ADMIN_ROLE;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Impossible de charger le tableau de bord.';
}

export const useAdminDashboardStore = create<AdminDashboardStore>((set, get) => {
  const startRequest = (refresh: boolean): Promise<void> => {
    const requestGeneration = dashboardGeneration;

    const request = (async () => {
      if (!isAdmin()) {
        if (requestGeneration === dashboardGeneration) {
          set({
            dashboard: null,
            error: null,
            isLoading: false,
            isRefreshing: false,
          });
        }
        return;
      }

      set({
        error: null,
        ...(refresh ? { isRefreshing: true } : { isLoading: true }),
      });

      try {
        const dashboard = await getAdminDashboard();

        if (requestGeneration !== dashboardGeneration || !isAdmin()) {
          return;
        }

        set({ dashboard, error: null });
      } catch (error) {
        if (requestGeneration === dashboardGeneration) {
          set({ error: getErrorMessage(error) });
        }
      } finally {
        if (requestGeneration === dashboardGeneration) {
          set(refresh ? { isRefreshing: false } : { isLoading: false });
        }
      }
    })();

    inFlightDashboardRequest = request;
    void request.then(
      () => {
        if (inFlightDashboardRequest === request) {
          inFlightDashboardRequest = null;
        }
      },
      () => {
        if (inFlightDashboardRequest === request) {
          inFlightDashboardRequest = null;
        }
      },
    );

    return request;
  };

  return {
    dashboard: null,
    isLoading: false,
    isRefreshing: false,
    error: null,

    fetchDashboard: () => {
      if (inFlightDashboardRequest) {
        return inFlightDashboardRequest;
      }

      return startRequest(false);
    },

    refreshDashboard: () => {
      if (inFlightDashboardRequest) {
        return inFlightDashboardRequest;
      }

      return startRequest(Boolean(get().dashboard));
    },

    clearDashboard: () => {
      dashboardGeneration += 1;
      inFlightDashboardRequest = null;
      set({
        dashboard: null,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });
    },
  };
});

let knownAuthIdentity = `${useAuthStore.getState().user?.id ?? 'none'}:${
  useAuthStore.getState().user?.role ?? 'none'
}`;

useAuthStore.subscribe((state) => {
  const nextAuthIdentity = `${state.user?.id ?? 'none'}:${state.user?.role ?? 'none'}`;

  if (nextAuthIdentity !== knownAuthIdentity) {
    knownAuthIdentity = nextAuthIdentity;
    useAdminDashboardStore.getState().clearDashboard();
  }
});
