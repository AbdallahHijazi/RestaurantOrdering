import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApplicationRoles } from '../../../../core/auth/application-roles';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { createTestSession } from '../../../../core/auth/test-jwt.util';
import { LocaleService } from '../../../../core/localization/locale';
import { resolveApiAssetUrl } from '../../../../core/config/resolve-api-asset-url';
import type { AdminCategory, AdminMenuItem } from '../../data-access/admin-menu.models';
import { MenuManagementPage } from './menu-management-page';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CATEGORY_ID = 'aaaaaaaa-6666-6666-6666-666666666666';
const ITEM_ID = 'aaaaaaaa-7777-7777-7777-777777777777';

describe('MenuManagementPage', () => {
  let fixture: ComponentFixture<MenuManagementPage>;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuManagementPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner, RESTAURANT_ID));
    TestBed.inject(AuthService).restoreSessionFromStorage();

    fixture = TestBed.createComponent(MenuManagementPage);
    fixture.detectChanges();
    flushInitialRequests();
  });

  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
    httpMock.match(() => true).forEach((req) => req.flush([]));
    httpMock.verify();
    session.clearSession();
  });

  it('renders internal page header without top bar selectors', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="menu-management-page"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-header"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-sidebar"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      TestBed.inject(LocaleService).uiText('adminMenuPageTitle'),
    );
  });

  it('shows search input and add meal button', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="menu-search-input"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="menu-add-item-button"]')).toBeTruthy();
  });

  it('uses terracotta toolbar add button with existing create flow', () => {
    const addButton = fixture.nativeElement.querySelector(
      '[data-testid="menu-add-item-button"]',
    ) as HTMLButtonElement;
    expect(addButton.closest('.menu-management-toolbar')).toBeTruthy();
    expect(getComputedStyle(addButton).color).toBe('var(--restaurant-primary-button-text)');
    addButton.click();
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeTruthy();
  });

  it('centers plus icon inside add meal placeholder circle', () => {
    const icon = fixture.nativeElement.querySelector(
      '.menu-management-add-card__icon',
    ) as HTMLElement;
    expect(icon).toBeTruthy();
    expect(getComputedStyle(icon).display).toBe('inline-flex');
    expect(getComputedStyle(icon).alignItems).toBe('center');
    expect(getComputedStyle(icon).justifyContent).toBe('center');
    expect(getComputedStyle(icon).borderRadius).toBe('50%');
  });

  it('shows category item counts in category strip', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="menu-category-count"]')?.textContent,
    ).toContain('1');
    expect(fixture.nativeElement.querySelector('[data-testid="menu-category-strip"]')).toBeTruthy();
  });

  it('filters meals locally when searching', () => {
    const searchInput = fixture.nativeElement.querySelector(
      '[data-testid="menu-search-input"]',
    ) as HTMLInputElement;
    searchInput.value = 'nomatch';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="menu-items-filtered-empty"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector(`[data-testid="menu-item-${ITEM_ID}"]`)).toBeNull();
  });

  it('filters meals locally by availability', () => {
    const filter = fixture.nativeElement.querySelector(
      '[data-testid="menu-availability-filter"]',
    ) as HTMLSelectElement;
    filter.value = 'unavailable';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="menu-items-filtered-empty"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector(`[data-testid="menu-item-${ITEM_ID}"]`)).toBeNull();
  });

  it('shows meals count label based on filtered results', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="menu-meals-count"]')?.textContent).toContain('1');
  });

  it('opens add category modal with dynamic name field and primary language notice', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-category-button"]').click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeTruthy();
    expect(document.body.querySelector('input[formcontrolname="nameAr"]')).toBeNull();
    expect(document.body.querySelector('input[formcontrolname="name"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="menu-catalog-primary-notice"]')).toBeTruthy();
    expect(document.body.textContent).toContain('العربية');
  });

  it('opens add category modal and creates a category via catalog API', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-category-button"]').click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeTruthy();
    expect(
      document.body.querySelector('[data-testid="order-modal-close"]')?.classList.contains('modal-close-button'),
    ).toBe(true);

    setInputValue('input[formcontrolname="name"]', 'فئة جديدة');
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/catalog/categories`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(
      expect.objectContaining({ name: 'فئة جديدة', description: null }),
    );
    req.flush({
      ...sampleCategory(),
      id: 'new-category',
      nameAr: 'فئة جديدة',
      itemCount: 0,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="menu-success-message"]')).toBeTruthy();
  });

  it('shows delete category warning when item count is greater than zero', () => {
    fixture.nativeElement
      .querySelector(`[data-testid="menu-delete-category-${CATEGORY_ID}"]`)
      .click();
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="menu-delete-category-warning"]')).toBeTruthy();
  });

  it('closes delete category modal on dismiss without request', () => {
    fixture.nativeElement
      .querySelector(`[data-testid="menu-delete-category-${CATEGORY_ID}"]`)
      .click();
    fixture.detectChanges();

    const page = fixture.componentInstance as unknown as { dismissModal(): void };
    page.dismissModal();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeNull();
    httpMock.expectNone(
      (request) =>
        request.method === 'DELETE' &&
        request.url ===
          `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories/${CATEGORY_ID}`,
    );
  });

  it('closes delete category modal when close button is clicked', () => {
    fixture.nativeElement
      .querySelector(`[data-testid="menu-delete-category-${CATEGORY_ID}"]`)
      .click();
    fixture.detectChanges();

    const page = fixture.componentInstance as unknown as { dismissModal(): void };
    page.dismissModal();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeNull();
  });

  it('deletes category and closes modal on confirm', () => {
    fixture.nativeElement
      .querySelector(`[data-testid="menu-delete-category-${CATEGORY_ID}"]`)
      .click();
    fixture.detectChanges();

    (document.body.querySelector('[data-testid="menu-confirm-delete-category"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories/${CATEGORY_ID}`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    fixture.detectChanges();

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items`)
      .flush([]);
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="menu-success-message"]')).toBeTruthy();
  });

  it('resets category save loading state after successful update', () => {
    fixture.nativeElement.querySelector(`[data-testid="menu-edit-category-${CATEGORY_ID}"]`).click();
    fixture.detectChanges();

    setInputValue('input[formcontrolname="name"]', 'فئة محدثة');
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/catalog/categories/${CATEGORY_ID}`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.name).toBe('فئة محدثة');
    req.flush({ ...sampleCategory(), nameAr: 'فئة محدثة' });
    fixture.detectChanges();

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items`)
      .flush([sampleItem()]);
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeNull();
  });

  it('resets category save loading state after update error', () => {
    fixture.nativeElement.querySelector(`[data-testid="menu-edit-category-${CATEGORY_ID}"]`).click();
    fixture.detectChanges();

    setInputValue('input[formcontrolname="name"]', 'فئة محدثة');
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/catalog/categories/${CATEGORY_ID}`)
      .flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    const saveButton = document.body.querySelector('.button-primary') as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.textContent).toContain(
      TestBed.inject(LocaleService).uiText('adminMenuSave'),
    );
  });

  it('keeps the add action in the page toolbar and search in the filters toolbar', () => {
    const toolbar = fixture.nativeElement.querySelector('.menu-management-toolbar') as HTMLElement;
    expect(getComputedStyle(toolbar).flexWrap).toBe('nowrap');
    expect(toolbar.querySelector('[data-testid="menu-add-item-button"]')).toBeTruthy();
    expect(
      fixture.nativeElement
        .querySelector('[data-testid="menu-search-input"]')
        .closest('.menu-management-controls'),
    ).toBeTruthy();
  });

  it('renders the real item description in the redesigned card', () => {
    reloadItems([{ ...sampleItem(), descriptionAr: 'وصف الطبق', primaryDescription: 'وصف الطبق' }]);
    expect(
      fixture.nativeElement.querySelector(`[data-testid="menu-item-${ITEM_ID}"] .meal-card__description`)
        ?.textContent,
    ).toContain('وصف الطبق');
  });

  it('shows discounted price prominently with original price struck through', () => {
    reloadItems([{ ...sampleItem(), price: 10.3, discountPrice: 0.1 }]);
    const priceBlock = fixture.nativeElement.querySelector(
      `[data-testid="menu-item-${ITEM_ID}"] .meal-card__price`,
    );
    expect(priceBlock.querySelector('strong')?.textContent?.trim()).toContain('0.10');
    expect(priceBlock.querySelector('.meal-card__price-original')?.textContent?.trim()).toContain('10.30');
    expect(fixture.nativeElement.textContent).not.toContain(
      `${TestBed.inject(LocaleService).uiText('adminMenuDiscountLabel')} 0.10`,
    );
  });

  it('renders menu item image from resolved ImageUrl', () => {
    const img: HTMLImageElement | null = fixture.nativeElement.querySelector(
      `[data-testid="menu-item-${ITEM_ID}"] img`,
    );
    expect(img?.getAttribute('src')).toBe(resolveApiAssetUrl('/uploads/test/item.png'));
  });

  it('shows fallback when item has no image', () => {
    reloadItems([{ ...sampleItem(), imageUrl: null, imageFileId: null }]);
    expect(
      fixture.nativeElement.querySelector(
        `[data-testid="menu-item-${ITEM_ID}"] .meal-card__fallback`,
      ),
    ).toBeTruthy();
  });

  it('uses full PUT payload when toggling availability', () => {
    fixture.nativeElement.querySelector(`[data-testid="menu-toggle-availability-${ITEM_ID}"]`).click();
    fixture.detectChanges();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/catalog/menu-items/${ITEM_ID}`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.isAvailable).toBe(false);
    expect(req.request.body.name).toBe('صنف');
    req.flush({ ...sampleItem(), isAvailable: false });
    fixture.detectChanges();
  });

  it('shows discount validation error in item modal', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-item-button"]').click();
    fixture.detectChanges();

    setInputValue('input[formcontrolname="price"]', '10');
    setInputValue('input[formcontrolname="discountPrice"]', '20');
    fixture.detectChanges();

    expect(document.body.textContent).toContain(
      TestBed.inject(LocaleService).uiText('adminMenuDiscountInvalid'),
    );
  });

  it('does not show discount label when discount is zero', () => {
    reloadItems([{ ...sampleItem(), discountPrice: 0 }]);
    expect(
      fixture.nativeElement.querySelector(`[data-testid="menu-item-${ITEM_ID}"] .meal-card__price-original`),
    ).toBeNull();
  });

  it('centers meal code and category badge content', () => {
    const code = fixture.nativeElement.querySelector(
      `[data-testid="menu-item-${ITEM_ID}"] .meal-card__code`,
    ) as HTMLElement;
    const badge = fixture.nativeElement.querySelector(
      `[data-testid="menu-item-${ITEM_ID}"] .meal-card__badge`,
    ) as HTMLElement;
    expect(getComputedStyle(code).display).toBe('inline-flex');
    expect(getComputedStyle(code).alignItems).toBe('center');
    expect(getComputedStyle(code).justifyContent).toBe('center');
    expect(getComputedStyle(badge).display).toBe('inline-flex');
    expect(getComputedStyle(badge).alignItems).toBe('center');
    expect(getComputedStyle(badge).justifyContent).toBe('center');
  });

  it('falls back to Arabic name when English name is missing', () => {
    TestBed.inject(LocaleService).setLocale('en');
    reloadItems([{ ...sampleItem(), nameEn: null }]);
    expect(fixture.nativeElement.textContent).toContain('صنف');
  });

  it('opens add meal flow from placeholder card', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-item-placeholder"]').click();
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeTruthy();
  });

  it('uploads image on submit then saves menu item with imageFileId', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-item-button"]').click();
    fixture.detectChanges();

    const file = new File([new Uint8Array([1, 2, 3])], 'dish.png', { type: 'image/png' });
    const input: HTMLInputElement = document.body.querySelector(
      '[data-testid="menu-item-image-input"]',
    )!;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    setInputValue('input[formcontrolname="name"]', 'وجبة');
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    httpMock.expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/media`).flush({
      id: 'media-id',
      restaurantId: RESTAURANT_ID,
      fileName: 'dish.png',
      fileUrl: '/uploads/test/dish.png',
      contentType: 'image/png',
      fileSizeBytes: 3,
      createdAt: '2026-01-01T00:00:00Z',
    });

    const saveReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/catalog/menu-items`,
    );
    expect(saveReq.request.body.imageFileId).toBe('media-id');
    expect(saveReq.request.body.name).toBe('وجبة');
    saveReq.flush(sampleItem());
    fixture.detectChanges();
  });

  it('shows retry state when items request fails with 403', () => {
    reloadItemsError(403);
    expect(fixture.nativeElement.querySelector('[data-testid="menu-items-error"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      TestBed.inject(LocaleService).uiText('adminMenuErrorForbidden'),
    );
  });

  it('reorders categories, preserves the selection, and persists every changed display order', () => {
    const secondCategory: AdminCategory = {
      ...sampleCategory(),
      id: 'aaaaaaaa-6666-6666-6666-666666666667',
      nameAr: 'Category 2',
      nameEn: 'Category 2',
      displayOrder: 2,
      itemCount: 0,
    };
    const page = fixture.componentInstance as any;
    page.categories.set([sampleCategory(), secondCategory]);
    page.selectedCategoryId.set(CATEGORY_ID);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector(
      '[data-testid="menu-reorder-categories-button"]',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.menu-management-drag-handle')).toBeNull();
    const firstChip = fixture.nativeElement.querySelector(
      `[data-testid="menu-category-${CATEGORY_ID}"] .menu-management-category-pill`,
    ) as HTMLElement;
    const target = fixture.nativeElement.querySelector(
      `[data-category-reorder-id="${secondCategory.id}"]`,
    ) as HTMLElement;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(target),
    });
    const setPointerCapture = vi.fn();
    Object.defineProperty(firstChip, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });
    const firstCategoryHost = firstChip.closest('[data-category-reorder-id]') as HTMLElement;
    firstChip.dispatchEvent(domPointerEvent('pointerdown', { pointerId: 7 }));
    firstCategoryHost.dispatchEvent(domPointerEvent('pointermove'));
    fixture.detectChanges();
    expect(target.classList.contains('is-drop-after')).toBe(true);
    firstCategoryHost.dispatchEvent(domPointerEvent('pointerup'));
    fixture.detectChanges();

    expect(firstChip.classList.contains('is-reorderable')).toBe(true);
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    const reorderedIds = Array.from(
      fixture.nativeElement.querySelectorAll('[data-category-reorder-id]'),
    ).map((element: unknown) => (element as HTMLElement).dataset['categoryReorderId']);
    expect(reorderedIds).toEqual([secondCategory.id, CATEGORY_ID]);
    expect(page.selectedCategoryId()).toBe(CATEGORY_ID);

    const requests = httpMock.match(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/categories/'),
    );
    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.request.body.displayOrder).sort()).toEqual([1, 2]);
    requests.forEach((request) =>
      request.flush({
        ...(request.request.url.endsWith(CATEGORY_ID) ? sampleCategory() : secondCategory),
        displayOrder: request.request.body.displayOrder,
      }),
    );
    fixture.detectChanges();

    const notification = fixture.nativeElement.querySelector(
      '[data-testid="menu-success-message"]',
    ) as HTMLElement;
    expect(notification.querySelector('.floating-notification-pill')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('app-floating-notification-pill')).toHaveLength(1);
    notification.querySelector<HTMLButtonElement>('.floating-notification-pill__close')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="menu-success-message"]')).toBeNull();
    delete (document as unknown as Record<string, unknown>)['elementFromPoint'];
  });

  it('reorders dish cards and persists the updated display order through catalog PUTs', () => {
    const secondItem: AdminMenuItem = {
      ...sampleItem(),
      id: 'aaaaaaaa-7777-7777-7777-777777777778',
      nameAr: 'Dish 2',
      nameEn: 'Dish 2',
      displayOrder: 2,
    };
    reloadItems([sampleItem(), secondItem]);

    const reorderButton = fixture.nativeElement.querySelector(
      '[data-testid="menu-reorder-items-button"]',
    ) as HTMLButtonElement;
    expect(reorderButton.disabled).toBe(false);
    reorderButton.click();
    fixture.detectChanges();

    const target = fixture.nativeElement.querySelector(
      `[data-item-reorder-id="${secondItem.id}"]`,
    ) as HTMLElement;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn().mockReturnValue(target),
    });
    const sourceHost = fixture.nativeElement.querySelector(
      `[data-item-reorder-id="${ITEM_ID}"]`,
    ) as HTMLElement;
    const handle = sourceHost.querySelector('.meal-card__drag-handle') as HTMLElement;
    const setPointerCapture = vi.fn();
    Object.defineProperty(handle, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });
    handle.dispatchEvent(domPointerEvent('pointerdown', { pointerType: 'mouse', pointerId: 8 }));
    sourceHost.dispatchEvent(domPointerEvent('pointermove', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(target.classList.contains('menu-management-item-slot--drop-after')).toBe(true);
    sourceHost.dispatchEvent(domPointerEvent('pointerup', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(setPointerCapture).toHaveBeenCalledWith(8);

    const reorderedIds = Array.from(
      fixture.nativeElement.querySelectorAll('[data-item-reorder-id]'),
    ).map((element: unknown) => (element as HTMLElement).dataset['itemReorderId']);
    expect(reorderedIds).toEqual([secondItem.id, ITEM_ID]);
    expect(
      (fixture.nativeElement.querySelector(
        `[data-testid="menu-edit-item-${ITEM_ID}"]`,
      ) as HTMLButtonElement).disabled,
    ).toBe(true);

    const requests = httpMock.match(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );
    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.request.body.displayOrder).sort()).toEqual([1, 2]);
    requests.forEach((request) =>
      request.flush({
        ...(request.request.url.endsWith(ITEM_ID) ? sampleItem() : secondItem),
        displayOrder: request.request.body.displayOrder,
      }),
    );
    fixture.detectChanges();

    reorderButton.click();
    fixture.detectChanges();
    const searchInput = fixture.nativeElement.querySelector(
      '[data-testid="menu-search-input"]',
    ) as HTMLInputElement;
    searchInput.value = 'Dish 2';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector(`[data-testid="menu-item-${secondItem.id}"]`)).toBeTruthy();
    expect(fixture.nativeElement.querySelector(`[data-testid="menu-item-${ITEM_ID}"]`)).toBeNull();
    delete (document as unknown as Record<string, unknown>)['elementFromPoint'];
  });

  it('supports touch pointer movement while dish reorder mode is active', () => {
    const secondItem: AdminMenuItem = {
      ...sampleItem(),
      id: 'aaaaaaaa-7777-7777-7777-777777777778',
      displayOrder: 2,
    };
    reloadItems([sampleItem(), secondItem]);
    (fixture.nativeElement.querySelector(
      '[data-testid="menu-reorder-items-button"]',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    const target = fixture.nativeElement.querySelector(
      `[data-item-reorder-id="${secondItem.id}"]`,
    ) as HTMLElement;
    const pointLookup = vi.fn().mockReturnValue(target);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: pointLookup,
    });
    const setPointerCapture = vi.fn();
    const sourceHost = fixture.nativeElement.querySelector(
      `[data-item-reorder-id="${ITEM_ID}"]`,
    ) as HTMLElement;
    const handle = sourceHost.querySelector('.meal-card__drag-handle') as HTMLElement;
    Object.defineProperty(handle, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });
    handle.dispatchEvent(domPointerEvent('pointerdown', { pointerId: 7 }));
    sourceHost.dispatchEvent(domPointerEvent('pointermove'));
    sourceHost.dispatchEvent(domPointerEvent('pointerup'));
    fixture.detectChanges();

    expect(setPointerCapture).toHaveBeenCalledWith(7);
    const requests = httpMock.match(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );
    expect(requests).toHaveLength(2);
    requests.forEach((request) =>
      request.flush({
        ...(request.request.url.endsWith(ITEM_ID) ? sampleItem() : secondItem),
        displayOrder: request.request.body.displayOrder,
      }),
    );
    expect(pointLookup).toHaveBeenCalled();
    delete (document as unknown as Record<string, unknown>)['elementFromPoint'];
  });

  it('supports repeated first, middle, last, and no-op dish moves', () => {
    const secondItem: AdminMenuItem = {
      ...sampleItem(),
      id: 'aaaaaaaa-7777-7777-7777-777777777778',
      nameEn: 'Dish 2',
      displayOrder: 2,
    };
    const thirdItem: AdminMenuItem = {
      ...sampleItem(),
      id: 'aaaaaaaa-7777-7777-7777-777777777779',
      nameEn: 'Dish 3',
      displayOrder: 3,
    };
    const itemsById = new Map(
      [sampleItem(), secondItem, thirdItem].map((item) => [item.id, item]),
    );
    reloadItems([...itemsById.values()]);
    (fixture.nativeElement.querySelector(
      '[data-testid="menu-reorder-items-button"]',
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    const move = (sourceId: string, targetId: string): void => {
      const source = fixture.nativeElement.querySelector(
        `[data-item-reorder-id="${sourceId}"]`,
      ) as HTMLElement;
      const target = fixture.nativeElement.querySelector(
        `[data-item-reorder-id="${targetId}"]`,
      ) as HTMLElement;
      const handle = source.querySelector('.meal-card__drag-handle') as HTMLElement;
      Object.defineProperty(handle, 'setPointerCapture', {
        configurable: true,
        value: vi.fn(),
      });
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: vi.fn().mockReturnValue(target),
      });
      handle.dispatchEvent(domPointerEvent('pointerdown', { pointerType: 'mouse' }));
      source.dispatchEvent(domPointerEvent('pointermove', { pointerType: 'mouse' }));
      source.dispatchEvent(domPointerEvent('pointerup', { pointerType: 'mouse' }));
      fixture.detectChanges();
    };
    const flushOrderUpdates = (): void => {
      const requests = httpMock.match(
        (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
      );
      expect(requests.length).toBeGreaterThan(0);
      requests.forEach((request) => {
        const id = request.request.url.split('/').at(-1)!;
        request.flush({
          ...itemsById.get(id)!,
          displayOrder: request.request.body.displayOrder,
        });
      });
      fixture.detectChanges();
    };
    const renderedOrder = (): string[] =>
      Array.from(fixture.nativeElement.querySelectorAll('[data-item-reorder-id]')).map(
        (element: unknown) => (element as HTMLElement).dataset['itemReorderId']!,
      );

    move(ITEM_ID, secondItem.id);
    expect(renderedOrder()).toEqual([secondItem.id, ITEM_ID, thirdItem.id]);
    flushOrderUpdates();

    move(ITEM_ID, secondItem.id);
    expect(renderedOrder()).toEqual([ITEM_ID, secondItem.id, thirdItem.id]);
    flushOrderUpdates();

    move(thirdItem.id, ITEM_ID);
    expect(renderedOrder()).toEqual([thirdItem.id, ITEM_ID, secondItem.id]);
    flushOrderUpdates();

    move(thirdItem.id, thirdItem.id);
    expect(renderedOrder()).toEqual([thirdItem.id, ITEM_ID, secondItem.id]);
    httpMock.expectNone(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );
    delete (document as unknown as Record<string, unknown>)['elementFromPoint'];
  });

  it('uses responsive meal grid structure', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="menu-meals-section"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="menu-items-grid"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu-management-grid')).toBeTruthy();
  });

  function flushInitialRequests(): void {
    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/locales`)
      .flush({
        defaultLocale: 'ar',
        translationMode: 'ManualOnly',
        supportedLocales: [{ code: 'ar', isEnabled: true, sortOrder: 1 }],
        availableLocales: [
          { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
        ],
        canManageLocales: true,
      });
    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories`)
      .flush([sampleCategory()]);
    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items`)
      .flush([sampleItem()]);
    fixture.detectChanges();
  }

  function reloadItems(items: AdminMenuItem[]): void {
    fixture.nativeElement
      .querySelector(`[data-testid="menu-category-${CATEGORY_ID}"] .menu-management-category-pill`)
      .click();
    fixture.detectChanges();
    httpMock
      .expectOne((request) =>
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items` &&
        request.params.get('categoryId') === CATEGORY_ID,
      )
      .flush(items);
    fixture.detectChanges();
  }

  function reloadItemsError(status: number): void {
    fixture.nativeElement
      .querySelector(`[data-testid="menu-category-${CATEGORY_ID}"] .menu-management-category-pill`)
      .click();
    fixture.detectChanges();
    httpMock
      .expectOne((request) =>
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items` &&
        request.params.get('categoryId') === CATEGORY_ID,
      )
      .flush('Forbidden', { status, statusText: 'Forbidden' });
    fixture.detectChanges();
  }

  function setInputValue(selector: string, value: string): void {
    const input = fixture.debugElement.query(By.css(selector)).nativeElement as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }
});

function sampleCategory(): AdminCategory {
  return {
    id: CATEGORY_ID,
    restaurantId: RESTAURANT_ID,
    nameAr: 'فئة',
    nameEn: 'Category',
    displayOrder: 1,
    isActive: true,
    itemCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function sampleItem(): AdminMenuItem {
  return {
    id: ITEM_ID,
    restaurantId: RESTAURANT_ID,
    categoryId: CATEGORY_ID,
    imageFileId: 'aaaaaaaa-5555-5555-5555-555555555555',
    imageUrl: '/uploads/test/item.png',
    nameAr: 'صنف',
    nameEn: 'Test Item',
    price: 25,
    displayOrder: 1,
    isAvailable: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function domPointerEvent(
  type: string,
  overrides: Partial<PointerEvent> = {},
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerType: { value: 'touch' },
    pointerId: { value: 1 },
    button: { value: 0 },
    clientX: { value: 10 },
    clientY: { value: 10 },
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, value]) => [key, { value }]),
    ),
  });
  return event;
}

describe('MenuManagementPage primary-locale edit (7A.19.2)', () => {
  let fixture: ComponentFixture<MenuManagementPage>;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuManagementPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner, RESTAURANT_ID));
    TestBed.inject(AuthService).restoreSessionFromStorage();
    TestBed.inject(LocaleService).setLocale('en');

    fixture = TestBed.createComponent(MenuManagementPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
    httpMock.match(() => true).forEach((req) => {
      if (!req.cancelled) {
        req.flush([]);
      }
    });
    httpMock.verify();
    session.clearSession();
  });

  function flushWithLocale(
    defaultLocale: string,
    category: AdminCategory,
    items: AdminMenuItem[] = [sampleItem()],
  ): void {
    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/locales`)
      .flush({
        defaultLocale,
        translationMode: 'ManualOnly',
        supportedLocales: [
          { code: 'ar', isEnabled: true, sortOrder: 1 },
          { code: defaultLocale, isEnabled: true, sortOrder: 2 },
        ],
        availableLocales: [
          { code: 'ar', displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
          {
            code: defaultLocale,
            displayName: defaultLocale === 'fr' ? 'French' : 'German',
            nativeName: defaultLocale === 'fr' ? 'Français' : 'Deutsch',
            direction: 'ltr',
          },
        ],
        canManageLocales: true,
      });
    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories`)
      .flush([category]);
    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items`)
      .flush(items);
    fixture.detectChanges();
  }

  it('prefills category edit name from primaryName for French default locale', () => {
    flushWithLocale('fr', {
      ...sampleCategory(),
      primaryName: 'Catégorie FR',
      primaryDescription: 'Description FR',
      primaryLocale: 'fr',
      primaryFallbackApplied: false,
    });

    fixture.nativeElement.querySelector(`[data-testid="menu-edit-category-${CATEGORY_ID}"]`).click();
    fixture.detectChanges();

    const nameInput = document.body.querySelector(
      '[data-testid="menu-category-name"]',
    ) as HTMLInputElement;
    expect(nameInput.value).toBe('Catégorie FR');
    expect(document.body.querySelector('[data-testid="menu-catalog-missing-primary-locale"]')).toBeNull();
  });

  it('prefills menu item edit name from primaryName for German default locale', () => {
    flushWithLocale('de', sampleCategory(), [
      {
        ...sampleItem(),
        primaryName: 'Gericht DE',
        primaryDescription: 'Beschreibung DE',
        primaryLocale: 'de',
        primaryFallbackApplied: false,
      },
    ]);

    fixture.nativeElement.querySelector(`[data-testid="menu-edit-item-${ITEM_ID}"]`)?.click();
    fixture.detectChanges();

    const nameInput = document.body.querySelector('[data-testid="menu-item-name"]') as HTMLInputElement;
    expect(nameInput.value).toBe('Gericht DE');
    expect(document.body.querySelector('[data-testid="menu-catalog-missing-primary-locale"]')).toBeNull();
  });

  it('shows warning and leaves name empty when fr fallback is applied', () => {
    flushWithLocale('fr', {
      ...sampleCategory(),
      primaryName: 'فئة',
      primaryLocale: 'ar',
      primaryFallbackApplied: true,
    });

    fixture.nativeElement.querySelector(`[data-testid="menu-edit-category-${CATEGORY_ID}"]`).click();
    fixture.detectChanges();

    const nameInput = document.body.querySelector(
      '[data-testid="menu-category-name"]',
    ) as HTMLInputElement;
    expect(nameInput.value).toBe('');
    expect(document.body.querySelector('[data-testid="menu-catalog-missing-primary-locale"]')).toBeTruthy();
    expect(document.body.textContent).toContain(
      'No published content exists in the current primary language',
    );
  });

  it('does not show missing-primary warning on create modal', () => {
    flushWithLocale('fr', {
      ...sampleCategory(),
      primaryName: 'فئة',
      primaryLocale: 'ar',
      primaryFallbackApplied: true,
    });

    fixture.nativeElement.querySelector('[data-testid="menu-add-category-button"]').click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-catalog-missing-primary-locale"]')).toBeNull();
  });
});
