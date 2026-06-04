import { TestBed } from '@angular/core/testing';
import { AdminBrandingService } from './admin-branding.service';

describe('AdminBrandingService', () => {
  let branding: AdminBrandingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    branding = TestBed.inject(AdminBrandingService);
  });

  it('shows a fallback initial when no logo is available', () => {
    expect(branding.logoUrl()).toBeNull();
    expect(branding.brandInitial().length).toBeGreaterThan(0);
  });

  it('uses a valid browser URL for logo preview', () => {
    branding.updateBranding({
      logoUrl: 'blob:http://localhost/fake-logo',
      nameAr: 'مطعم',
      nameEn: 'Restaurant',
    });

    expect(branding.logoUrl()).toBe('blob:http://localhost/fake-logo');
    expect(branding.logoLoadFailed()).toBe(false);
  });

  it('falls back after a logo load error', () => {
    branding.updateBranding({
      logoUrl: 'https://example.test/logo.png',
      nameAr: 'مطعم',
      nameEn: 'Restaurant',
    });

    branding.onLogoError();
    expect(branding.logoLoadFailed()).toBe(true);
  });
});
