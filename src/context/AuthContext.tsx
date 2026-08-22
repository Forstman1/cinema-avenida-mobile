import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import type { AuthResult, LoginResponse, SignupResponse, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from AsyncStorage on app start.
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const storeAuth = async (newToken: string, newUser: User): Promise<void> => {
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data;

      if (!newToken || !newUser) {
        return {
          success: false,
          message: 'Réponse invalide du serveur : token ou utilisateur manquant.',
        };
      }

      await storeAuth(newToken, newUser);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: getApiErrorMessage(error, 'Échec de la connexion.'),
      };
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<AuthResult> => {
    try {
      await apiClient.post<SignupResponse>('/auth/signup', { name, email, password });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: getApiErrorMessage(error, 'Échec de l\'inscription.'),
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Logout error:', error);
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
