import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-config';
import { LocaleService } from '../../../core/localization/locale';
import { LanguageSwitcher } from './language-switcher';

const RESTAURANT_ID = 'aaaaaaaa-1111-1111-1111-111111111111';

const LOCALE_SETTINGS = {
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
};

function selectOption(select: HTMLSelectElement, code: string): void {
  const option = Array.from(select.options).find((entry) => entry.value === code);
  if (!option) {
    throw new Error(`Option not found: ${code}`);
  }

  select.value = code;
  select.selectedIndex = option.index;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('LanguageSwitcher', () => {
  let fixture: ComponentFixture<LanguageSwitcher>;
  let httpMock: HttpTestingController;
  let localeService: LocaleService;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigate = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [LanguageSwitcher],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: { navigate },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: () => 'ar' } },
          },
        },
      ],
    }).compileComponents();

    localeService = TestBed.inject(LocaleService);
    localeService.setLocale('en');
    localeService.selectContentLocale('ar', { persist: false });

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LanguageSwitcher);
    fixture.componentRef.setInput('restaurantId', RESTAURANT_ID);
    fixture.detectChanges();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/locales`,
    );
    req.flush(LOCALE_SETTINGS);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('binds select to contentLocale and shows selected language after choosing de', () => {
    const select = fixture.nativeElement.querySelector(
      '[data-testid="language-switcher-select"]',
    ) as HTMLSelectElement;

    selectOption(select, 'de');
    fixture.detectChanges();

    expect(localeService.contentLocale()).toBe('de');
    expect(select.value).toBe('de');
  });

  it('renders option labels with native name only (no RTL/LTR in option text)', () => {
    const select = fixture.nativeElement.querySelector(
      '[data-testid="language-switcher-select"]',
    ) as HTMLSelectElement;

    const deOption = Array.from(select.options).find((option) => option.value === 'de');
    expect(deOption?.textContent?.trim()).toBe('Deutsch');
    expect(deOption?.textContent).not.toContain('RTL');
    expect(deOption?.textContent).not.toContain('LTR');
    expect(deOption?.textContent).not.toContain('—');
  });

  it('shows direction badge outside the select for the active locale', () => {
    const select = fixture.nativeElement.querySelector(
      '[data-testid="language-switcher-select"]',
    ) as HTMLSelectElement;

    selectOption(select, 'de');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector(
      '[data-testid="language-switcher-direction-de"]',
    ) as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim()).toBe('LTR');
  });

  it('selecting de updates content locale without changing admin UI locale', () => {
    localeService.setLocale('en');

    const select = fixture.nativeElement.querySelector(
      '[data-testid="language-switcher-select"]',
    ) as HTMLSelectElement;
    selectOption(select, 'de');
    fixture.detectChanges();

    expect(localeService.contentLocale()).toBe('de');
    expect(localeService.locale()).toBe('en');
  });

  it('selecting ar updates both content locale and admin UI locale', () => {
    localeService.setLocale('en');

    const select = fixture.nativeElement.querySelector(
      '[data-testid="language-switcher-select"]',
    ) as HTMLSelectElement;
    selectOption(select, 'ar');
    fixture.detectChanges();

    expect(localeService.contentLocale()).toBe('ar');
    expect(localeService.locale()).toBe('ar');
  });

  it('updates query param when syncQueryParam is enabled', () => {
    fixture.componentRef.setInput('syncQueryParam', true);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector(
      '[data-testid="language-switcher-select"]',
    ) as HTMLSelectElement;
    selectOption(select, 'de');
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { lang: 'de' },
      queryParamsHandling: 'merge',
    });
  });

  it('falls back to ar/en when locale API fails', async () => {
    httpMock.verify();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [LanguageSwitcher],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    }).compileComponents();

    const failedHttp = TestBed.inject(HttpTestingController);
    const failedFixture = TestBed.createComponent(LanguageSwitcher);
    failedFixture.componentRef.setInput('restaurantId', RESTAURANT_ID);
    failedFixture.detectChanges();

    const req = failedHttp.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/locales`,
    );
    req.flush('Server error', { status: 500, statusText: 'Server Error' });
    failedFixture.detectChanges();

    const select = failedFixture.nativeElement.querySelector(
      '[data-testid="language-switcher-select"]',
    ) as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe('ar');
    expect(select.options[1].value).toBe('en');

    failedHttp.verify();
  });
});
