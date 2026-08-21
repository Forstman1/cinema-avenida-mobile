import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import type { AuthResponse, AuthResult, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, name: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
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

  const parseAuthResponse = (data: any): { token: string; user: User } | null => {
    const token = data?.token ?? data?.accessToken ?? data?.authToken;
    const user = data?.user ?? data?.utilisateur ?? data?.account;
    if (!token || !user) {
      console.log('Unexpected auth response shape:', JSON.stringify(data, null, 2));
      return null;
    }
    return { token, user };
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      const parsed = parseAuthResponse(response.data);
      if (!parsed) {
        return {
          success: false,
          message: 'Réponse invalide du serveur : token ou utilisateur manquant.',
        };
      }
      await storeAuth(parsed.token, parsed.user);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed',
      };
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<AuthResult> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/signup', { email, password, name });
      const parsed = parseAuthResponse(response.data);
      if (!parsed) {
        return {
          success: false,
          message: 'Réponse invalide du serveur : token ou utilisateur manquant.',
        };
      }
      await storeAuth(parsed.token, parsed.user);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Signup failed',
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
