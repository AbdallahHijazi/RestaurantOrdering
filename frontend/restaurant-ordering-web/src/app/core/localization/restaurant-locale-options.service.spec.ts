import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, afterEach } from 'vitest';
import { API_BASE_URL } from '../config/api-config';
import { LocaleService } from './locale';
import { RestaurantLocaleOptionsService } from './restaurant-locale-options.service';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('RestaurantLocaleOptionsService', () => {
  let service: RestaurantLocaleOptionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(RestaurantLocaleOptionsService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(LocaleService).setLocale('ar');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('falls back to ar/en when restaurant id is missing', () => {
    service.loadForRestaurant(null);
    expect(service.enabledLocales().map((locale) => locale.code)).toEqual(['ar', 'en']);
  });

  it('loads enabled locales from restaurant settings API', () => {
    service.loadForRestaurant(RESTAURANT_ID);

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/locales`,
    );
    req.flush({
      defaultLocale: 'ar',
      translationMode: 'ManualOnly',
      supportedLocales: [
        { code: 'ar', isEnabled: true, sortOrder: 1 },
        { code: 'en', isEnabled: true, sortOrder: 2 },
        { code: 'fr', isEnabled: true, sortOrder: 3 },
      ],
      availableLocales: [
        { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
        { code: 'en', displayName: 'English', nativeName: 'English', direction: 'ltr' },
        { code: 'fr', displayName: 'French', nativeName: 'Français', direction: 'ltr' },
      ],
      canManageLocales: true,
    });

    expect(service.enabledLocales().map((locale) => locale.code)).toEqual(['ar', 'en', 'fr']);
  });

  it('falls back to ar/en when restaurant settings API fails', () => {
    service.loadForRestaurant(RESTAURANT_ID);

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/locales`,
    );
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(service.enabledLocales().map((locale) => locale.code)).toEqual(['ar', 'en']);
  });

  it('selects content locale without changing admin UI locale', () => {
    const localeService = TestBed.inject(LocaleService);
    localeService.setLocale('ar');

    service.loadForRestaurant(RESTAURANT_ID);
    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/locales`,
    );
    req.flush({
      defaultLocale: 'ar',
      translationMode: 'ManualOnly',
      supportedLocales: [
        { code: 'ar', isEnabled: true, sortOrder: 1 },
        { code: 'fr', isEnabled: true, sortOrder: 2 },
      ],
      availableLocales: [
        { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
        { code: 'fr', displayName: 'French', nativeName: 'Français', direction: 'ltr' },
      ],
      canManageLocales: true,
    });

    service.selectContentLocale('fr');
    expect(service.activeContentLocale()).toBe('fr');
    expect(localeService.locale()).toBe('ar');
  });
});
