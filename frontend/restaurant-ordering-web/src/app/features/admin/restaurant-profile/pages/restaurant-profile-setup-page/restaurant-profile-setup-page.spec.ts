import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { API_BASE_URL } from '../../../../../core/config/api-config';
import { AuthService } from '../../../../../core/auth/auth.service';
import { LocaleService } from '../../../../../core/localization/locale';
import { RestaurantProfileSetupPage } from './restaurant-profile-setup-page';

const RESTAURANT_ID = 'aaaaaaaa-1111-1111-1111-111111111111';

describe('RestaurantProfileSetupPage', () => {
  let fixture: ComponentFixture<RestaurantProfileSetupPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantProfileSetupPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { restaurantId: () => RESTAURANT_ID },
        },
      ],
    }).compileComponents();

    TestBed.inject(LocaleService).setLocale('en');
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RestaurantProfileSetupPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushLoadedSettings(): void {
    const restaurantReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`,
    );
    restaurantReq.flush({
      id: RESTAURANT_ID,
      ownerId: 'o',
      slug: 'restaurant-a',
      nameAr: 'مطعم',
      nameEn: 'Restaurant',
      phoneNumber: '+966500000000',
      isActive: true,
    });

    const settingsReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/settings`,
    );
    settingsReq.flush({
      id: 's',
      restaurantId: RESTAURANT_ID,
      currencyCode: 'SAR',
      timeZone: 'Asia/Riyadh',
      taxRate: 15,
      deliveryFee: 12,
      minimumOrderAmount: 25,
      isDeliveryEnabled: true,
      isPickupEnabled: false,
      workingHoursJson: '{"sat":"10-22"}',
    });

    fixture.detectChanges();
  }

  it('loads settings into the form from GET', () => {
    flushLoadedSettings();
    expect(fixture.componentInstance.form.controls.taxRate.value).toBe(15);
    expect(fixture.componentInstance.form.controls.deliveryFee.value).toBe(12);
    expect(fixture.componentInstance.form.controls.minimumOrderAmount.value).toBe(25);
    expect(fixture.componentInstance.form.controls.isPickupEnabled.value).toBe(false);
  });

  it('shows delivery settings section toggles', () => {
    flushLoadedSettings();
    const section = fixture.nativeElement.querySelector(
      '[data-testid="profile-delivery-settings"]',
    ) as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.textContent).toContain('Delivery and ordering settings');
  });

  it('rejects negative delivery fee', () => {
    flushLoadedSettings();
    fixture.componentInstance.form.controls.deliveryFee.setValue(-1);
    fixture.componentInstance.form.markAllAsTouched();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.deliveryFee.invalid).toBe(true);
  });

  it('rejects tax rate above 100', () => {
    flushLoadedSettings();
    fixture.componentInstance.form.controls.taxRate.setValue(101);
    fixture.componentInstance.form.markAllAsTouched();
    expect(fixture.componentInstance.form.controls.taxRate.invalid).toBe(true);
  });

  it('rejects invalid currency code', () => {
    flushLoadedSettings();
    fixture.componentInstance.form.controls.currencyCode.setValue('SA');
    fixture.componentInstance.form.markAllAsTouched();
    expect(fixture.componentInstance.form.controls.currencyCode.invalid).toBe(true);
  });

  it('blocks save when pickup and delivery are both disabled', () => {
    flushLoadedSettings();
    fixture.componentInstance.form.patchValue({
      isPickupEnabled: false,
      isDeliveryEnabled: false,
    });
    fixture.componentInstance.form.markAllAsTouched();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'At least one ordering method must be enabled',
    );
  });

  it('shows settings load error and retry without using defaults', () => {
    const restaurantReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`,
    );
    restaurantReq.flush({
      id: RESTAURANT_ID,
      ownerId: 'o',
      slug: 'restaurant-a',
      nameAr: 'مطعم',
      phoneNumber: '+966500000000',
      isActive: true,
    });

    const settingsReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/settings`,
    );
    settingsReq.flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not load restaurant settings');
    const settingsSaveButton = fixture.nativeElement.querySelector(
      '[data-testid="profile-save-ordering-settings"]',
    ) as HTMLButtonElement;
    expect(settingsSaveButton.disabled).toBe(true);
  });

  it('saves restaurant profile independently from ordering settings', () => {
    flushLoadedSettings();
    fixture.componentInstance.form.controls.nameAr.setValue('مطعم محدث');
    (
      fixture.nativeElement.querySelector(
        '[data-testid="profile-save-restaurant"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const restaurantReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`,
    );
    expect(restaurantReq.request.method).toBe('PUT');
    restaurantReq.flush({
      id: RESTAURANT_ID,
      ownerId: 'o',
      slug: 'restaurant-a',
      nameAr: 'مطعم محدث',
      phoneNumber: '+966500000000',
      isActive: true,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Restaurant profile saved successfully');
    httpMock.expectNone(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/settings`,
    );
  });

  it('saves ordering settings independently from restaurant profile', () => {
    flushLoadedSettings();
    fixture.componentInstance.form.controls.taxRate.setValue(9);
    (
      fixture.nativeElement.querySelector(
        '[data-testid="profile-save-ordering-settings"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const settingsReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/settings`,
    );
    expect(settingsReq.request.method).toBe('PUT');
    expect(settingsReq.request.body.taxRate).toBe(9);
    settingsReq.flush({
      id: 's',
      restaurantId: RESTAURANT_ID,
      currencyCode: 'SAR',
      timeZone: 'Asia/Riyadh',
      taxRate: 9,
      deliveryFee: 12,
      minimumOrderAmount: 25,
      isDeliveryEnabled: true,
      isPickupEnabled: false,
      workingHoursJson: '{"sat":"10-22"}',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Delivery and ordering settings saved successfully',
    );
    httpMock.expectNone(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`);
  });

  it('uses RTL labels in Arabic locale', () => {
    flushLoadedSettings();
    TestBed.inject(LocaleService).setLocale('ar');
    fixture.detectChanges();
    expect(document.documentElement.dir).toBe('rtl');
    expect(fixture.nativeElement.textContent).toContain('إعدادات التوصيل والطلبات');
  });
});
