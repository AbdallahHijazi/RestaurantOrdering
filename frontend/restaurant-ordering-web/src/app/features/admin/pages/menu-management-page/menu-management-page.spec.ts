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

  it('uses an icon-only primary toolbar add button with existing create flow', () => {
    const addButton = fixture.nativeElement.querySelector(
      '[data-testid="menu-add-item-button"]',
    ) as HTMLButtonElement;
    expect(addButton.closest('.menu-management-toolbar')).toBeTruthy();
    expect(addButton.classList.contains('button-primary')).toBe(true);
    expect(addButton.getAttribute('aria-label')).toBe(TestBed.inject(LocaleService).uiText('adminMenuAddItem'));
    expect(addButton.querySelector('svg')).toBeTruthy();
    expect(addButton.textContent?.trim()).toBe('');
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

  it('keeps size presets editable and discards changes on close', () => {
    const page = fixture.componentInstance;
    page['openCreateItem']();
    fixture.detectChanges();
    expect(document.body.querySelector('input[formcontrolname="price"]')).toBeTruthy();

    page['itemForm'].controls.usesSizes.setValue(true);
    page['applySizePreset']('standard');
    fixture.detectChanges();
    expect(page['itemSizes'].length).toBe(3);
    expect(page['itemSizes'].at(0).controls.price.value).toBeNull();
    page['itemSizes'].at(0).controls.name.setValue('Custom');
    page['applySizePreset']('family');
    expect(page['itemSizes'].at(0).controls.name.value).toBe('Custom');
    page['dismissModal']();
    page['openCreateItem']();
    expect(page['itemSizes'].length).toBe(0);
    expect(page['itemForm'].controls.usesSizes.value).toBe(false);
  });

  it('requires explicit confirmation when converting a saved multiple-size item', () => {
    const page = fixture.componentInstance;
    page['openEditItem']({
      ...sampleItem(),
      usesSizes: true,
      sizes: [
        { id: 'small', name: 'Small', price: 10, isAvailable: true, displayOrder: 1 },
        { id: 'family', name: 'Family', price: 25, isAvailable: false, displayOrder: 2 },
      ],
    });
    const controls = page['itemForm'].controls;
    controls.usesSizes.setValue(false);
    expect(page['sizeValidationError']()).toBe(TestBed.inject(LocaleService).uiText('sizeConfirmConversion'));
    controls.confirmSinglePrice.setValue(true);
    expect(page['sizeValidationError']()).toBeNull();
    controls.usesSizes.setValue(true);
    expect(page['itemSizes'].getRawValue().map(size => size.id)).toEqual(['small', 'family']);
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
    showSelectedCategoryActions(fixture);
    fixture.nativeElement
      .querySelector(`[data-testid="menu-delete-category-${CATEGORY_ID}"]`)
      .click();
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="menu-delete-category-warning"]')).toBeTruthy();
  });

  it('closes delete category modal on dismiss without request', () => {
    showSelectedCategoryActions(fixture);
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
    showSelectedCategoryActions(fixture);
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
    showSelectedCategoryActions(fixture);
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
    showSelectedCategoryActions(fixture);
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
      .expectOne(
        (request) =>
          request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items`,
      )
      .flush([sampleItem()]);
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeNull();
  });

  it('resets category save loading state after update error', () => {
    showSelectedCategoryActions(fixture);
    fixture.nativeElement.querySelector(`[data-testid="menu-edit-category-${CATEGORY_ID}"]`).click();
    fixture.detectChanges();

    setInputValue('input[formcontrolname="name"]', 'فئة محدثة');
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/catalog/categories/${CATEGORY_ID}`)
      .flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    const saveButton = document.body.querySelector('[form="menu-category-form"]') as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.getAttribute('aria-label')).toBe(
      TestBed.inject(LocaleService).uiText('adminMenuSave'),
    );
    expect(saveButton.getAttribute('aria-busy')).toBeNull();
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
    const form = fixture.componentInstance['itemForm'];
    form.controls.discountType.setValue(3);
    fixture.detectChanges();
    setInputValue('[data-testid="menu-discount-value"]', '20');
    fixture.componentInstance['submitItem']();
    fixture.detectChanges();

    expect(document.body.textContent).toContain(
      TestBed.inject(LocaleService).uiText('menuDiscountInvalid'),
    );
  });

  it('previews a percentage discount in restaurant currency and submits the configured rule', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-item-button"]').click();
    fixture.detectChanges();
    const form = fixture.componentInstance['itemForm'];
    form.controls.discountType.setValue(1);
    fixture.detectChanges();
    setInputValue('input[formcontrolname="name"]', 'Discount verification');
    setInputValue('input[formcontrolname="price"]', '10');
    setInputValue('[data-testid="menu-discount-value"]', '25');
    fixture.detectChanges();

    const locale = TestBed.inject(LocaleService);
    const preview = document.body.querySelector('.item-pricing__preview');
    expect(preview?.textContent).toContain(locale.formatCurrency(10, 'EUR'));
    expect(preview?.textContent).toContain(locale.formatCurrency(2.5, 'EUR'));
    expect(preview?.textContent).toContain(locale.formatCurrency(7.5, 'EUR'));

    fixture.componentInstance['submitItem']();
    const request = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/catalog/menu-items`,
    );
    expect(request.request.body).toMatchObject({ price: 10, discountPrice: null, discount: { type: 1, value: 25 } });
    request.flush({ ...sampleItem(), price: 10, discountPrice: 7.5, discount: { type: 1, value: 25 } });
  });

  it('shows zero as the current price when the discount makes the item free', () => {
    reloadItems([{ ...sampleItem(), discountPrice: 0 }]);
    expect(
      fixture.nativeElement.querySelector(`[data-testid="menu-item-${ITEM_ID}"] .meal-card__price-original`),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.meal-card__price strong').textContent).toContain('0.00');
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

  // ───────────────────────── UX-005: accessible up/down reorder controls ─────────────────────────

  it('moves categories with accessible up/down buttons and persists the new order (UX-005)', () => {
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
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-testid="menu-reorder-categories-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const firstUp = fixture.nativeElement.querySelector(`[data-testid="menu-category-move-up-${CATEGORY_ID}"]`) as HTMLButtonElement;
    const firstDown = fixture.nativeElement.querySelector(`[data-testid="menu-category-move-down-${CATEGORY_ID}"]`) as HTMLButtonElement;
    const secondDown = fixture.nativeElement.querySelector(`[data-testid="menu-category-move-down-${secondCategory.id}"]`) as HTMLButtonElement;
    expect(firstUp.disabled).toBe(true); // already first
    expect(secondDown.disabled).toBe(true); // already last
    expect(firstDown.disabled).toBe(false);
    expect(firstDown.getAttribute('aria-label')).toContain(TestBed.inject(LocaleService).uiText('actionMoveDown'));
    expect(firstDown.querySelector('svg')).toBeTruthy();

    firstDown.click();
    fixture.detectChanges();

    const ids = Array.from(fixture.nativeElement.querySelectorAll('[data-category-reorder-id]')).map(
      (el: unknown) => (el as HTMLElement).dataset['categoryReorderId'],
    );
    expect(ids).toEqual([secondCategory.id, CATEGORY_ID]);
    const requests = httpMock.match((r) => r.method === 'PUT' && r.url.includes('/catalog/categories/'));
    expect(requests).toHaveLength(2);
    expect(requests.map((r) => r.request.body.displayOrder).sort()).toEqual([1, 2]);
    requests.forEach((r) =>
      r.flush({ ...(r.request.url.endsWith(CATEGORY_ID) ? sampleCategory() : secondCategory), displayOrder: r.request.body.displayOrder }),
    );
  });

  it('moves dishes with accessible up/down buttons and persists the new order (UX-005)', () => {
    const secondItem: AdminMenuItem = {
      ...sampleItem(),
      id: 'aaaaaaaa-7777-7777-7777-777777777778',
      nameAr: 'Dish 2',
      nameEn: 'Dish 2',
      displayOrder: 2,
    };
    reloadItems([sampleItem(), secondItem]);
    (fixture.nativeElement.querySelector('[data-testid="menu-reorder-items-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const firstUp = fixture.nativeElement.querySelector(`[data-testid="menu-move-up-${ITEM_ID}"]`) as HTMLButtonElement;
    const firstDown = fixture.nativeElement.querySelector(`[data-testid="menu-move-down-${ITEM_ID}"]`) as HTMLButtonElement;
    const secondDown = fixture.nativeElement.querySelector(`[data-testid="menu-move-down-${secondItem.id}"]`) as HTMLButtonElement;
    expect(firstUp.disabled).toBe(true);
    expect(secondDown.disabled).toBe(true);
    expect(firstDown.getAttribute('aria-label')).toContain(TestBed.inject(LocaleService).uiText('actionMoveDown'));

    firstDown.click();
    fixture.detectChanges();

    const ids = Array.from(fixture.nativeElement.querySelectorAll('[data-item-reorder-id]')).map(
      (el: unknown) => (el as HTMLElement).dataset['itemReorderId'],
    );
    expect(ids).toEqual([secondItem.id, ITEM_ID]);
    const requests = httpMock.match((r) => r.method === 'PUT' && r.url.includes('/catalog/menu-items/'));
    expect(requests).toHaveLength(2);
    expect(requests.map((r) => r.request.body.displayOrder).sort()).toEqual([1, 2]);
    requests.forEach((r) =>
      r.flush({ ...(r.request.url.endsWith(ITEM_ID) ? sampleItem() : secondItem), displayOrder: r.request.body.displayOrder }),
    );
  });

  it('only offers the up/down buttons while reorder mode is active (UX-005)', () => {
    expect(fixture.nativeElement.querySelector(`[data-testid="menu-category-move-down-${CATEGORY_ID}"]`)).toBeNull();
    expect(fixture.nativeElement.querySelector(`[data-testid="menu-move-down-${ITEM_ID}"]`)).toBeNull();
  });

  // ───────────────────────── UX-006: duplicate category warning + image removal ─────────────────────────

  it('warns (without blocking) when a category name already exists (UX-006)', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-category-button"]').click();
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="menu-category-duplicate-warning"]')).toBeNull();

    setInputValue('input[formcontrolname="name"]', '  ' + sampleCategory().nameAr.toUpperCase() + ' ');
    fixture.detectChanges();

    const warning = document.body.querySelector('[data-testid="menu-category-duplicate-warning"]');
    expect(warning).toBeTruthy();
    expect(warning!.textContent).toContain(TestBed.inject(LocaleService).uiText('adminMenuDuplicateCategoryWarning'));
    // the warning is informational: saving stays possible
    expect((document.body.querySelector('[form="menu-category-form"]') as HTMLButtonElement).disabled).toBe(false);

    setInputValue('input[formcontrolname="name"]', 'A brand new category name');
    fixture.detectChanges();
    expect(document.body.querySelector('[data-testid="menu-category-duplicate-warning"]')).toBeNull();
  });

  it('does not warn about the category currently being edited (UX-006)', () => {
    const page = fixture.componentInstance as any;
    page.openEditCategory(sampleCategory());
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-category-duplicate-warning"]')).toBeNull();
  });

  it('removes a meal image and saves the item without an image id (UX-006)', () => {
    const withImage: AdminMenuItem = { ...sampleItem(), imageFileId: 'media-1', imageUrl: '/uploads/a.png' };
    reloadItems([withImage]);
    const page = fixture.componentInstance as any;
    page.openEditItem(withImage);
    fixture.detectChanges();

    const remove = document.body.querySelector('[data-testid="menu-item-image-remove"]') as HTMLButtonElement;
    expect(remove).toBeTruthy();
    expect(remove.getAttribute('aria-label')).toBe(TestBed.inject(LocaleService).uiText('actionRemoveImage'));
    remove.click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-item-image-preview"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="menu-item-image-removed-note"]')).toBeTruthy();

    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    const put = httpMock.expectOne((r) => r.method === 'PUT' && r.url.includes('/catalog/menu-items/'));
    expect(put.request.body.imageFileId).toBeNull();
    put.flush({ ...withImage, imageFileId: null, imageUrl: null });
  });

  it('keeps the image when it was not removed (UX-006)', () => {
    const withImage: AdminMenuItem = { ...sampleItem(), imageFileId: 'media-1', imageUrl: '/uploads/a.png' };
    reloadItems([withImage]);
    const page = fixture.componentInstance as any;
    page.openEditItem(withImage);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    const put = httpMock.expectOne((r) => r.method === 'PUT' && r.url.includes('/catalog/menu-items/'));
    expect(put.request.body.imageFileId).toBe('media-1');
    put.flush(withImage);
  });

  /** jsdom has no layout: give the container and its slots a deterministic geometry (slot i at x = i*100). */
  function layoutSlots(container: HTMLElement, selector: string): HTMLElement[] {
    mockRect(container, 0, 0, 1000, 100);
    const slots = Array.from(container.querySelectorAll<HTMLElement>(selector));
    slots.forEach((slot, index) => mockRect(slot, index * 100, 0, 90, 90));
    return slots;
  }

  function firePointer(
    type: 'pointermove' | 'pointerup' | 'pointercancel',
    slot: number,
    pointerType: 'mouse' | 'touch' = 'mouse',
  ): void {
    document.dispatchEvent(
      domPointerEvent(type, { pointerType, pointerId: 7, clientX: slot * 100 + 45, clientY: 45 }),
    );
  }

  function startItemDrag(
    sourceId: string,
    pointerType: 'mouse' | 'touch' = 'mouse',
  ): HTMLElement[] {
    const grid = fixture.nativeElement.querySelector('[data-testid="menu-items-grid"]') as HTMLElement;
    const cards = layoutSlots(grid, '[data-item-reorder-id]');
    const handle = fixture.nativeElement.querySelector(
      `[data-item-reorder-id="${sourceId}"] .meal-card__drag-handle`,
    ) as HTMLElement;
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: vi.fn() });
    handle.dispatchEvent(
      domPointerEvent('pointerdown', { pointerType, pointerId: 7, clientX: 45, clientY: 45 }),
    );
    fixture.detectChanges();
    return cards;
  }

  const renderedItemOrder = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[data-item-reorder-id]')).map(
      (element: unknown) => (element as HTMLElement).dataset['itemReorderId']!,
    );

  function threeItems(): AdminMenuItem[] {
    const second: AdminMenuItem = {
      ...sampleItem(),
      id: 'aaaaaaaa-7777-7777-7777-777777777778',
      nameEn: 'Dish 2',
      displayOrder: 2,
    };
    const third: AdminMenuItem = {
      ...sampleItem(),
      id: 'aaaaaaaa-7777-7777-7777-777777777779',
      nameEn: 'Dish 3',
      displayOrder: 3,
    };
    return [sampleItem(), second, third];
  }

  function flushItemPuts(items: AdminMenuItem[]): number {
    const byId = new Map(items.map((item) => [item.id, item]));
    const requests = httpMock.match(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );
    requests.forEach((request) =>
      request.flush({
        ...byId.get(request.request.url.split('/').at(-1)!)!,
        displayOrder: request.request.body.displayOrder,
      }),
    );
    fixture.detectChanges();
    return requests.length;
  }

  it('previews a dish drag without mutating the list and commits exactly one reorder on drop', () => {
    const items = threeItems();
    reloadItems(items);
    (fixture.nativeElement.querySelector('[data-testid="menu-reorder-items-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Acceptance: drag dish #3 over dish #2.
    const cards = startItemDrag(items[2]!.id);
    expect(fixture.nativeElement.querySelector('[data-testid="menu-drag-ghost"]')).toBeTruthy();
    expect(cards[2]!.querySelector('.meal-card--dragging')).toBeTruthy();

    firePointer('pointermove', 1);
    fixture.detectChanges();
    // Preview only: DOM/list order untouched, CSS order places #3 in slot 2.
    expect(renderedItemOrder()).toEqual(items.map((item) => item.id));
    expect(cards.map((card) => card.style.order)).toEqual(['1', '3', '2']);

    // Jitter around the target, through a gutter (x=95..99) and back: the preview must not oscillate.
    const stable = cards.map((card) => card.style.order);
    for (let i = 0; i < 20; i++) {
      document.dispatchEvent(
        domPointerEvent('pointermove', {
          pointerType: 'mouse',
          pointerId: 7,
          clientX: i % 2 ? 96 : 104 + (i % 5),
          clientY: 40 + (i % 7),
        }),
      );
      fixture.detectChanges();
      expect(cards.map((card) => card.style.order)).toEqual(stable);
    }
    httpMock.expectNone(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );

    firePointer('pointerup', 1);
    fixture.detectChanges();
    expect(renderedItemOrder()).toEqual([items[0]!.id, items[2]!.id, items[1]!.id]);
    expect(cards.every((card) => !card.style.order)).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="menu-drag-ghost"]')).toBeNull();

    const requests = httpMock.match(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );
    expect(requests).toHaveLength(2);
    expect(
      requests.map((request) => `${request.request.url.split('/').at(-1)}:${request.request.body.displayOrder}`).sort(),
    ).toEqual([`${items[1]!.id}:3`, `${items[2]!.id}:2`].sort());
    const byId = new Map(items.map((item) => [item.id, item]));
    requests.forEach((request) =>
      request.flush({
        ...byId.get(request.request.url.split('/').at(-1)!)!,
        displayOrder: request.request.body.displayOrder,
      }),
    );
    fixture.detectChanges();
    expect(renderedItemOrder()).toEqual([items[0]!.id, items[2]!.id, items[1]!.id]);
  });

  it('supports touch pointer drags the same way', () => {
    const items = threeItems().slice(0, 2);
    reloadItems(items);
    (fixture.nativeElement.querySelector('[data-testid="menu-reorder-items-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    startItemDrag(items[0]!.id, 'touch');
    firePointer('pointermove', 1, 'touch');
    firePointer('pointerup', 1, 'touch');
    fixture.detectChanges();

    expect(renderedItemOrder()).toEqual([items[1]!.id, items[0]!.id]);
    expect(flushItemPuts(items)).toBe(2);
  });

  it('commits nothing when a dish is dropped back where it started', () => {
    const items = threeItems();
    reloadItems(items);
    (fixture.nativeElement.querySelector('[data-testid="menu-reorder-items-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    startItemDrag(items[0]!.id);
    firePointer('pointermove', 2);
    firePointer('pointermove', 0);
    firePointer('pointerup', 0);
    fixture.detectChanges();

    expect(renderedItemOrder()).toEqual(items.map((item) => item.id));
    httpMock.expectNone(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );
  });

  it('cancels a dish drag on Escape or pointercancel without any request', () => {
    const items = threeItems();
    reloadItems(items);
    (fixture.nativeElement.querySelector('[data-testid="menu-reorder-items-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const cards = startItemDrag(items[0]!.id);
    firePointer('pointermove', 2);
    expect(cards.map((card) => card.style.order)).toEqual(['3', '1', '2']);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(cards.every((card) => !card.style.order)).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="menu-drag-ghost"]')).toBeNull();

    startItemDrag(items[0]!.id);
    firePointer('pointermove', 1);
    firePointer('pointercancel', 1);
    fixture.detectChanges();
    expect(renderedItemOrder()).toEqual(items.map((item) => item.id));
    httpMock.expectNone(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );
  });

  it('restores the previous dish order when persisting a drag fails', () => {
    const items = threeItems().slice(0, 2);
    reloadItems(items);
    (fixture.nativeElement.querySelector('[data-testid="menu-reorder-items-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    startItemDrag(items[0]!.id);
    firePointer('pointermove', 1);
    firePointer('pointerup', 1);
    fixture.detectChanges();
    expect(renderedItemOrder()).toEqual([items[1]!.id, items[0]!.id]);

    const requests = httpMock.match(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );
    expect(requests).toHaveLength(2);
    // forkJoin cancels the sibling requests as soon as one fails.
    requests[0]!.flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(renderedItemOrder()).toEqual(items.map((item) => item.id));
    expect(fixture.nativeElement.querySelector('[data-testid="menu-reorder-error"]')).toBeTruthy();
  });

  it('supports repeated first, middle, last, and no-op dish moves', () => {
    const items = threeItems();
    const [first, second, third] = items as [AdminMenuItem, AdminMenuItem, AdminMenuItem];
    reloadItems(items);
    (fixture.nativeElement.querySelector('[data-testid="menu-reorder-items-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const move = (sourceId: string, targetId: string): void => {
      const targetSlot = renderedItemOrder().indexOf(targetId);
      startItemDrag(sourceId);
      firePointer('pointermove', targetSlot);
      firePointer('pointerup', targetSlot);
      fixture.detectChanges();
    };

    move(first.id, second.id);
    expect(renderedItemOrder()).toEqual([second.id, first.id, third.id]);
    expect(flushItemPuts(items)).toBeGreaterThan(0);

    move(first.id, second.id);
    expect(renderedItemOrder()).toEqual([first.id, second.id, third.id]);
    expect(flushItemPuts(items)).toBeGreaterThan(0);

    move(third.id, first.id);
    expect(renderedItemOrder()).toEqual([third.id, first.id, second.id]);
    expect(flushItemPuts(items)).toBeGreaterThan(0);

    move(third.id, third.id);
    expect(renderedItemOrder()).toEqual([third.id, first.id, second.id]);
    httpMock.expectNone(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/menu-items/'),
    );
  });

  it('reorders categories with the same stable preview and a single commit', () => {
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

    const strip = fixture.nativeElement.querySelector('[data-testid="menu-category-strip"]') as HTMLElement;
    const wraps = layoutSlots(strip, '[data-category-reorder-id]');
    const firstChip = wraps[0]!.querySelector('.menu-management-category-pill') as HTMLElement;
    const setPointerCapture = vi.fn();
    Object.defineProperty(firstChip, 'setPointerCapture', { configurable: true, value: setPointerCapture });

    firstChip.dispatchEvent(domPointerEvent('pointerdown', { pointerType: 'mouse', pointerId: 7 }));
    fixture.detectChanges();
    firePointer('pointermove', 1);
    fixture.detectChanges();

    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(wraps.map((wrap) => wrap.style.order)).toEqual(['2', '1']);
    expect(wraps[0]!.classList.contains('is-dragging')).toBe(true);
    const domOrder = (): string[] =>
      Array.from(fixture.nativeElement.querySelectorAll('[data-category-reorder-id]')).map(
        (element: unknown) => (element as HTMLElement).dataset['categoryReorderId']!,
      );
    expect(domOrder()).toEqual([CATEGORY_ID, secondCategory.id]);
    httpMock.expectNone(
      (request) => request.method === 'PUT' && request.url.includes('/catalog/categories/'),
    );

    firePointer('pointerup', 1);
    fixture.detectChanges();

    expect(domOrder()).toEqual([secondCategory.id, CATEGORY_ID]);
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
    expect(fixture.nativeElement.querySelector('[data-testid="menu-success-message"]')).toBeTruthy();
  });

  it('shows Edit/Delete only for the selected category and hides them (inert) for All', () => {
    const second: AdminCategory = {
      ...sampleCategory(),
      id: 'aaaaaaaa-6666-6666-6666-666666666667',
      nameAr: 'Category 2',
      nameEn: 'Category 2',
      displayOrder: 2,
    };
    const page = fixture.componentInstance as any;
    page.categories.set([sampleCategory(), second]);
    fixture.detectChanges();

    const context = fixture.nativeElement.querySelector('[data-testid="menu-category-context"]') as HTMLElement;
    expect(context.classList.contains('is-open')).toBe(false);
    expect(context.hasAttribute('inert')).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('[data-testid^="menu-edit-category-"]')).toHaveLength(0);

    page.selectedCategoryId.set(CATEGORY_ID);
    fixture.detectChanges();
    expect(context.classList.contains('is-open')).toBe(true);
    expect(context.hasAttribute('inert')).toBe(false);
    expect(
      Array.from(fixture.nativeElement.querySelectorAll('[data-testid^="menu-edit-category-"]')).map(
        (el: unknown) => (el as HTMLElement).dataset['testid'],
      ),
    ).toEqual([`menu-edit-category-${CATEGORY_ID}`]);

    // Rapid switching: always exactly one action row, bound to the latest selection.
    for (const id of [second.id, CATEGORY_ID, second.id]) {
      page.selectedCategoryId.set(id);
      page.lastManagedCategoryId.set(id);
      fixture.detectChanges();
    }
    expect(fixture.nativeElement.querySelectorAll('.menu-management-category-context__row')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector(`[data-testid="menu-edit-category-${second.id}"]`)).toBeTruthy();
    expect(fixture.nativeElement.querySelector(`[data-testid="menu-edit-category-${CATEGORY_ID}"]`)).toBeNull();

    // Back to All: the row stays mounted (so it can animate closed) but is closed and inert.
    page.selectedCategoryId.set(page.allItemsFilter);
    fixture.detectChanges();
    expect(context.classList.contains('is-open')).toBe(false);
    expect(context.hasAttribute('inert')).toBe(true);
  });

  it('explains why dish reordering is disabled through the shared tooltip, localized', () => {
    const locale = TestBed.inject(LocaleService);
    const anchor = fixture.nativeElement.querySelector(
      '[data-testid="menu-reorder-items-anchor"]',
    ) as HTMLElement;
    const button = fixture.nativeElement.querySelector(
      '[data-testid="menu-reorder-items-button"]',
    ) as HTMLButtonElement;

    // "All meals" selected: disabled, with a focusable wrapper carrying the reason.
    expect(button.disabled).toBe(true);
    expect(anchor.getAttribute('tabindex')).toBe('0');
    expect(anchor.getAttribute('aria-label')).toContain(locale.uiText('adminMenuReorderNeedCategory'));

    anchor.dispatchEvent(new Event('focusin'));
    const bubble = document.body.querySelector('.app-tooltip') as HTMLElement;
    expect(bubble.textContent?.trim()).toBe(locale.uiText('adminMenuReorderNeedCategory'));
    expect(bubble.classList.contains('is-visible')).toBe(true);
    expect(anchor.getAttribute('aria-describedby')).toBe(bubble.id);
    // No browser-native title bubble on the styled buttons.
    expect(button.hasAttribute('title')).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(bubble.classList.contains('is-visible')).toBe(false);

    locale.setLocale('en');
    fixture.detectChanges();
    anchor.dispatchEvent(new Event('focusin'));
    expect(bubble.textContent?.trim()).toBe('Select a category first to reorder meals.');
    anchor.dispatchEvent(new Event('focusout'));

    // A category is selected and the list loaded: usable, wrapper is no longer a tab stop.
    reloadItems([sampleItem(), { ...sampleItem(), id: 'aaaaaaaa-7777-7777-7777-777777777778', displayOrder: 2 }]);
    expect(button.disabled).toBe(false);
    expect(anchor.hasAttribute('tabindex')).toBe(false);
    locale.setLocale('ar');
  });

  it('renders View / Edit / Delete as one horizontal group with the standard pencil icon', () => {
    const group = fixture.nativeElement.querySelector('.meal-card__actions') as HTMLElement;
    expect(group).toBeTruthy();
    const buttons = Array.from(group.querySelectorAll('button'));
    expect(buttons.map((button) => button.dataset['testid'])).toEqual([
      `menu-toggle-availability-${ITEM_ID}`,
      `menu-edit-item-${ITEM_ID}`,
      `menu-delete-item-${ITEM_ID}`,
    ]);
    expect(buttons.every((button) => button.classList.contains('app-icon-btn--sm'))).toBe(true);
    expect(buttons[1]!.querySelector('path')?.getAttribute('d')).toContain('M17 3a2.85 2.83');
  });

  it('uses responsive meal grid structure', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="menu-meals-section"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="menu-items-grid"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu-management-grid')).toBeTruthy();
  });

  function flushInitialRequests(): void {
    httpMock.expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/settings`)
      .flush({ currencyCode: 'EUR' });
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

/** The contextual Edit/Delete row only exists for the selected category. */
function showSelectedCategoryActions(fixture: ComponentFixture<MenuManagementPage>): void {
  (fixture.componentInstance as unknown as { selectedCategoryId: { set(id: string): void } }).selectedCategoryId.set(
    CATEGORY_ID,
  );
  fixture.detectChanges();
}

function mockRect(element: Element, left: number, top: number, width: number, height: number): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }),
  });
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

    showSelectedCategoryActions(fixture);

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

    showSelectedCategoryActions(fixture);

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
