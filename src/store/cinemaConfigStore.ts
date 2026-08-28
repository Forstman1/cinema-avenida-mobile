import { create } from 'zustand';

import { getApiErrorMessage } from '../api/errors';
import { ConfigServiceInstance } from '../services/ConfigService';
import type { CinemaConfig } from '../types';

export interface CinemaConfigStore {
  config: CinemaConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<CinemaConfig | null>;
  reset: () => void;
}

let configRequestVersion = 0;
let inFlightConfigRequest: Promise<CinemaConfig | null> | null = null;

export const useCinemaConfigStore = create<CinemaConfigStore>((set, get) => ({
  config: null,
  isLoading: false,
  error: null,

  fetchConfig: () => {
    const cachedConfig = get().config;
    if (cachedConfig) return Promise.resolve(cachedConfig);
    if (inFlightConfigRequest) return inFlightConfigRequest;

    const requestVersion = ++configRequestVersion;
    set({ isLoading: true, error: null });

    let request: Promise<CinemaConfig | null> | null = null;
    request = (async () => {
      try {
        const config = await ConfigServiceInstance.getCinemaConfig();
        if (requestVersion !== configRequestVersion) return null;
        set({ config, error: null });
        return config;
      } catch (error: unknown) {
        if (requestVersion !== configRequestVersion) return null;
        set({ error: getApiErrorMessage(error, 'Impossible de charger la configuration du cinéma.') });
        return null;
      } finally {
        if (requestVersion === configRequestVersion) set({ isLoading: false });
        if (inFlightConfigRequest === request) inFlightConfigRequest = null;
      }
    })();

    const startedRequest = request as Promise<CinemaConfig | null>;
    inFlightConfigRequest = startedRequest;
    return startedRequest;
  },

  reset: () => {
    configRequestVersion += 1;
    inFlightConfigRequest = null;
    set({ config: null, isLoading: false, error: null });
  },
}));
