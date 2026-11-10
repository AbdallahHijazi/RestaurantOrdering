import {
  DEFAULT_ADMIN_ROUTE,
  DEFAULT_KITCHEN_ROUTE,
  sanitizeAdminReturnUrl,
  sanitizeReturnUrl,
} from './safe-return-url.util';

describe('safe-return-url.util', () => {
  it('accepts internal admin paths', () => {
    expect(sanitizeAdminReturnUrl('/admin')).toBe('/admin');
    expect(sanitizeReturnUrl('/admin/restaurant-profile', '/admin')).toBe(
      '/admin/restaurant-profile',
    );
  });

  it('accepts kitchen paths for kitchen role sanitization', () => {
    expect(sanitizeReturnUrl('/kitchen', '/kitchen')).toBe('/kitchen');
  });

  it('rejects external URLs', () => {
    expect(sanitizeAdminReturnUrl('https://evil.test/admin')).toBeNull();
    expect(sanitizeReturnUrl('//evil.test/kitchen', '/kitchen')).toBeNull();
  });

  it('rejects non-matching prefixes', () => {
    expect(sanitizeAdminReturnUrl('/r/demo/menu')).toBeNull();
    expect(sanitizeReturnUrl('/admin', '/kitchen')).toBeNull();
  });

  it('exposes default routes', () => {
    expect(DEFAULT_ADMIN_ROUTE).toBe('/admin/dashboard');
    expect(DEFAULT_KITCHEN_ROUTE).toBe('/kitchen');
  });
});
