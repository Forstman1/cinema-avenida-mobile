import apiClient from './client';
import { request } from './errors';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from '../types';

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  return request(apiClient.post<LoginResponse>('/auth/login', payload));
}

export async function signupRequest(payload: SignupRequest): Promise<SignupResponse> {
  return request(apiClient.post<SignupResponse>('/auth/signup', payload));
}
