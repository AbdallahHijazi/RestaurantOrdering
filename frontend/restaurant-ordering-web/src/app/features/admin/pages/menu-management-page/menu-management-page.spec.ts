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
    httpMock.match(() => true).forEach((req) => req.flush([]));
    httpMock.verify();
    session.clearSession();
  });

  it('shows category item counts', () => {
    expect(
      fixture.nativeElement.querySelector('[data-testid="menu-category-count"]')?.textContent,
    ).toContain('1');
  });

  it('opens add category modal and creates a category', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-category-button"]').click();
    fixture.detectChanges();

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
    expect(fixture.nativeElement.querySelector('[data-testid="menu-delete-category-warning"]')).toBeTruthy();
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
        `[data-testid="menu-item-${ITEM_ID}"] .menu-page__item-fallback`,
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

    expect(fixture.nativeElement.textContent).toContain(
      TestBed.inject(LocaleService).uiText('adminMenuDiscountInvalid'),
    );
  });

  it('falls back to Arabic name when English name is missing', () => {
    TestBed.inject(LocaleService).setLocale('en');
    reloadItems([{ ...sampleItem(), nameEn: null }]);
    expect(fixture.nativeElement.textContent).toContain('صنف');
  });

  it('uploads image on submit then saves menu item with imageFileId', () => {
    fixture.nativeElement.querySelector('[data-testid="menu-add-item-button"]').click();
    fixture.detectChanges();

    const file = new File([new Uint8Array([1, 2, 3])], 'dish.png', { type: 'image/png' });
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[data-testid="menu-item-image-input"]',
    );
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

  it('includes mobile layout hooks without broken DOM', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="menu-categories-panel"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="menu-items-panel"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.menu-page__layout')).toBeTruthy();
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
      .querySelector(`[data-testid="menu-category-${CATEGORY_ID}"] .menu-page__category-btn`)
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
      .querySelector(`[data-testid="menu-category-${CATEGORY_ID}"] .menu-page__category-btn`)
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
