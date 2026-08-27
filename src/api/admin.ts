import apiClient from './client';
import { request } from './errors';
import type { GetAdminDashboardResponse } from '../types';

export async function getAdminDashboard(): Promise<GetAdminDashboardResponse> {
  return request(apiClient.get<GetAdminDashboardResponse>('/admin/dashboard'));
}
