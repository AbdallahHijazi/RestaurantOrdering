import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { LocaleService } from '../../../../core/localization/locale';
import { PublicCartService } from '../../data-access/public-cart.service';
import { MOCK_PUBLIC_MENU } from '../../data-access/public-menu-mock.data';
import { MenuPage } from './menu-page';

const FLOATING_CART = '[data-testid="public-menu-floating-cart"]';

function expectMenuRequest(httpMock: HttpTestingController, slug: string, lang = 'ar') {
  return httpMock.expectOne(
    (req) =>
      req.url === `${API_BASE_URL}/api/v1/public/restaurants/${slug}/menu` &&
      req.method === 'GET' &&
      req.params.get('lang') === lang,
  );
}

function addFirstItem(fixture: ComponentFixture<MenuPage>): void {
  const button = (fixture.nativeElement as HTMLElement).querySelector(
    '[data-testid="public-menu-add-to-cart"]',
  ) as HTMLButtonElement;
  button.click();
  fixture.detectChanges();
}

function createActivatedRoute(slug: string | null, lang?: string): ActivatedRoute {
  const emptyQuery = convertToParamMap(lang ? { lang } : {});
  const childSnapshot = { paramMap: convertToParamMap({}), queryParamMap: emptyQuery };
  const parentSnapshot = {
    paramMap: convertToParamMap(slug ? { slug } : {}),
    queryParamMap: emptyQuery,
  };

  return {
    snapshot: childSnapshot,
    queryParamMap: of(emptyQuery),
    pathFromRoot: [
      { snapshot: { paramMap: convertToParamMap({}), queryParamMap: emptyQuery } },
      { snapshot: parentSnapshot },
      { snapshot: childSnapshot },
    ],
  } as ActivatedRoute;
}

describe('MenuPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock?.match(() => true).forEach((req) => {
      if (req.cancelled) {
        return;
      }

      if (req.request.url.includes('/locales')) {
        req.flush({
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
        });
        return;
      }

      req.flush({});
    });
    httpMock?.verify();
    TestBed.inject(LocaleService).setLocale('ar');
    sessionStorage.clear();
  });

  async function createPage(slug: string | null, lang?: string): Promise<ComponentFixture<MenuPage>> {
    await TestBed.configureTestingModule({
      imports: [MenuPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: createActivatedRoute(slug, lang) },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MenuPage);
    fixture.detectChanges();
    return fixture;
  }

  async function settle(fixture: ComponentFixture<MenuPage>): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it.each(['ar', 'en'] as const)('keeps each selected size synchronized with the cart in %s', async (lang) => {
    const fixture = await createPage('sized-cafe', lang);
    const request = expectMenuRequest(httpMock, 'sized-cafe', lang);
    request.flush({
      id: 'cafe', slug: 'sized-cafe', nameAr: 'مطعم', nameEn: 'Cafe', currencyCode: 'SAR',
      resolvedLocale: lang, direction: lang === 'en' ? 'ltr' : 'rtl',
      categories: [{
        id: 'category', nameAr: 'وجبات', nameEn: 'Meals', displayOrder: 1,
        items: [{
          id: 'sized-item', categoryId: 'category', nameAr: 'طبق', nameEn: 'Dish',
          price: 100, displayOrder: 1, usesSizes: true,
          sizes: [
            { id: 'sold-out', name: 'Small', price: 1, isAvailable: false, displayOrder: 1 },
            { id: 'regular', name: 'Regular', price: 10, isAvailable: true, displayOrder: 2 },
            { id: 'family', name: 'Family', price: 30, isAvailable: true, displayOrder: 3 },
          ],
        }],
      }],
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const displayedPrice = root.querySelector('.public-menu-card__price')!.textContent;
    const locale = TestBed.inject(LocaleService);
    expect(displayedPrice).toContain(locale.uiText('sizeFrom'));
    expect(displayedPrice).toContain(locale.formatCurrency(10, 'SAR', 'SA'));
    const card = root.querySelector<HTMLElement>('[data-testid="public-menu-item-card"]')!;
    expect(root.querySelector('[dir]')?.getAttribute('dir')).toBe(lang === 'en' ? 'ltr' : 'rtl');
    const options = card.querySelectorAll<HTMLInputElement>('input[type=radio]');
    const addButton = () => card.querySelector<HTMLButtonElement>('[data-testid="public-menu-add-to-cart"]');
    const displayedQuantity = () => card.querySelector('.public-menu-card__quantity > span')?.textContent?.trim();
    const adjust = (button: 'increase' | 'decrease') => {
      const selector = button === 'increase'
        ? '.public-menu-card__qty-btn--add'
        : '.public-menu-card__qty-btn:not(.public-menu-card__qty-btn--add)';
      card.querySelector<HTMLButtonElement>(selector)!.click();
      fixture.detectChanges();
    };
    const cart = TestBed.inject(PublicCartService);
    expect(options).toHaveLength(3);
    expect(options[0]?.disabled).toBe(true);
    expect(addButton()?.disabled).toBe(true);
    options[2]!.click();
    fixture.detectChanges();
    expect(cart.cartItems()).toHaveLength(0);
    expect(card.querySelector('.public-menu-card__price')?.textContent).toContain(locale.formatCurrency(30));
    addButton()!.click();
    fixture.detectChanges();
    expect(addButton()).toBeNull();
    expect(displayedQuantity()).toBe('1');
    adjust('increase');
    expect(displayedQuantity()).toBe('2');

    options[1]!.click();
    fixture.detectChanges();
    expect(displayedQuantity()).toBeUndefined();
    addButton()!.click();
    fixture.detectChanges();
    expect(displayedQuantity()).toBe('1');
    expect(cart.cartItems()).toMatchObject([
      { menuItemId: 'sized-item', menuItemSizeId: 'family', quantity: 2, price: 30 },
      { menuItemId: 'sized-item', menuItemSizeId: 'regular', quantity: 1, price: 10 },
    ]);
    options[2]!.click();
    fixture.detectChanges();
    expect(displayedQuantity()).toBe('2');
    adjust('decrease');
    expect(displayedQuantity()).toBe('1');
    expect(cart.quantityFor('sized-item', 'regular')).toBe(1);

    const family = cart.cartItems().find((line) => line.menuItemSizeId === 'family')!;
    cart.setStoredLineQuantity(family, 3);
    fixture.detectChanges();
    expect(displayedQuantity()).toBe('3');

    adjust('decrease');
    adjust('decrease');
    adjust('decrease');
    expect(addButton()?.disabled).toBe(false);
    expect(cart.cartItems().map((line) => line.menuItemSizeId)).toEqual(['regular']);
    expect(document.body.querySelector('[data-testid="public-size-dialog"]')).toBeNull();
  }, 15_000);

  it('shows staff login link to /login', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="public-staff-login"]',
    ) as HTMLAnchorElement | null;

    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toContain('/login');
  });

  it('renders mock menu for demo slug without HTTP or not-found state', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    httpMock.expectNone(`${API_BASE_URL}/api/v1/public/restaurants/demo/menu`);
    expect(root.textContent).toContain(MOCK_PUBLIC_MENU.restaurant.nameAr);
    expect(root.textContent).not.toContain('المطعم غير موجود');
  });

  it('shows not-found when slug param is missing from the route tree', async () => {
    const fixture = await createPage(null);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    httpMock.expectNone(`${API_BASE_URL}/api/v1/public/restaurants/demo/menu`);
    expect(root.textContent).toContain('تعذر العثور على المطعم أو القائمة غير متاحة');
  });

  it('requests API for a real slug and renders the response', async () => {
    const fixture = await createPage('the-botanist');

    const req = expectMenuRequest(httpMock, 'the-botanist');
    req.flush({
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'the-botanist',
      nameAr: 'مطعم حقيقي',
      phoneNumber: '+966500000000',
      currencyCode: 'SAR',
      taxRate: 15,
      deliveryFee: 10,
      minimumOrderAmount: 0,
      isDeliveryEnabled: true,
      isPickupEnabled: true,
      categories: [],
    });

    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('مطعم حقيقي');
  });

  it('shows restaurant not found for a real slug that returns 404', async () => {
    const fixture = await createPage('missing-restaurant');

    const req = expectMenuRequest(httpMock, 'missing-restaurant');
    req.flush('Not found', { status: 404, statusText: 'Not Found' });

    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'تعذر العثور على المطعم أو القائمة غير متاحة',
    );
  });

  it('shows empty state for a real slug with no menu items', async () => {
    const fixture = await createPage('empty-menu');

    const req = expectMenuRequest(httpMock, 'empty-menu');
    req.flush({
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'empty-menu',
      nameAr: 'مطعم فارغ',
      phoneNumber: '+966500000000',
      categories: [],
    });

    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[data-testid="public-menu-empty"]')).toBeTruthy();
  });

  it('shows error state with retry for a real slug network failure', async () => {
    const fixture = await createPage('the-botanist');

    const req = expectMenuRequest(httpMock, 'the-botanist');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('تعذر تحميل القائمة حاليًا');
    expect(root.querySelector('.error-state__retry')).toBeTruthy();
  });

  it('switches visible menu content by clicking the language switcher (DOM)', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);

    const root = fixture.nativeElement as HTMLElement;
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('ar');
    fixture.detectChanges();

    expect(root.textContent).toContain(MOCK_PUBLIC_MENU.restaurant.nameAr);
    expect(root.textContent).toContain('المقبلات');
    expect(root.textContent).toContain('سلطة الأعشاب الموسمية');
    expect(document.documentElement.dir).toBe('rtl');

    const select = root.querySelector(
      '[data-testid="language-switcher-select"]',
    ) as HTMLSelectElement | null;
    expect(select).toBeTruthy();

    select!.value = 'en';
    select!.selectedIndex = Array.from(select!.options).findIndex((option) => option.value === 'en');
    select!.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect((root.querySelector('.menu-page__brand h1') as HTMLElement).textContent).toContain(
      'The Botanist',
    );
    expect(root.textContent).toContain('Starters');
    expect(root.textContent).toContain('Seasonal Herb Salad');

    select!.value = 'ar';
    select!.selectedIndex = Array.from(select!.options).findIndex((option) => option.value === 'ar');
    select!.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);

    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect((root.querySelector('.menu-page__brand h1') as HTMLElement).textContent).toContain(
      'عالم النبات',
    );
    expect(root.textContent).toContain('المقبلات');
  });

  it('keeps the existing top bar structure unchanged', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.menu-page__header')).toBeTruthy();
    expect(root.querySelector('.menu-page__brand h1')).toBeTruthy();
    expect(root.querySelector('app-language-switcher')).toBeTruthy();
    expect(root.querySelector('[data-testid="public-menu-cart-button"]')).toBeTruthy();
    expect(root.querySelector('.topbar')).toBeFalsy();
  });

  it('shows all categories filter and search on demo menu', async () => {
    const fixture = await createPage('demo');
    TestBed.inject(LocaleService).setLocale('ar');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="public-menu-filter-all"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="public-menu-search"]')).toBeTruthy();
    expect(root.textContent).toContain('كل الأصناف');
  });

  it('filters items locally by search without extra HTTP calls', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const search = root.querySelector('[data-testid="public-menu-search"]') as HTMLInputElement;

    search.value = 'Seasonal Herb Salad';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(root.querySelector('[data-testid="public-menu-filtered-empty"]')).toBeFalsy();
    expect(root.textContent).toContain('Seasonal Herb Salad');

    search.value = 'zzzz-no-match';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(root.querySelector('[data-testid="public-menu-filtered-empty"]')).toBeTruthy();
    httpMock.expectNone(`${API_BASE_URL}/api/v1/public/restaurants/demo/menu`);
  });

  it('shows floating cart after adding an item', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    addFirstItem(fixture);

    expect(root.querySelector(FLOATING_CART)).toBeTruthy();
    expect(root.querySelector('[data-testid="public-menu-toast"]')?.classList.contains('public-menu-toast--show')).toBe(true);
  });

  it('renders the hero fade and keeps the sticky filter bar intact', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.public-menu-hero')).toBeTruthy();
    expect(root.querySelector('.public-menu-hero__content')).toBeTruthy();
    expect(root.querySelector('[data-testid="public-menu-filter-bar"]')).toBeTruthy();
    expect(root.querySelector('.menu-page__header')).toBeTruthy();
  });

  it('does not show the floating cart automatically when cart is restored from storage', async () => {
    sessionStorage.setItem(
      'restaurant-ordering.cart.demo',
      JSON.stringify({
        items: [{ menuItemId: 'restored', nameAr: 'وجبة', price: 5, quantity: 2, notes: null }],
      }),
    );

    const fixture = await createPage('demo');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    expect(TestBed.inject(PublicCartService).itemCount()).toBe(2);
    expect(root.querySelector(FLOATING_CART)).toBeFalsy();
    expect(root.querySelector('.menu-page__cart-count')?.textContent).toContain('2');
  });

  it('auto-hides the floating cart after 3000ms', async () => {
    vi.useFakeTimers();
    try {
      const fixture = await createPage('demo');
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;

      addFirstItem(fixture);
      expect(root.querySelector(FLOATING_CART)).toBeTruthy();

      vi.advanceTimersByTime(3000);
      fixture.detectChanges();
      expect(root.querySelector(FLOATING_CART)).toBeFalsy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('restarts the auto-hide timer when another item is added', async () => {
    vi.useFakeTimers();
    try {
      const fixture = await createPage('demo');
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;

      addFirstItem(fixture);
      vi.advanceTimersByTime(2000);
      addFirstItem(fixture);
      vi.advanceTimersByTime(2000);
      fixture.detectChanges();
      expect(root.querySelector(FLOATING_CART)).toBeTruthy();

      vi.advanceTimersByTime(1000);
      fixture.detectChanges();
      expect(root.querySelector(FLOATING_CART)).toBeFalsy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides the floating cart immediately when the cart drawer opens', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    addFirstItem(fixture);
    expect(root.querySelector(FLOATING_CART)).toBeTruthy();

    (fixture.componentInstance as unknown as { openCart(): void }).openCart();
    fixture.detectChanges();

    expect(root.querySelector(FLOATING_CART)).toBeFalsy();
    expect(root.querySelector('[data-testid="public-cart-drawer"]')).toBeTruthy();
  });

  it('hides the floating cart when the cart is cleared', async () => {
    const fixture = await createPage('demo');
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    addFirstItem(fixture);
    expect(root.querySelector(FLOATING_CART)).toBeTruthy();

    TestBed.inject(PublicCartService).clearCart();
    fixture.detectChanges();

    expect(root.querySelector(FLOATING_CART)).toBeFalsy();
    expect(root.querySelector('.menu-page__cart-count')).toBeFalsy();
  });

  it('clears the auto-hide timer on destroy', async () => {
    vi.useFakeTimers();
    try {
      const fixture = await createPage('demo');
      fixture.detectChanges();

      addFirstItem(fixture);
      const instance = fixture.componentInstance as unknown as {
        floatingCartTimer: ReturnType<typeof setTimeout> | null;
      };
      expect(instance.floatingCartTimer).not.toBeNull();

      fixture.destroy();
      expect(instance.floatingCartTimer).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
