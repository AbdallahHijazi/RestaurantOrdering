import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import {
  ApplicationRole,
  getDefaultRouteForRole,
  isApplicationRole,
} from './application-roles';
import { AuthSessionService } from './auth-session.service';
import {
  extractAuthClaims,
  isRestaurantScopedRole,
  resolvePrimaryApplicationRole,
} from './jwt.util';
import {
  LoginError,
  type AuthSession,
  type LoginRequest,
  type LoginResponse,
} from './auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionStorage = inject(AuthSessionService);
  private readonly router = inject(Router);

  private readonly sessionState = signal<AuthSession | null>(null);

  readonly currentSession = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly currentRole = computed(() => this.sessionState()?.role ?? null);
  readonly restaurantId = computed(() => this.sessionState()?.restaurantId ?? null);
  readonly userId = computed(() => this.sessionState()?.userId ?? null);
  readonly expiresAtUtc = computed(() => this.sessionState()?.expiresAtUtc ?? null);

  constructor() {
    this.restoreSessionFromStorage();
  }

  login(email: string, password: string): Observable<void> {
    const request: LoginRequest = {
      email: email.trim(),
      password,
    };

    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/api/v1/auth/login`, request)
      .pipe(
        map((response) => {
          const session = this.buildSessionFromLoginResponse(response);
          if (!session) {
            this.clearSessionState();
            throw new LoginError('unsupported-role');
          }

          this.persistSession(session);
        }),
        catchError((error: unknown) => {
          if (error instanceof LoginError) {
            return throwError(() => error);
          }

          return throwError(() => this.mapLoginError(error));
        }),
      );
  }

  logout(options?: { navigate?: boolean }): void {
    this.clearSessionState();

    if (options?.navigate !== false) {
      void this.router.navigateByUrl('/login');
    }
  }

  restoreSessionFromStorage(): void {
    const session = this.sessionStorage.readSession();
    this.sessionState.set(session);
  }

  hasAnyRole(...roles: ApplicationRole[]): boolean {
    const current = this.currentRole();
    return current !== null && roles.includes(current);
  }

  getDefaultRouteForCurrentUser(): string {
    const role = this.currentRole();
    if (!role) {
      return '/login';
    }

    return getDefaultRouteForRole(role);
  }

  private persistSession(session: AuthSession): void {
    this.sessionStorage.saveSession(session);
    this.sessionState.set(session);
  }

  private clearSessionState(): void {
    this.sessionStorage.clearSession();
    this.sessionState.set(null);
  }

  private buildSessionFromLoginResponse(response: LoginResponse): AuthSession | null {
    const accessToken = response.accessToken?.trim();
    if (!accessToken) {
      return null;
    }

    const claims = extractAuthClaims(accessToken);
    if (!claims) {
      return null;
    }

    const role = resolvePrimaryApplicationRole(claims.roles);
    if (!role || !isApplicationRole(role)) {
      return null;
    }

    const userId = response.userId?.trim() || claims.userId;
    if (!userId || userId !== claims.userId) {
      return null;
    }

    const restaurantId = response.restaurantId ?? claims.restaurantId;
    if (isRestaurantScopedRole(role) && !restaurantId) {
      return null;
    }

    if (
      claims.restaurantId &&
      response.restaurantId &&
      claims.restaurantId !== response.restaurantId
    ) {
      return null;
    }

    if (!response.expiresAtUtc || Number.isNaN(Date.parse(response.expiresAtUtc))) {
      return null;
    }

    return {
      accessToken,
      expiresAtUtc: response.expiresAtUtc,
      userId,
      restaurantId,
      role,
    };
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
