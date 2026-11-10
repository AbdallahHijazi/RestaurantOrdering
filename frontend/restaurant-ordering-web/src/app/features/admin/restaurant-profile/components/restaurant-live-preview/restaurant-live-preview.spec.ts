import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { API_BASE_URL } from '../../../../../core/config/api-config';
import { AuthService } from '../../../../../core/auth/auth.service';
import { LocaleService } from '../../../../../core/localization/locale';
import { MOCK_PUBLIC_MENU } from '../../../../public-menu/data-access/public-menu-mock.data';
import { RestaurantLivePreview } from './restaurant-live-preview';
import type { RestaurantProfilePreviewData } from '../../models/restaurant-profile.models';

const RESTAURANT_ID = 'aaaaaaaa-1111-1111-1111-111111111111';

const PREVIEW_LOCALE_SETTINGS = {
  defaultLocale: 'ar',
  translationMode: 'ManualOnly',
  supportedLocales: [
    { code: 'ar', isEnabled: true, sortOrder: 1 },
    { code: 'en', isEnabled: true, sortOrder: 2 },
  ],
  availableLocales: [
    { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
    { code: 'en', displayName: 'English', nativeName: 'English', direction: 'ltr' },
  ],
  canManageLocales: true,
};

const LOCALE_SETTINGS_RESPONSE = {
  defaultLocale: 'ar',
  translationMode: 'ManualOnly',
  supportedLocales: [
    { code: 'ar', isEnabled: true, sortOrder: 1 },
    { code: 'en', isEnabled: true, sortOrder: 2 },
    { code: 'fr', isEnabled: true, sortOrder: 3 },
    { code: 'de', isEnabled: true, sortOrder: 4 },
  ],
  availableLocales: [
    { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
    { code: 'en', displayName: 'English', nativeName: 'English', direction: 'ltr' },
    { code: 'fr', displayName: 'French', nativeName: 'Français', direction: 'ltr' },
    { code: 'de', displayName: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  ],
  canManageLocales: true,
};

const PREVIEW: RestaurantProfilePreviewData = {
  slug: 'restaurant-a',
  primaryLocale: 'ar',
  primaryName: 'مطعم المعاينة',
  primaryDescription: 'وصف',
  primaryAddress: 'الرياض',
  nameAr: 'مطعم المعاينة',
  nameEn: 'Preview Restaurant',
  descriptionAr: 'وصف',
  descriptionEn: 'Description',
  logoUrl: null,
  coverImageUrl: null,
  primaryAccentColor: '#c6a15b',
  countryCode: 'SA',
  currencyCode: 'SAR',
  timeZone: 'Asia/Riyadh',
  phoneNumber: '+966501234567',
  whatsAppNumber: '+966501234567',
  addressAr: 'الرياض',
  addressEn: 'Riyadh',
};

const REAL_CATEGORIES = [
  { id: 'cat-real', nameAr: 'تصنيف فعلي', nameEn: 'Real Category', displayOrder: 0, isActive: true },
];

const REAL_ITEMS = [
  {
    id: 'item-real',
    categoryId: 'cat-real',
    nameAr: 'وجبة فعلية',
    nameEn: 'Real Dish',
    price: 25,
    isAvailable: true,
  },
];

type PreviewHarness = RestaurantLivePreview & {
  openFullPreview: () => void;
  closeFullPreview: () => void;
  selectCategory: (categoryId: string) => void;
  activeCategoryId: () => string;
  filteredPreviewItems: () => Array<{ id: string; nameEn?: string | null }>;
  contentLocale: () => string;
  previewDirection: () => 'rtl' | 'ltr';
};

function selectLanguage(root: ParentNode, code: string): void {
  const select = root.querySelector('[data-testid="language-switcher-select"]') as HTMLSelectElement;
  const option = Array.from(select.options).find((entry) => entry.value === code);
  if (!option) {
    throw new Error(`Language option not found: ${code}`);
  }

  select.value = code;
  select.selectedIndex = option.index;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function getPreviewModal(fixture: ComponentFixture<RestaurantLivePreview>): HTMLElement | null {
  return (
    document.body.querySelector('[data-testid="live-preview-modal"]') ??
    fixture.nativeElement.querySelector('[data-testid="live-preview-modal"]')
  );
}

function getModalCards(modal: HTMLElement): HTMLElement[] {
  return Array.from(modal.querySelectorAll('app-menu-item-card'));
}

function cardTexts(cards: HTMLElement[]): string {
  return cards.map((card) => card.textContent ?? '').join(' ');
}

function clickCategory(modal: HTMLElement, label: string): void {
  const button = Array.from(modal.querySelectorAll('.public-menu-filter__pill')).find((element) =>
    element.textContent?.includes(label),
  ) as HTMLButtonElement | undefined;

  if (!button) {
    throw new Error(`Category button not found: ${label}`);
  }

  button.click();
}

describe('RestaurantLivePreview', () => {
  let fixture: ComponentFixture<RestaurantLivePreview>;
  let component: PreviewHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantLivePreview],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { restaurantId: () => RESTAURANT_ID },
        },
      ],
    }).compileComponents();

    TestBed.inject(LocaleService).setLocale('ar');

    fixture = TestBed.createComponent(RestaurantLivePreview);
    component = fixture.componentInstance as PreviewHarness;
    fixture.componentRef.setInput('preview', PREVIEW);
    fixture.componentRef.setInput('menuState', 'loaded');
    fixture.componentRef.setInput('categories', REAL_CATEGORIES);
    fixture.componentRef.setInput('items', REAL_ITEMS);
    fixture.detectChanges();

    const httpMock = TestBed.inject(HttpTestingController);
    for (const req of httpMock.match(() => true)) {
      if (!req.cancelled && req.request.url.includes('/locales')) {
        req.flush(PREVIEW_LOCALE_SETTINGS);
      }
    }
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelector('[data-testid="live-preview-overlay-host"]')?.remove();
    TestBed.inject(LocaleService).setLocale('ar');
  });

  it('renders enabled preview languages from locale settings API', () => {
    const switcher = fixture.nativeElement.querySelector(
      '[data-testid="live-preview-lang-switcher"]',
    ) as HTMLElement;

    expect(switcher).toBeTruthy();

    const select = switcher.querySelector('[data-testid="language-switcher-select"]') as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].textContent).toContain('العربية');
    expect(select.options[1].textContent).toContain('English');
  });

  it('shows real catalog items instead of mock hummus', () => {
    expect(fixture.nativeElement.textContent).toContain('وجبة فعلية');
    expect(fixture.nativeElement.textContent).not.toContain('حمص بالكمأ');
  });

  it('filters full preview items by selected category', () => {
    component.openFullPreview();
    fixture.detectChanges();

    const modal = getPreviewModal(fixture) as HTMLElement;
    expect(modal).toBeTruthy();
    expect(getModalCards(modal).length).toBe(1);
    expect(cardTexts(getModalCards(modal))).toContain('وجبة فعلية');
  });

  it('shows empty state when menuState is empty', () => {
    fixture.componentRef.setInput('menuState', 'empty');
    fixture.componentRef.setInput('categories', []);
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-menu-empty"]')).toBeTruthy();
  });

  it('shows error state with retry and no mock dishes', () => {
    fixture.componentRef.setInput('menuState', 'error');
    fixture.componentRef.setInput('categories', []);
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-menu-error"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('حمص بالكمأ');
  });

  it('shows demo mode label when menuState is demo', () => {
    fixture.componentRef.setInput('menuState', 'demo');
    fixture.componentRef.setInput('categories', MOCK_PUBLIC_MENU.categories);
    fixture.componentRef.setInput('items', MOCK_PUBLIC_MENU.items);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-demo-mode"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('حمص بالكمأ');
  });

  it('keeps category filtering after switching preview language', () => {
    const locale = TestBed.inject(LocaleService);

    component.openFullPreview();
    fixture.detectChanges();

    const modal = getPreviewModal(fixture) as HTMLElement;
    clickCategory(modal, 'تصنيف فعلي');
    fixture.detectChanges();

    selectLanguage(fixture.nativeElement, 'en');
    fixture.detectChanges();

    expect(locale.contentLocale()).toBe('en');
    expect(cardTexts(getModalCards(modal))).toContain('Real Dish');
  });

  it('uses the same filtered items source for embedded and full preview', () => {
    const embeddedCards = fixture.nativeElement.querySelectorAll(
      '.live-preview__frame app-menu-item-card',
    );
    expect(embeddedCards.length).toBe(1);

    component.openFullPreview();
    fixture.detectChanges();

    const modal = getPreviewModal(fixture) as HTMLElement;
    expect(getModalCards(modal).length).toBe(embeddedCards.length);
  });

  it('keeps the close button in the modal shell outside the scrollable body', () => {
    component.openFullPreview();
    fixture.detectChanges();

    const modal = getPreviewModal(fixture) as HTMLElement;
    const closeButton = modal.querySelector('[data-testid="live-preview-close"]') as HTMLButtonElement;
    const scrollBody = modal.querySelector('.live-preview__modal-body') as HTMLElement;

    expect(closeButton.classList.contains('modal-close-button')).toBe(true);
    expect(closeButton.closest('.live-preview__modal-header')).toBeTruthy();
    expect(scrollBody.contains(closeButton)).toBe(false);
  });

  it('closes the preview on Escape', () => {
    component.openFullPreview();
    fixture.detectChanges();
    expect(getPreviewModal(fixture)).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(getPreviewModal(fixture)).toBeNull();
  });

  it('portals preview overlay host to document.body with scroll lock', () => {
    component.openFullPreview();
    fixture.detectChanges();

    const host = document.body.querySelector('[data-testid="live-preview-overlay-host"]');
    expect(host?.parentElement).toBe(document.body);
    expect(document.body.classList.contains('order-modal-scroll-lock')).toBe(true);

    const scrollBody = host?.querySelector('.live-preview__modal-body') as HTMLElement | null;
    expect(scrollBody).toBeTruthy();
    expect(getComputedStyle(scrollBody!).overflowX).toBe('hidden');
  });

  it('emits refreshPreview when error state retry is clicked', () => {
    const refresh = vi.fn();
    fixture.componentInstance.refreshPreview.subscribe(refresh);

    fixture.componentRef.setInput('menuState', 'error');
    fixture.componentRef.setInput('categories', []);
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('.error-state__retry') as HTMLButtonElement
    ).click();

    expect(refresh).toHaveBeenCalled();
  });

  it('does not render refresh preview button in studio variant', () => {
    fixture.componentRef.setInput('variant', 'studio');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-refresh"]')).toBeNull();
  });

  it('orders studio toolbar with device modes and full preview at start', () => {
    fixture.componentRef.setInput('variant', 'studio');
    fixture.detectChanges();

    const toolbar = fixture.nativeElement.querySelector('.live-preview__studio-toolbar') as HTMLElement;
    const start = toolbar.querySelector('.live-preview__toolbar-start') as HTMLElement;
    const end = toolbar.querySelector('.live-preview__toolbar-end') as HTMLElement;

    expect(start.querySelector('[data-testid="live-preview-device-desktop"]')).toBeTruthy();
    expect(start.querySelector('[data-testid="live-preview-full"]')).toBeTruthy();
    expect(end.querySelector('[data-testid="live-preview-lang-switcher"]')).toBeTruthy();
    expect(end.querySelector('[data-testid="live-preview-sync-status"]')).toBeTruthy();
  });

  it('exposes scrollable preview viewport with hidden horizontal overflow', () => {
    fixture.componentRef.setInput('variant', 'studio');
    fixture.detectChanges();

    const frameWrapper = fixture.nativeElement.querySelector('.live-preview__frame-wrapper') as HTMLElement;
    const viewport = fixture.nativeElement.querySelector('[data-testid="live-preview-viewport"]') as HTMLElement;

    expect(frameWrapper).toBeTruthy();
    expect(viewport).toBeTruthy();
    expect(getComputedStyle(frameWrapper).minHeight).toMatch(/^0(px)?$/);
    expect(getComputedStyle(viewport).overflowY).toBe('auto');
    expect(getComputedStyle(viewport).overflowX).toBe('hidden');
  });

  it('shows studio sync status in studio variant', () => {
    TestBed.inject(LocaleService).setLocale('en');
    fixture.componentRef.setInput('variant', 'studio');
    fixture.componentRef.setInput('previewSyncStatus', 'synced');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Live sync');
    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-sync-status"]')).toBeTruthy();
  });

  it('applies tablet and mobile viewport frame classes', () => {
    const frame = fixture.nativeElement.querySelector('.live-preview__frame') as HTMLElement;
    const viewportButtons = fixture.nativeElement.querySelectorAll(
      '.live-preview__controls button',
    ) as NodeListOf<HTMLButtonElement>;

    viewportButtons[1].click();
    fixture.detectChanges();
    expect(frame.classList.contains('live-preview__frame--tablet')).toBe(true);

    viewportButtons[2].click();
    fixture.detectChanges();
    expect(frame.classList.contains('live-preview__frame--mobile')).toBe(true);
  });

  it('syncs admin UI locale when ar/en preview language is selected', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    fixture.componentRef.setInput('variant', 'studio');
    fixture.detectChanges();

    selectLanguage(fixture.nativeElement, 'en');
    fixture.detectChanges();
    expect(locale.contentLocale()).toBe('en');
    expect(locale.locale()).toBe('en');

    selectLanguage(fixture.nativeElement, 'ar');
    fixture.detectChanges();
    expect(locale.contentLocale()).toBe('ar');
    expect(locale.locale()).toBe('ar');
  });

  it('applies studio device frame classes from toolbar buttons', () => {
    fixture.componentRef.setInput('variant', 'studio');
    fixture.detectChanges();

    const frame = fixture.nativeElement.querySelector('.live-preview__frame') as HTMLElement;
    (
      fixture.nativeElement.querySelector('[data-testid="live-preview-device-tablet"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(frame.classList.contains('live-preview__frame--tablet')).toBe(true);
  });

  it('applies preview locale direction to full preview modal body', () => {
    const locale = TestBed.inject(LocaleService);

    locale.selectContentLocale('en');
    component.openFullPreview();
    fixture.detectChanges();

    const modalBody = (getPreviewModal(fixture) as HTMLElement).querySelector(
      '.live-preview__modal-body',
    ) as HTMLElement;
    expect(modalBody.getAttribute('dir')).toBe('ltr');

    component.closeFullPreview();
    locale.selectContentLocale('ar');
    component.openFullPreview();
    fixture.detectChanges();

    const rtlModalBody = (getPreviewModal(fixture) as HTMLElement).querySelector(
      '.live-preview__modal-body',
    ) as HTMLElement;
    expect(rtlModalBody.getAttribute('dir')).toBe('rtl');
  });
});

describe('RestaurantLivePreview dynamic locales', () => {
  let fixture: ComponentFixture<RestaurantLivePreview>;
  let component: PreviewHarness;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantLivePreview],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { restaurantId: () => RESTAURANT_ID },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(LocaleService).setLocale('en');

    fixture = TestBed.createComponent(RestaurantLivePreview);
    component = fixture.componentInstance as PreviewHarness;
    fixture.componentRef.setInput('preview', PREVIEW);
    fixture.componentRef.setInput('menuState', 'loaded');
    fixture.componentRef.setInput('categories', REAL_CATEGORIES);
    fixture.componentRef.setInput('items', REAL_ITEMS);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelector('[data-testid="live-preview-overlay-host"]')?.remove();
    TestBed.inject(LocaleService).setLocale('ar');
  });

  function flushLocales(response = LOCALE_SETTINGS_RESPONSE): void {
    for (const req of httpMock.match(() => true)) {
      if (req.cancelled || !req.request.url.includes('/locales')) {
        continue;
      }

      req.flush(response);
    }
    fixture.detectChanges();
  }

  it('renders enabled preview locales from locale settings API', () => {
    flushLocales();
    const locale = TestBed.inject(LocaleService);

    expect(locale.enabledContentLocales().map((entry) => entry.code)).toEqual([
      'ar',
      'en',
      'fr',
      'de',
    ]);

    const switcher = fixture.nativeElement.querySelector(
      '[data-testid="live-preview-lang-switcher"]',
    ) as HTMLElement;
    const select = switcher.querySelector('[data-testid="language-switcher-select"]') as HTMLSelectElement;
    expect(select.options.length).toBe(4);
    expect(select.options[2].textContent).toContain('Français');
    expect(select.options[3].textContent).toContain('Deutsch');
  });

  it('selecting fr updates content locale without changing admin interface locale', () => {
    flushLocales();
    fixture.componentRef.setInput('variant', 'studio');
    fixture.detectChanges();

    const locale = TestBed.inject(LocaleService);
    selectLanguage(fixture.nativeElement, 'fr');
    fixture.detectChanges();

    expect(locale.contentLocale()).toBe('fr');
    expect(locale.locale()).toBe('en');
  });

  it('falls back to ar/en when locale settings request fails', () => {
    for (const req of httpMock.match(() => true)) {
      if (req.cancelled || !req.request.url.includes('/locales')) {
        continue;
      }

      req.flush('Server error', { status: 500, statusText: 'Server Error' });
    }
    fixture.detectChanges();

    expect(
      TestBed.inject(LocaleService).enabledContentLocales().map((locale) => locale.code),
    ).toEqual(['ar', 'en']);
  });
});
