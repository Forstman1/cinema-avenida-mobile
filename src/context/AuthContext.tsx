import React, { useEffect, type ReactNode } from 'react';
import { useAuthStore, type AuthStore } from '../store/authStore';
import { useCinemaConfigStore } from '../store/cinemaConfigStore';
import '../store/authLifecycle';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const fetchConfig = useCinemaConfigStore((state) => state.fetchConfig);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  return <>{children}</>;
}

export function useAuth(): AuthStore {
  // Compatibility hook: existing consumers keep their imports while Zustand
  // remains the only source of authentication state.
  return useAuthStore();
}
