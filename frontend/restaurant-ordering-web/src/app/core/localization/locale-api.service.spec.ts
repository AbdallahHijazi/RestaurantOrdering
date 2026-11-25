import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../config/api-config';
import { LocaleApiService } from './locale-api.service';

describe('LocaleApiService', () => {
  let service: LocaleApiService;
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(LocaleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('loads system locales', () => {
    service.getSystemLocales().subscribe((locales) => {
      expect(locales[0]?.code).toBe('ar');
      expect(locales[0]?.direction).toBe('rtl');
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/api/v1/system/locales`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        code: 'ar',
        displayName: 'Arabic',
        nativeName: 'العربية',
        direction: 'rtl',
      },
    ]);
  });

  it('loads restaurant locale settings', () => {
    service.getRestaurantLocaleSettings('restaurant-id').subscribe((settings) => {
      expect(settings.defaultLocale).toBe('ar');
      expect(settings.availableLocales[1]?.code).toBe('fr');
    });

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/restaurant-id/locales`,
    );
    req.flush({
      defaultLocale: 'ar',
      translationMode: 'Manual',
      supportedLocales: [{ code: 'ar', isEnabled: true, sortOrder: 0 }],
      availableLocales: [
        { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
        { code: 'fr', displayName: 'French', nativeName: 'Français', direction: 'ltr' },
      ],
      canManageLocales: true,
    });
  });
});
