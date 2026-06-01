import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { AuthSessionService } from './auth-session.service';
import { LoginError, type LoginRequest, type LoginResponse } from './auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);

  login(email: string, password: string): Observable<void> {
    const request: LoginRequest = {
      email: email.trim(),
      password,
    };

    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/api/v1/auth/login`, request)
      .pipe(
        map((response) => {
          this.session.saveSession({
            accessToken: response.accessToken,
            expiresAtUtc: response.expiresAtUtc,
            restaurantId: response.restaurantId,
          });
        }),
        catchError((error: unknown) => throwError(() => this.mapLoginError(error))),
      );
  }

  logout(): void {
    this.session.clearSession();
  }

  private mapLoginError(error: unknown): LoginError {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return new LoginError('invalid-credentials');
      }

      if (error.status === 429) {
        return new LoginError('too-many-requests');
      }

      if (error.status === 0 || error.status >= 500) {
        return new LoginError('network');
      }
    }

    return new LoginError('network');
  }
}
