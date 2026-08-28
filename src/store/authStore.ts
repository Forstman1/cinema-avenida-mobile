import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { setUnauthorizedHandler } from '../api/api';
import { getApiErrorDetails, getApiErrorMessage } from '../api/errors';
import { AuthServiceInstance } from '../services/AuthService';
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
let authOperationVersion = 0;

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
    (candidate.role === 'CLIENT' || candidate.role === 'ADMIN')
  );
}

function getAuthErrorMessage(error: unknown, defaultMessage: string): string {
  const details = getApiErrorDetails(error);
  if (details.status === 400) return details.message || 'Veuillez remplir tous les champs.';
  if (details.status === 401) return 'Email ou mot de passe incorrect.';
  if (details.status === 409) return 'Cet email est déjà utilisé.';
  return getApiErrorMessage(error, defaultMessage);
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

    const operationVersion = authOperationVersion;
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
        if (operationVersion !== authOperationVersion) return;

        if (storedToken && isStoredUser(parsedUser)) {
          set({ token: storedToken, user: parsedUser });
        } else {
          await clearPersistedSession();
          set({ token: null, user: null });
        }
      } catch (error: unknown) {
        console.error('Failed to restore auth state:', error);
        if (operationVersion === authOperationVersion) {
          set({ token: null, user: null });
        }
      } finally {
        if (operationVersion === authOperationVersion) {
          set({ loading: false, hydrated: true });
        }
      }
    })();

    try {
      await hydrationPromise;
    } finally {
      hydrationPromise = null;
    }
  },

  login: async (email, password) => {
    const operationVersion = ++authOperationVersion;
    try {
      const { token, user } = await AuthServiceInstance.login({ email, password });

      if (!token || !isStoredUser(user)) {
        return {
          success: false,
          message: 'Réponse invalide du serveur : token ou utilisateur manquant.',
        };
      }

      await persistSession(token, user);
      if (operationVersion !== authOperationVersion) {
        await clearPersistedSession();
        return { success: false, message: 'La session a été réinitialisée.' };
      }
      set({ token, user, loading: false, hydrated: true });
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        message: getAuthErrorMessage(error, 'Échec de la connexion.'),
      };
    }
  },

  signup: async (name, email, password) => {
    try {
      await AuthServiceInstance.signup({ name, email, password });
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        message: getAuthErrorMessage(error, 'Échec de l\'inscription.'),
      };
    }
  },

  logout: async () => {
    // Change auth state first so the centralized lifecycle reset runs even if
    // storage cleanup is slow or fails.
    authOperationVersion += 1;
    set({ token: null, user: null, loading: false, hydrated: true });

    try {
      await clearPersistedSession();
    } catch (error: unknown) {
      console.error('Logout error:', error);
    }
  },
}));

// Keep authentication state in sync when the centralized API client receives
// a 401 for a request made with an existing token.
setUnauthorizedHandler(() => useAuthStore.getState().logout());
