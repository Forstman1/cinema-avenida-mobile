import apiClient from './client';
import { request } from './errors';
import type { GetCinemaConfigResponse } from '../types';

export async function getCinemaConfig(): Promise<GetCinemaConfigResponse> {
  return request(apiClient.get<GetCinemaConfigResponse>('/config'));
}
