import apiClient from './client';
import type { LoginResponse, SignupResponse } from '../types';

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return response.data;
}

export async function signupRequest(
  name: string,
  email: string,
  password: string
): Promise<SignupResponse> {
  const response = await apiClient.post<SignupResponse>('/auth/signup', {
    name,
    email,
    password,
  });
  return response.data;
}
