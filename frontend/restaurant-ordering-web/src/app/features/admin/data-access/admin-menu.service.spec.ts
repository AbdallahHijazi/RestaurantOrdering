import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AuthService } from '../../../core/auth/auth.service';
import { ApplicationRoles } from '../../../core/auth/application-roles';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { createTestSession } from '../../../core/auth/test-jwt.util';
import { AdminMenuService } from './admin-menu.service';
import type { AdminCategory, AdminMenuItem, UploadedMediaFile } from './admin-menu.models';

const RESTAURANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CATEGORY_ID = 'aaaaaaaa-6666-6666-6666-666666666666';
const ITEM_ID = 'aaaaaaaa-7777-7777-7777-777777777777';

describe('AdminMenuService', () => {
  let service: AdminMenuService;
  let httpMock: HttpTestingController;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSessionService);
    session.clearSession();
    session.saveSession(createTestSession(ApplicationRoles.RestaurantOwner, RESTAURANT_ID));
    TestBed.inject(AuthService).restoreSessionFromStorage();
    service = TestBed.inject(AdminMenuService);
  });

  afterEach(() => {
    httpMock.verify();
    session.clearSession();
  });

  it('reads restaurantId from the central session', () => {
    expect(service.getRestaurantId()).toBe(RESTAURANT_ID);
  });

  it('loads categories for the current restaurant', () => {
    service.listCategories().subscribe();
    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories`,
    );
    expect(req.request.method).toBe('GET');
    req.flush([sampleCategory()]);
  });

  it('creates, updates, and deletes categories', () => {
    const payload = {
      nameAr: 'فئة',
      nameEn: 'Category',
      descriptionAr: null,
      descriptionEn: null,
      displayOrder: 1,
      isActive: true,
    };

    service.createCategory(payload).subscribe();
    httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories`,
    ).flush(sampleCategory());

    service.updateCategory(CATEGORY_ID, payload).subscribe();
    httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories/${CATEGORY_ID}`,
    ).flush(sampleCategory());

    service.deleteCategory(CATEGORY_ID).subscribe();
    httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/categories/${CATEGORY_ID}`,
    ).flush(null);
  });

  it('loads menu items with optional category filter', () => {
    service.listMenuItems(CATEGORY_ID).subscribe();
    const req = httpMock.expectOne((request) => {
      return (
        request.url === `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items` &&
        request.params.get('categoryId') === CATEGORY_ID
      );
    });
    req.flush([sampleItem()]);
  });

  it('creates, updates, and deletes menu items', () => {
    const payload = sampleSaveItemRequest();

    service.createMenuItem(payload).subscribe();
    httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items`,
    ).flush(sampleItem());

    service.updateMenuItem(ITEM_ID, payload).subscribe();
    httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items/${ITEM_ID}`,
    ).flush(sampleItem());

    service.deleteMenuItem(ITEM_ID).subscribe();
    httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/menu-items/${ITEM_ID}`,
    ).flush(null);
  });

  it('uploads media using multipart form field file', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'item.png', { type: 'image/png' });
    service.uploadMedia(file).subscribe();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/media`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBeTruthy();
    req.flush(sampleUpload());
  });
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
    nameEn: 'Item',
    price: 10,
    displayOrder: 1,
    isAvailable: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function sampleSaveItemRequest() {
  return {
    categoryId: CATEGORY_ID,
    imageFileId: null,
    nameAr: 'صنف',
    nameEn: 'Item',
    descriptionAr: null,
    descriptionEn: null,
    price: 10,
    discountPrice: null,
    displayOrder: 1,
    isAvailable: true,
    isActive: true,
  };
}

function sampleUpload(): UploadedMediaFile {
  return {
    id: 'aaaaaaaa-5555-5555-5555-555555555555',
    restaurantId: RESTAURANT_ID,
    fileName: 'item.png',
    fileUrl: '/uploads/test/item.png',
    contentType: 'image/png',
    fileSizeBytes: 3,
    createdAt: '2026-01-01T00:00:00Z',
  };
}
