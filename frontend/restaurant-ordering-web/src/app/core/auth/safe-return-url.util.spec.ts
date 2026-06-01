import { DEFAULT_ADMIN_ROUTE, sanitizeAdminReturnUrl } from './safe-return-url.util';

describe('sanitizeAdminReturnUrl', () => {
  it('accepts internal admin paths', () => {
    expect(sanitizeAdminReturnUrl('/admin/restaurant-profile')).toBe(
      '/admin/restaurant-profile',
    );
  });

  it('rejects external URLs', () => {
    expect(sanitizeAdminReturnUrl('https://evil.test/admin/restaurant-profile')).toBeNull();
    expect(sanitizeAdminReturnUrl('//evil.test/admin/restaurant-profile')).toBeNull();
  });

  it('rejects non-admin paths', () => {
    expect(sanitizeAdminReturnUrl('/r/demo/menu')).toBeNull();
    expect(sanitizeAdminReturnUrl('/login')).toBeNull();
  });

  it('exposes default admin route', () => {
    expect(DEFAULT_ADMIN_ROUTE).toBe('/admin/restaurant-profile');
  });
});
