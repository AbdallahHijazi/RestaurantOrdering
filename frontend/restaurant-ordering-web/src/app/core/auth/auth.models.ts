export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
  userId: string;
  restaurantId: string | null;
}

export interface AuthSession {
  accessToken: string;
  expiresAtUtc: string;
  restaurantId: string | null;
}

export type LoginErrorCode = 'invalid-credentials' | 'too-many-requests' | 'network';

export class LoginError extends Error {
  readonly code: LoginErrorCode;

  constructor(code: LoginErrorCode) {
    super(code);
    this.name = 'LoginError';
    this.code = code;
  }
}
