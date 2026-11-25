import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../config/api-config';
import { LocaleService } from './locale';
import { RestaurantLocaleOptionsService } from './restaurant-locale-options.service';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('LocaleService', () => {
  let service: LocaleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocaleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function loadLocalesWithGerman(): void {
    TestBed.inject(RestaurantLocaleOptionsService).loadForRestaurant(RESTAURANT_ID);
    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/locales`,
    );
    req.flush({
      defaultLocale: 'ar',
      translationMode: 'ManualOnly',
      supportedLocales: [
        { code: 'ar', isEnabled: true, sortOrder: 1 },
        { code: 'en', isEnabled: true, sortOrder: 2 },
        { code: 'de', isEnabled: true, sortOrder: 3 },
      ],
      availableLocales: [
        { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
        { code: 'en', displayName: 'English', nativeName: 'English', direction: 'ltr' },
        { code: 'de', displayName: 'German', nativeName: 'Deutsch', direction: 'ltr' },
      ],
      canManageLocales: true,
    });
  }

  it('defaults to Arabic locale', () => {
    service.setLocale('ar');
    expect(service.locale()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('setLocale("en") updates lang and dir to English LTR', () => {
    service.setLocale('en');
    expect(service.locale()).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('setLocale("ar") updates lang and dir to Arabic RTL', () => {
    service.setLocale('en');
    service.setLocale('ar');
    expect(service.locale()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('pickText returns Arabic text when locale is ar', () => {
    service.setLocale('ar');
    expect(service.pickText({ ar: 'مرحبا', en: 'Hello' })).toBe('مرحبا');
  });

  it('pickText returns English text when locale is en', () => {
    service.setLocale('en');
    expect(service.pickText({ ar: 'مرحبا', en: 'Hello' })).toBe('Hello');
  });

  it('falls back to the other locale when the primary translation is empty', () => {
    service.setLocale('en');
    expect(service.pickText({ ar: 'مرحبا', en: '' }, 'fallback')).toBe('مرحبا');

    service.setLocale('ar');
    expect(service.pickText({ ar: '', en: 'Hello' }, 'fallback')).toBe('Hello');
  });

  it('exposes reactive ui strings through the ui signal', () => {
    service.setLocale('ar');
    expect(service.ui().cart).toBe('السلة');

    service.setLocale('en');
    expect(service.ui().cart).toBe('Cart');
  });

  it('formats currency values', () => {
    service.setLocale('en');
    const formatted = service.formatCurrency(120, 'SAR', 'SA');
    expect(formatted).toContain('120');
  });

  it('selectLanguage updates content locale for dynamic locales', () => {
    loadLocalesWithGerman();
    service.setLocale('en');
    service.selectLanguage('de');
    expect(service.contentLocale()).toBe('de');
    expect(service.locale()).toBe('en');
  });

  it('selectLanguage syncs admin UI locale only for ar/en', () => {
    loadLocalesWithGerman();
    service.setLocale('en');
    service.selectLanguage('ar');
    expect(service.contentLocale()).toBe('ar');
    expect(service.locale()).toBe('ar');

    service.selectLanguage('de');
    expect(service.contentLocale()).toBe('de');
    expect(service.locale()).toBe('ar');
  });
});
