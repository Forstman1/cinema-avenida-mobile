import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { loginRequest, signupRequest } from '../api/auth';
import type { AuthResult, User } from '../types';

export const AUTH_TOKEN_STORAGE_KEY = 'token';
export const AUTH_USER_STORAGE_KEY = 'user';

export interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

let hydrationPromise: Promise<void> | null = null;

function getApiErrorMessage(error: any, defaultMessage: string): string {
  if (error.response) {
    const status = error.response.status;
    const backendMessage = error.response.data?.message || error.response.data?.error;

    if (status === 400) {
      return backendMessage ?? 'Veuillez remplir tous les champs.';
    }
    if (status === 401) {
      return 'Email ou mot de passe incorrect.';
    }
    if (status === 409) {
      return 'Cet email est déjà utilisé.';
    }
    return backendMessage ?? defaultMessage;
  }
  if (error.request) {
    return 'Impossible de joindre le serveur. Vérifiez l\'adresse IP ou votre connexion.';
  }
  return error.message ?? defaultMessage;
}

function isStoredUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<User>;
  return (
    typeof candidate.id === 'number' &&
    Number.isFinite(candidate.id) &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.role === 'string' &&
    candidate.role.length > 0
  );
}

async function persistSession(token: string, user: User): Promise<void> {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_STORAGE_KEY, token],
    [AUTH_USER_STORAGE_KEY, JSON.stringify(user)],
  ]);
}

async function clearPersistedSession(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY]);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  loading: true,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    if (hydrationPromise) {
      return hydrationPromise;
    }

    hydrationPromise = (async () => {
      try {
        const [[, storedToken], [, storedUser]] = await AsyncStorage.multiGet([
          AUTH_TOKEN_STORAGE_KEY,
          AUTH_USER_STORAGE_KEY,
        ]);

        let parsedUser: unknown = null;
        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
          } catch {
            parsedUser = null;
          }
        }

        // A session is restored only when both entries are present and the
        // complete user, including role, is valid. This avoids reviving a
        // stale user object without the role needed by admin navigation.
        if (storedToken && isStoredUser(parsedUser)) {
          set({ token: storedToken, user: parsedUser });
        } else {
          await clearPersistedSession();
          set({ token: null, user: null });
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        set({ token: null, user: null });
      } finally {
        set({ loading: false, hydrated: true });
      }
    })();

    try {
      await hydrationPromise;
    } finally {
      hydrationPromise = null;
    }
  },

  login: async (email, password) => {
    try {
      const { token, user } = await loginRequest(email, password);

      if (!token || !isStoredUser(user)) {
        return {
          success: false,
          message: 'Réponse invalide du serveur : token ou utilisateur manquant.',
        };
      }

      await persistSession(token, user);
      set({ token, user, loading: false, hydrated: true });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: getApiErrorMessage(error, 'Échec de la connexion.'),
      };
    }
  },

  signup: async (name, email, password) => {
    try {
      await signupRequest(name, email, password);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: getApiErrorMessage(error, 'Échec de l\'inscription.'),
      };
    }
  },

  logout: async () => {
    try {
      await clearPersistedSession();
    } catch (error) {
      console.error('Logout error:', error);
    }

    set({ token: null, user: null, loading: false, hydrated: true });
  },
}));
