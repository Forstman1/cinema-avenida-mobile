import { Api } from '../api/api';
import { loginUrl, profileUrl, signupUrl } from '../api/endpoints';
import { request } from '../api/errors';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '../types';
import { BaseService } from './base';

class AuthService extends BaseService {
  public async login(payload: LoginRequest): Promise<LoginResponse> {
    try {
      return await request(Api().post<LoginResponse>(loginUrl(), payload));
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async signup(payload: SignupRequest): Promise<SignupResponse> {
    try {
      return await request(Api().post<SignupResponse>(signupUrl(), payload));
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  public async updateProfile(
    payload: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> {
    try {
      return await request(Api().patch<UpdateProfileResponse>(profileUrl(), payload));
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}

export const AuthServiceInstance = new AuthService();
