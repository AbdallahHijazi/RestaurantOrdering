import { ApplicationRole, getDefaultRouteForRole } from './application-roles';

export const DEFAULT_ADMIN_ROUTE = '/admin/dashboard';
export const DEFAULT_KITCHEN_ROUTE = '/kitchen';

export function sanitizeReturnUrl(
  returnUrl: string | null | undefined,
  allowedPrefix: '/admin' | '/kitchen',
): string | null {
  if (!returnUrl) {
    return null;
  }

  const trimmed = returnUrl.trim();
  const prefixWithSlash = `${allowedPrefix}/`;
  const isExact = trimmed === allowedPrefix;
  const isChild = trimmed.startsWith(prefixWithSlash);

  if (!isExact && !isChild) {
    return null;
  }

  if (trimmed.includes('://') || trimmed.startsWith('//')) {
    return null;
  }

  return trimmed;
}

export function sanitizeReturnUrlForRole(
  returnUrl: string | null | undefined,
  role: ApplicationRole,
): string | null {
  if (role === 'KitchenManager') {
    return sanitizeReturnUrl(returnUrl, '/kitchen');
  }

  return sanitizeReturnUrl(returnUrl, '/admin');
}

export function resolvePostLoginRoute(
  returnUrl: string | null | undefined,
  role: ApplicationRole,
): string {
  return sanitizeReturnUrlForRole(returnUrl, role) ?? getDefaultRouteForRole(role);
}

/** @deprecated Use sanitizeReturnUrl(returnUrl, '/admin') */
export function sanitizeAdminReturnUrl(returnUrl: string | null | undefined): string | null {
  return sanitizeReturnUrl(returnUrl, '/admin');
}
