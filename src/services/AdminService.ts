import { Api } from '../api/api';
import { adminDashboardUrl } from '../api/endpoints';
import { request } from '../api/errors';
import type { GetAdminDashboardResponse } from '../types';
import { BaseService } from './base';

class AdminService extends BaseService {
  public async getAdminDashboard(): Promise<GetAdminDashboardResponse> {
    try {
      return await request(Api().get<GetAdminDashboardResponse>(adminDashboardUrl()));
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}

export const AdminServiceInstance = new AdminService();
