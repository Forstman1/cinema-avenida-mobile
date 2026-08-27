import { create } from 'zustand';

import { getAdminDashboard } from '../api/admin';
import { getApiErrorMessage } from '../api/errors';
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
      } catch (error: unknown) {
        if (requestGeneration === dashboardGeneration) {
          set({ error: getApiErrorMessage(error, 'Impossible de charger le tableau de bord.') });
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

      return startRequest(Boolean(get().dashboard));
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
