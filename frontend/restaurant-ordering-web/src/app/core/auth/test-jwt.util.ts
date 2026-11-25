import { ApplicationRoles, type ApplicationRole } from './application-roles';

export function createTestAccessToken(options: {
  userId?: string;
  role?: ApplicationRole;
  restaurantId?: string | null;
}): string {
  const payload: Record<string, unknown> = {
    sub: options.userId ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  };

  if (options.role) {
    payload['role'] = options.role;
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] =
      options.role;
  }

  if (options.restaurantId) {
    payload['restaurant_id'] = options.restaurantId;
  }

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${header}.${body}.test-signature`;
}

export function createTestSession(
  role: ApplicationRole,
  restaurantId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
) {
  const userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  return {
    accessToken: createTestAccessToken({ userId, role, restaurantId }),
    expiresAtUtc: new Date(Date.now() + 60 * 60_000).toISOString(),
    userId,
    restaurantId,
    role,
  };
}

export const TestRoles = ApplicationRoles;
