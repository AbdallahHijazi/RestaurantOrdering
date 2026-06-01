export const DEFAULT_ADMIN_ROUTE = '/admin/restaurant-profile';

export function sanitizeAdminReturnUrl(returnUrl: string | null | undefined): string | null {
  if (!returnUrl) {
    return null;
  }

  const trimmed = returnUrl.trim();
  if (!trimmed.startsWith('/admin/')) {
    return null;
  }

  if (trimmed.includes('://') || trimmed.startsWith('//')) {
    return null;
  }

  return trimmed;
}
