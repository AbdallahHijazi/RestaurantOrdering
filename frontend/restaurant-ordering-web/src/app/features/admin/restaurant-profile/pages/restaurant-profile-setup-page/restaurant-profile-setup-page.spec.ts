import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { API_BASE_URL } from '../../../../../core/config/api-config';
import { AuthService } from '../../../../../core/auth/auth.service';
import { LocaleService } from '../../../../../core/localization/locale';
import { RestaurantProfileSetupPage } from './restaurant-profile-setup-page';

const RESTAURANT_ID = 'aaaaaaaa-1111-1111-1111-111111111111';

const PROFILE_CONTROL_NAMES = [
  'nameAr',
  'nameEn',
  'descriptionAr',
  'descriptionEn',
  'slug',
  'primaryAccentColor',
  'countryCode',
  'defaultLocale',
  'supportedLocales',
  'phoneCountryCode',
  'phoneNumber',
  'whatsAppNumber',
  'email',
  'city',
  'addressAr',
  'addressEn',
] as const;

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
    TestBed.resetTestingModule();
  });

  function flushLoadedSettings(menuDto?: Record<string, unknown>): void {
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

    const menuReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/menu`,
    );
    menuReq.flush(
      menuDto ?? {
        id: RESTAURANT_ID,
        slug: 'restaurant-a',
        nameAr: 'مطعم',
        nameEn: 'Restaurant',
        phoneNumber: '+966500000000',
        categories: [],
      },
    );

    fixture.detectChanges();
  }

  function selectTab(tab: string): void {
    (
      fixture.nativeElement.querySelector(`[data-testid="profile-tab-${tab}"]`) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
  }

  it('keeps all existing profile form controls', () => {
    flushLoadedSettings();
    for (const name of PROFILE_CONTROL_NAMES) {
      expect(fixture.componentInstance.form.controls[name]).toBeTruthy();
    }
  });

  it('loads settings into the form from GET', () => {
    flushLoadedSettings();
    expect(fixture.componentInstance.form.controls.taxRate.value).toBe(15);
    expect(fixture.componentInstance.form.controls.deliveryFee.value).toBe(12);
    expect(fixture.componentInstance.form.controls.minimumOrderAmount.value).toBe(25);
    expect(fixture.componentInstance.form.controls.isPickupEnabled.value).toBe(false);
  });

  it('shows profile console tabs without page header actions', () => {
    flushLoadedSettings();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-workspace-header"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-tabs"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tab-identity"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tab-localization"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tab-contact"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tab-delivery"]')).toBeTruthy();
  });

  it('switches tab panels and updates aria-selected', () => {
    flushLoadedSettings();
    selectTab('delivery');
    const deliveryTab = fixture.nativeElement.querySelector(
      '[data-testid="profile-tab-delivery"]',
    ) as HTMLButtonElement;
    expect(deliveryTab.getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelector('[data-testid="profile-delivery-settings"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-identity"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-localization"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-contact"]')).toBeNull();
  });

  it('shows identity panel by default and hides other panels', () => {
    flushLoadedSettings();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-identity"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-localization"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-contact"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-delivery-settings"]')).toBeNull();
  });

  it('shows localization panel only when localization tab is selected', () => {
    flushLoadedSettings();
    selectTab('localization');
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-localization"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-identity"]')).toBeNull();
  });

  it('shows contact panel only when contact tab is selected', () => {
    flushLoadedSettings();
    selectTab('contact');
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-contact"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-tabpanel-identity"]')).toBeNull();
  });

  it('shows delivery settings toggles inside delivery tab', () => {
    flushLoadedSettings();
    selectTab('delivery');
    const section = fixture.nativeElement.querySelector(
      '[data-testid="profile-delivery-settings"]',
    ) as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.textContent).toContain('Enable pickup');
  });

  it('shows preview studio with live preview component', () => {
    flushLoadedSettings();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-preview-studio"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-restaurant-live-preview')).toBeTruthy();
  });

  it('shows preview sync status in preview studio', () => {
    flushLoadedSettings();
    expect(fixture.nativeElement.textContent).toContain('Live sync');
    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-sync-status"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-refresh"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="live-preview-full"]')).toBeTruthy();
  });

  it('keeps preview locale when admin interface locale changes', () => {
    flushLoadedSettings({
      id: RESTAURANT_ID,
      slug: 'restaurant-a',
      nameAr: 'مطعم',
      nameEn: 'Restaurant',
      phoneNumber: '+966500000000',
      categories: [
        {
          id: 'cat-real',
          nameAr: 'تصنيف فعلي',
          nameEn: 'Real Category',
          displayOrder: 0,
          items: [
            {
              id: 'item-real',
              categoryId: 'cat-real',
              nameAr: 'وجبة فعلية',
              nameEn: 'Real Dish',
              price: 42,
              displayOrder: 0,
            },
          ],
        },
      ],
    });
    expect(fixture.nativeElement.textContent).toContain('وجبة فعلية');

    TestBed.inject(LocaleService).setLocale('ar');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('وجبة فعلية');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('marks unsaved changes when profile form is dirty', () => {
    flushLoadedSettings();
    fixture.componentInstance.form.controls.nameAr.setValue('Updated name');
    fixture.componentInstance.form.markAsDirty();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unsaved changes');
  });

  it('renders publish in secondary subheader and keeps it disabled', () => {
    flushLoadedSettings();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-subheader"]')).toBeTruthy();
    const publishButton = fixture.nativeElement.querySelector(
      '[data-testid="profile-publish-live"]',
    ) as HTMLButtonElement;
    expect(publishButton.disabled).toBe(true);
    expect(publishButton.getAttribute('aria-disabled')).toBe('true');
    expect(fixture.nativeElement.querySelector('[data-testid="profile-publish-hint"]')).toBeTruthy();
  });

  it('does not send HTTP when disabled publish is clicked', () => {
    flushLoadedSettings();
    const publishButton = fixture.nativeElement.querySelector(
      '[data-testid="profile-publish-live"]',
    ) as HTMLButtonElement;
    publishButton.click();
    httpMock.expectNone(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/publish`);
  });

  it('rejects negative delivery fee', () => {
    flushLoadedSettings();
    selectTab('delivery');
    fixture.componentInstance.form.controls.deliveryFee.setValue(-1);
    fixture.componentInstance.form.markAllAsTouched();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.deliveryFee.invalid).toBe(true);
  });

  it('rejects tax rate above 100', () => {
    flushLoadedSettings();
    selectTab('delivery');
    fixture.componentInstance.form.controls.taxRate.setValue(101);
    fixture.componentInstance.form.markAllAsTouched();
    expect(fixture.componentInstance.form.controls.taxRate.invalid).toBe(true);
  });

  it('rejects invalid currency code', () => {
    flushLoadedSettings();
    selectTab('delivery');
    fixture.componentInstance.form.controls.currencyCode.setValue('SA');
    fixture.componentInstance.form.markAllAsTouched();
    expect(fixture.componentInstance.form.controls.currencyCode.invalid).toBe(true);
  });

  it('blocks save when pickup and delivery are both disabled', () => {
    flushLoadedSettings();
    selectTab('delivery');
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
    selectTab('delivery');
    const settingsSaveButton = fixture.nativeElement.querySelector(
      '[data-testid="profile-save-ordering-settings"]',
    ) as HTMLButtonElement;
    expect(settingsSaveButton.disabled).toBe(true);
  });

  it('saves restaurant profile independently from ordering settings', () => {
    flushLoadedSettings();
    fixture.componentInstance.form.controls.nameAr.setValue('مطعم محدث');
    fixture.componentInstance.form.markAsDirty();
    (
      fixture.nativeElement.querySelector(
        '[data-testid="profile-save-identity"]',
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

    const reloadRestaurantReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`,
    );
    reloadRestaurantReq.flush({
      id: RESTAURANT_ID,
      ownerId: 'o',
      slug: 'restaurant-a',
      nameAr: 'مطعم محدث',
      phoneNumber: '+966500000000',
      isActive: true,
    });

    const reloadSettingsReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/settings`,
    );
    reloadSettingsReq.flush({
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

    const menuReloadReq = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/menu`,
    );
    menuReloadReq.flush({
      id: RESTAURANT_ID,
      slug: 'restaurant-a',
      nameAr: 'مطعم محدث',
      nameEn: 'Restaurant',
      phoneNumber: '+966500000000',
      categories: [],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Restaurant profile saved successfully');
    httpMock.expectNone(
      `${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/settings`,
    );
  });

  it('shows profile save button in identity panel', () => {
    flushLoadedSettings();
    const saveButton = fixture.nativeElement.querySelector('[data-testid="profile-save-identity"]');
    expect(saveButton).toBeTruthy();
    expect(saveButton?.textContent).toContain('Save identity changes');
  });

  it('saves ordering settings independently from restaurant profile', () => {
    flushLoadedSettings();
    selectTab('delivery');
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
    selectTab('delivery');
    expect(fixture.nativeElement.textContent).toContain('إعدادات التوصيل والطلبات');
  });

  it('supports keyboard tab navigation with Home and End', () => {
    flushLoadedSettings();
    const contactTab = fixture.nativeElement.querySelector(
      '[data-testid="profile-tab-contact"]',
    ) as HTMLButtonElement;
    contactTab.focus();
    contactTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(
      (
        fixture.nativeElement.querySelector('[data-testid="profile-tab-identity"]') as HTMLButtonElement
      ).getAttribute('aria-selected'),
    ).toBe('true');

    contactTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(
      (
        fixture.nativeElement.querySelector('[data-testid="profile-tab-delivery"]') as HTMLButtonElement
      ).getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('supports keyboard tab navigation with ArrowLeft and ArrowRight', () => {
    flushLoadedSettings();
    selectTab('localization');
    const localizationTab = fixture.nativeElement.querySelector(
      '[data-testid="profile-tab-localization"]',
    ) as HTMLButtonElement;
    localizationTab.focus();
    localizationTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(
      (
        fixture.nativeElement.querySelector('[data-testid="profile-tab-contact"]') as HTMLButtonElement
      ).getAttribute('aria-selected'),
    ).toBe('true');

    localizationTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(
      (
        fixture.nativeElement.querySelector('[data-testid="profile-tab-identity"]') as HTMLButtonElement
      ).getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('reverses ArrowLeft and ArrowRight tab navigation in RTL', () => {
    flushLoadedSettings();
    TestBed.inject(LocaleService).setLocale('ar');
    fixture.detectChanges();
    selectTab('localization');
    const localizationTab = fixture.nativeElement.querySelector(
      '[data-testid="profile-tab-localization"]',
    ) as HTMLButtonElement;
    localizationTab.focus();
    localizationTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(
      (
        fixture.nativeElement.querySelector('[data-testid="profile-tab-identity"]') as HTMLButtonElement
      ).getAttribute('aria-selected'),
    ).toBe('true');

    localizationTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(
      (
        fixture.nativeElement.querySelector('[data-testid="profile-tab-contact"]') as HTMLButtonElement
      ).getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('exposes editor and preview studio regions for desktop layout', () => {
    flushLoadedSettings();
    expect(fixture.nativeElement.querySelector('.profile-console__workspace')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="profile-preview-studio"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.profile-console__editor')).toBeTruthy();
    const previewStudio = fixture.nativeElement.querySelector(
      '[data-testid="profile-preview-studio"]',
    ) as HTMLElement;
    expect(previewStudio.classList.contains('profile-console__preview-studio')).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="profile-console-main"]')).toBeTruthy();
  });

  it('keeps slug and accent inputs LTR', () => {
    flushLoadedSettings();
    TestBed.inject(LocaleService).setLocale('ar');
    fixture.detectChanges();
    const slugInput = fixture.nativeElement.querySelector('[formcontrolname="slug"]') as HTMLElement;
    const accentInput = fixture.nativeElement.querySelector(
      '[formcontrolname="primaryAccentColor"]',
    ) as HTMLElement;
    expect(slugInput.closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(accentInput.closest('bdi')?.getAttribute('dir')).toBe('ltr');
  });
});
