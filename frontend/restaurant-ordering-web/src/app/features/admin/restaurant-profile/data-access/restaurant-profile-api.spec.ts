import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { API_BASE_URL } from '../../../../core/config/api-config';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  RestaurantProfileApiService,
  buildUpdateSettingsRequest,
} from './restaurant-profile-api';

describe('RestaurantProfileApiService', () => {
  let service: RestaurantProfileApiService;
  let httpMock: HttpTestingController;

  const restaurantId = 'aaaaaaaa-1111-1111-1111-111111111111';

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
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: { restaurantId: () => restaurantId },
        },
      ],
    });

    service = TestBed.inject(RestaurantProfileApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('saveOrderingSettings sends PUT with loaded values and snapshot', async () => {
    const promise = new Promise<void>((resolve) => {
      service
        .saveOrderingSettings(formValue, { workingHoursJson: '{"fri":"closed"}' })
        .subscribe(() => resolve());
    });

    const settingsReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/settings`,
    );
    expect(settingsReq.request.method).toBe('PUT');
    expect(settingsReq.request.body).toEqual(
      buildUpdateSettingsRequest(formValue, { workingHoursJson: '{"fri":"closed"}' }),
    );
    settingsReq.flush({
      id: 's',
      restaurantId,
      currencyCode: 'SAR',
      timeZone: 'Asia/Riyadh',
      taxRate: 12.5,
      deliveryFee: 18,
      minimumOrderAmount: 40,
      isDeliveryEnabled: true,
      isPickupEnabled: true,
      workingHoursJson: '{"fri":"closed"}',
    });

    await promise;
    httpMock.expectNone(`${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}`);
  });

  it('saveRestaurantProfile sends PUT restaurant only', async () => {
    const promise = new Promise<void>((resolve) => {
      service.saveRestaurantProfile(formValue).subscribe(() => resolve());
    });

    const restaurantReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}`,
    );
    expect(restaurantReq.request.method).toBe('PUT');
    restaurantReq.flush({
      id: restaurantId,
      slug: 'restaurant-a',
      nameAr: 'مطعم',
      phoneNumber: '+966500000000',
      isActive: true,
      ownerId: 'o',
    });

    await promise;
    httpMock.expectNone(
      `${API_BASE_URL}/api/v1/admin/restaurants/${restaurantId}/settings`,
    );
  });
});
