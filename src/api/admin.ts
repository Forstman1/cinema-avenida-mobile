import apiClient from './client';
import type { AdminDashboard } from '../types';

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const response = await apiClient.get<AdminDashboard>('/admin/dashboard');
  return response.data;
}
