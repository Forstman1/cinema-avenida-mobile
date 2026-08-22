export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface SignupResponse {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthResult {
  success: boolean;
  message?: string;
}
