import { Injectable } from '@angular/core';
import type { AuthSession } from './auth.models';

const AUTH_SESSION_STORAGE_KEY = 'restaurant-ordering.auth.session';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  saveSession(session: AuthSession): void {
    try {
      sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // sessionStorage may be unavailable; ignore.
    }
  }

  readSession(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!this.isValidSession(parsed)) {
        this.clearSession();
        return null;
      }

      if (this.isExpired(parsed.expiresAtUtc)) {
        this.clearSession();
        return null;
      }

      return parsed;
    } catch {
      this.clearSession();
      return null;
    }
  }

  clearSession(): void {
    try {
      sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  hasValidSession(): boolean {
    return this.readSession() !== null;
  }

  getAccessToken(): string | null {
    return this.readSession()?.accessToken ?? null;
  }

  getRestaurantId(): string | null {
    return this.readSession()?.restaurantId ?? null;
  }

  private isValidSession(value: unknown): value is AuthSession {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const session = value as Record<string, unknown>;
    const hasToken =
      typeof session['accessToken'] === 'string' && session['accessToken'].trim().length > 0;
    const hasExpiry = typeof session['expiresAtUtc'] === 'string';
    const restaurantId = session['restaurantId'];

    return (
      hasToken &&
      hasExpiry &&
      (restaurantId === null || typeof restaurantId === 'string')
    );
  }

  private isExpired(expiresAtUtc: string): boolean {
    const expiresMs = Date.parse(expiresAtUtc);
    if (Number.isNaN(expiresMs)) {
      return true;
    }

    return Date.now() >= expiresMs;
  }
}
