import React, { useEffect, type ReactNode } from 'react';
import { useAuthStore, type AuthStore } from '../store/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return <>{children}</>;
}

export function useAuth(): AuthStore {
  // Compatibility hook: existing consumers keep their imports while Zustand
  // remains the only source of authentication state.
  return useAuthStore();
}
