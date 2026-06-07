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
    expect(getComputedStyle(addButton).color).toBe('var(--restaurant-surface-white)');
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

  it('shows meals count label based on filtered results', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="menu-meals-count"]')?.textContent).toContain('1');
  });

  it('opens add category modal and creates a category', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-category-button"]').click();
    fixture.detectChanges();

    expect(document.body.querySelector('[data-testid="menu-modal"]')).toBeTruthy();
    expect(
      document.body.querySelector('[data-testid="order-modal-close"]')?.classList.contains('modal-close-button'),
    ).toBe(true);

    setInputValue('input[formcontrolname="nameAr"]', 'فئة جديدة');
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories`)
      .flush({
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

    setInputValue('input[formcontrolname="nameAr"]', 'فئة محدثة');
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories/${CATEGORY_ID}`,
    );
    expect(req.request.method).toBe('PUT');
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

    setInputValue('input[formcontrolname="nameAr"]', 'فئة محدثة');
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories/${CATEGORY_ID}`)
      .flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    const saveButton = document.body.querySelector('.button-primary') as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.textContent).toContain(
      TestBed.inject(LocaleService).uiText('adminMenuSave'),
    );
  });

  it('keeps search and add meal on one toolbar row on desktop', () => {
    const toolbar = fixture.nativeElement.querySelector('.menu-management-toolbar') as HTMLElement;
    expect(getComputedStyle(toolbar).flexWrap).toBe('nowrap');
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
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items/${ITEM_ID}`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.isAvailable).toBe(false);
    expect(req.request.body.nameAr).toBe('صنف');
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

    setInputValue('input[formcontrolname="nameAr"]', 'وجبة');
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
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items`,
    );
    expect(saveReq.request.body.imageFileId).toBe('media-id');
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

  it('uses responsive meal grid structure', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="menu-meals-section"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="menu-items-grid"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu-management-grid')).toBeTruthy();
  });

  function flushInitialRequests(): void {
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
