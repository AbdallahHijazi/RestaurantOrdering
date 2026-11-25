import {
  ApplicationRole,
  SUPPORTED_APPLICATION_ROLES,
  isApplicationRole,
} from './application-roles';

const ROLE_CLAIM_KEYS = [
  'role',
  'roles',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
] as const;

const USER_ID_CLAIM_KEYS = [
  'sub',
  'nameid',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
] as const;

const RESTAURANT_ID_CLAIM_KEYS = ['restaurant_id'] as const;

export interface DecodedAuthClaims {
  userId: string;
  roles: string[];
  restaurantId: string | null;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return null;
  }

  try {
    const json = decodeBase64Url(parts[1]);
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractAuthClaims(token: string): DecodedAuthClaims | null {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  const userId = readFirstStringClaim(payload, USER_ID_CLAIM_KEYS);
  if (!userId) {
    return null;
  }

  const roles = readRoleClaims(payload);
  const restaurantId = readFirstStringClaim(payload, RESTAURANT_ID_CLAIM_KEYS);

  return {
    userId,
    roles,
    restaurantId,
  };
}

export function resolvePrimaryApplicationRole(roles: readonly string[]): ApplicationRole | null {
  for (const supported of SUPPORTED_APPLICATION_ROLES) {
    if (roles.includes(supported)) {
      return supported;
    }
  }

  return null;
}

export function isRestaurantScopedRole(role: ApplicationRole): boolean {
  return (
    role === 'RestaurantOwner' ||
    role === 'RestaurantManager' ||
    role === 'KitchenManager'
  );
}

function readRoleClaims(payload: Record<string, unknown>): string[] {
  const values: string[] = [];

  for (const key of ROLE_CLAIM_KEYS) {
    const claimValue = payload[key];
    if (typeof claimValue === 'string' && claimValue.trim()) {
      values.push(claimValue.trim());
    } else if (Array.isArray(claimValue)) {
      for (const entry of claimValue) {
        if (typeof entry === 'string' && entry.trim()) {
          values.push(entry.trim());
        }
      }
    }
  }

  return [...new Set(values)];
}

function readFirstStringClaim(
  payload: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + padding);
}

/** @internal Validates a resolved role string. */
export function toApplicationRole(role: string | null | undefined): ApplicationRole | null {
  if (!role || !isApplicationRole(role)) {
    return null;
  }

  return role;
}
