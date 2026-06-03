import { Injectable } from '@angular/core';
import {
  extractAuthClaims,
  isRestaurantScopedRole,
  resolvePrimaryApplicationRole,
  toApplicationRole,
} from './jwt.util';
import type { AuthSession } from './auth.models';
import { isApplicationRole } from './application-roles';

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
      const session = this.normalizeSession(parsed);
      if (!session) {
        this.clearSession();
        return null;
      }

      if (this.isExpired(session.expiresAtUtc)) {
        this.clearSession();
        return null;
      }

      return session;
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

  private normalizeSession(value: unknown): AuthSession | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;
    const accessToken =
      typeof record['accessToken'] === 'string' ? record['accessToken'].trim() : '';
    const expiresAtUtc =
      typeof record['expiresAtUtc'] === 'string' ? record['expiresAtUtc'] : '';

    if (!accessToken || !expiresAtUtc) {
      return null;
    }

    const claims = extractAuthClaims(accessToken);
    if (!claims) {
      return null;
    }

    const roleFromToken = resolvePrimaryApplicationRole(claims.roles);
    const storedRole = toApplicationRole(
      typeof record['role'] === 'string' ? record['role'] : null,
    );
    const role = roleFromToken ?? storedRole;

    if (!role || !isApplicationRole(role)) {
      return null;
    }

    if (roleFromToken && storedRole && roleFromToken !== storedRole) {
      return null;
    }

    const userIdFromToken = claims.userId;
    const storedUserId =
      typeof record['userId'] === 'string' ? record['userId'].trim() : null;
    const userId = userIdFromToken || storedUserId;

    if (!userId || (storedUserId && storedUserId !== userIdFromToken)) {
      return null;
    }

    const restaurantFromToken = claims.restaurantId;
    const storedRestaurantId = record['restaurantId'];
    const restaurantId =
      restaurantFromToken ??
      (typeof storedRestaurantId === 'string' ? storedRestaurantId : null);

    if (isRestaurantScopedRole(role) && !restaurantId) {
      return null;
    }

    if (
      restaurantFromToken &&
      typeof storedRestaurantId === 'string' &&
      storedRestaurantId !== restaurantFromToken
    ) {
      return null;
    }

    return {
      accessToken,
      expiresAtUtc,
      userId,
      restaurantId,
      role,
    };
  }

  private isExpired(expiresAtUtc: string): boolean {
    const expiresMs = Date.parse(expiresAtUtc);
    if (Number.isNaN(expiresMs)) {
      return true;
    }

    return Date.now() >= expiresMs;
  }
}
