import { Api } from '../api/api';
import { cinemaConfigUrl } from '../api/endpoints';
import { request } from '../api/errors';
import type { GetCinemaConfigResponse } from '../types';
import { BaseService } from './base';

class ConfigService extends BaseService {
  public async getCinemaConfig(): Promise<GetCinemaConfigResponse> {
    try {
      return await request(Api().get<GetCinemaConfigResponse>(cinemaConfigUrl()));
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}

export const ConfigServiceInstance = new ConfigService();
