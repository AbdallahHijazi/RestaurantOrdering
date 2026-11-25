import { describe, expect, it } from 'vitest';
import {
  decodeJwtPayload,
  extractAuthClaims,
  resolvePrimaryApplicationRole,
} from './jwt.util';
import { ApplicationRoles } from './application-roles';

function createToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${header}.${body}.signature`;
}

describe('jwt.util', () => {
  it('decodes role and restaurant_id claims from backend-shaped token', () => {
    const token = createToken({
      sub: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      restaurant_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      role: ApplicationRoles.KitchenManager,
    });

    expect(extractAuthClaims(token)).toEqual({
      userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      roles: [ApplicationRoles.KitchenManager],
      restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });
  });

  it('reads ClaimTypes-style role and nameidentifier claims', () => {
    const token = createToken({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier':
        'user-id-1',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role':
        ApplicationRoles.RestaurantOwner,
      restaurant_id: 'restaurant-id-1',
    });

    const claims = extractAuthClaims(token);
    expect(claims?.userId).toBe('user-id-1');
    expect(resolvePrimaryApplicationRole(claims!.roles)).toBe(
      ApplicationRoles.RestaurantOwner,
    );
  });

  it('returns null for malformed tokens without throwing', () => {
    expect(decodeJwtPayload('')).toBeNull();
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.b')).toBeNull();
    expect(extractAuthClaims('{not-json')).toBeNull();
  });

  it('returns null when role claim is missing', () => {
    const token = createToken({
      sub: 'user-id-2',
      restaurant_id: 'restaurant-id-2',
    });

    expect(resolvePrimaryApplicationRole(extractAuthClaims(token)!.roles)).toBeNull();
  });
});
