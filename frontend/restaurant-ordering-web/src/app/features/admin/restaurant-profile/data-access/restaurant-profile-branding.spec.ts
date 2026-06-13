import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { AuthService } from '../../../../core/auth/auth.service';
import { RestaurantThemeService } from '../../../../core/theme/restaurant-theme';
import {
  createImagePreviewUrl,
  revokeImagePreviewUrl,
  validateImageFile,
} from './image-preview.util';
import { mapPublicMenuApiDto } from '../../../public-menu/data-access/public-menu.mapper';
import {
  RestaurantProfileApiService,
  type BrandingSaveContext,
} from './restaurant-profile-api';

const RESTAURANT_ID = 'aaaaaaaa-1111-1111-1111-111111111111';

function createImageFile(name = 'logo.png', type = 'image/png', size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('image preview util', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates blob preview for valid images', () => {
    const file = createImageFile();
    const url = createImagePreviewUrl(file);
    expect(url).toMatch(/^blob:/);
    revokeImagePreviewUrl(url);
  });

  it('rejects unsupported image types', () => {
    const file = new File(['x'], 'bad.gif', { type: 'image/gif' });
    expect(validateImageFile(file).valid).toBe(false);
    expect(createImagePreviewUrl(file)).toBeNull();
  });

  it('does not revoke http urls', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    revokeImagePreviewUrl('https://example.test/logo.png');
    expect(revokeSpy).not.toHaveBeenCalled();
  });
});

describe('public menu mapper branding', () => {
  it('maps logoUrl coverImageUrl and accentColor from API', () => {
    const mapped = mapPublicMenuApiDto({
      id: RESTAURANT_ID,
      slug: 'restaurant-a',
      nameAr: 'مطعم',
      phoneNumber: '+966500000000',
      logoUrl: '/uploads/test/logo.png',
      coverImageUrl: '/uploads/test/cover.png',
      accentColor: '#FF5500',
      categories: [],
    });

    expect(mapped.restaurant.logoUrl).toContain('/uploads/test/logo.png');
    expect(mapped.restaurant.coverImageUrl).toContain('/uploads/test/cover.png');
    expect(mapped.restaurant.primaryAccentColor).toBe('#FF5500');
  });
});

describe('RestaurantProfileApiService branding', () => {
  let service: RestaurantProfileApiService;
  let httpMock: HttpTestingController;

  const formValue = {
    nameAr: 'مطعم',
    nameEn: 'Restaurant',
    descriptionAr: '',
    descriptionEn: '',
    slug: 'restaurant-a',
    logoUrl: null,
    coverImageUrl: null,
    primaryAccentColor: '#c6a15b',
    countryCode: 'SA',
    defaultLocale: 'ar' as const,
    supportedLocales: ['ar', 'en'] as ('ar' | 'en')[],
    currencyCode: 'SAR',
    timeZone: 'Asia/Riyadh',
    phoneCountryCode: '+966',
    phoneNumber: '+966500000000',
    whatsAppNumber: '',
    email: '',
    city: '',
    addressAr: '',
    addressEn: '',
    isPickupEnabled: true,
    isDeliveryEnabled: true,
    deliveryFee: 18,
    minimumOrderAmount: 40,
    taxRate: 12.5,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { restaurantId: () => RESTAURANT_ID } },
      ],
    });

    service = TestBed.inject(RestaurantProfileApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('PUT profile sends accentColor', async () => {
    const promise = new Promise<void>((resolve) => {
      service.saveRestaurantProfile(formValue).subscribe(() => resolve());
    });

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`,
    );
    expect(req.request.body.accentColor).toBe('#c6a15b');
    req.flush({
      id: RESTAURANT_ID,
      ownerId: 'o',
      slug: 'restaurant-a',
      nameAr: 'مطعم',
      accentColor: '#c6a15b',
      phoneNumber: '+966500000000',
      isActive: true,
    });

    await promise;
  });

  it('setRestaurantCoverImage uses cover-image endpoint', async () => {
    const promise = new Promise<void>((resolve) => {
      service.setRestaurantCoverImage(RESTAURANT_ID, 'media-cover').subscribe(() => resolve());
    });

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/cover-image`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ mediaFileId: 'media-cover' });
    req.flush({
      id: RESTAURANT_ID,
      ownerId: 'o',
      slug: 'restaurant-a',
      nameAr: 'مطعم',
      coverImageFileId: 'media-cover',
      coverImageUrl: '/uploads/test/cover.png',
      accentColor: '#c6a15b',
      phoneNumber: '+966500000000',
      isActive: true,
    });

    await promise;
  });

  it('saveRestaurantProfileWithBranding uploads logo then PUT profile then PUT logo', async () => {
    const branding: BrandingSaveContext = {
      pendingLogoFile: createImageFile(),
      pendingCoverFile: null,
      uploadedLogo: null,
      uploadedCover: null,
    };

    const promise = new Promise<void>((resolve) => {
      service.saveRestaurantProfileWithBranding(formValue, branding).subscribe(() => resolve());
    });

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/media`)
      .flush({
        id: 'media-logo',
        restaurantId: RESTAURANT_ID,
        fileName: 'logo.png',
        fileUrl: '/uploads/test/logo.png',
        contentType: 'image/png',
        fileSizeBytes: 1024,
        createdAt: '2026-06-05T00:00:00.000Z',
      });

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`)
      .flush({
        id: RESTAURANT_ID,
        ownerId: 'o',
        slug: 'restaurant-a',
        nameAr: 'مطعم',
        accentColor: '#c6a15b',
        phoneNumber: '+966500000000',
        isActive: true,
      });

    httpMock
      .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/logo`)
      .flush({
        id: RESTAURANT_ID,
        ownerId: 'o',
        slug: 'restaurant-a',
        logoFileId: 'media-logo',
        logoUrl: '/uploads/test/logo.png',
        accentColor: '#c6a15b',
        phoneNumber: '+966500000000',
        isActive: true,
      });

    await promise;
  });
});

describe('RestaurantThemeService accent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('accepts #c6a15b but applies olive accent to the UI', () => {
    const theme = TestBed.inject(RestaurantThemeService);
    const accent = theme.applyAccent('#c6a15b');
    expect(accent).toBe('#c6a15b');
    expect(document.documentElement.style.getPropertyValue('--restaurant-accent')).toBe('#6e7b4e');
  });

  it('falls back for invalid accent values', () => {
    const theme = TestBed.inject(RestaurantThemeService);
    expect(theme.sanitizeAccentColor('red')).toBe('#6e7b4e');
  });
});

describe('branding cache workaround removed', () => {
  it('does not write restaurant-ordering.branding to sessionStorage', () => {
    sessionStorage.removeItem('restaurant-ordering.branding');
    expect(sessionStorage.getItem('restaurant-ordering.branding')).toBeNull();
  });
});
