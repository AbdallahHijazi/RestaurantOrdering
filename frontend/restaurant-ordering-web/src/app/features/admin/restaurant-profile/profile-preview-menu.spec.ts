import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api-config';
import { AuthService } from '../../../core/auth/auth.service';
import { LocaleService } from '../../../core/localization/locale';
import { MOCK_PUBLIC_MENU } from '../../public-menu/data-access/public-menu-mock.data';
import { RestaurantLivePreview } from './components/restaurant-live-preview/restaurant-live-preview';
import { RestaurantProfileSetupPage } from './pages/restaurant-profile-setup-page/restaurant-profile-setup-page';
import type { RestaurantProfilePreviewData } from './models/restaurant-profile.models';

const RESTAURANT_ID = 'aaaaaaaa-1111-1111-1111-111111111111';

const PREVIEW: RestaurantProfilePreviewData = {
  slug: 'restaurant-a',
  nameAr: 'مطعم حقيقي',
  nameEn: 'Real Restaurant',
  descriptionAr: null,
  descriptionEn: null,
  logoUrl: null,
  coverImageUrl: null,
  primaryAccentColor: '#B8663F',
  countryCode: 'SA',
  currencyCode: 'SAR',
  timeZone: 'Asia/Riyadh',
  phoneNumber: '+966500000000',
  whatsAppNumber: null,
  addressAr: 'الرياض',
  addressEn: 'Riyadh',
};

const REAL_MENU_DTO = {
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
};

describe('Profile preview menu (5F.6.3)', () => {
  describe('RestaurantProfileSetupPage', () => {
    let fixture: ComponentFixture<RestaurantProfileSetupPage>;
    let httpMock: HttpTestingController;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [RestaurantProfileSetupPage],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: AuthService, useValue: { restaurantId: () => RESTAURANT_ID } },
        ],
      }).compileComponents();

      TestBed.inject(LocaleService).setLocale('en');
      httpMock = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(RestaurantProfileSetupPage);
    });

    afterEach(() => {
      httpMock.verify();
    });

    function flushProfileAndMenu(): void {
      fixture.detectChanges();
      httpMock
        .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}`)
        .flush({
          id: RESTAURANT_ID,
          ownerId: 'o',
          slug: 'restaurant-a',
          nameAr: 'مطعم',
          nameEn: 'Restaurant',
          phoneNumber: '+966500000000',
          isActive: true,
        });

      httpMock
        .expectOne(`${API_BASE_URL}/api/v1/admin/restaurants/${RESTAURANT_ID}/settings`)
        .flush({
          id: 's',
          restaurantId: RESTAURANT_ID,
          currencyCode: 'SAR',
          timeZone: 'Asia/Riyadh',
          taxRate: 15,
          deliveryFee: 12,
          minimumOrderAmount: 25,
          isDeliveryEnabled: true,
          isPickupEnabled: false,
          workingHoursJson: null,
        });

      httpMock
        .expectOne(`${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/menu`)
        .flush(REAL_MENU_DTO);

      fixture.detectChanges();
    }

    it('fetches public menu for owner slug after profile load', () => {
      flushProfileAndMenu();
      httpMock.expectNone(`${API_BASE_URL}/api/v1/public/restaurants/demo/menu`);
      expect(fixture.componentInstance['previewMenuState']()).toBe('loaded');
      expect(fixture.nativeElement.textContent).toContain('وجبة فعلية');
      expect(fixture.nativeElement.textContent).not.toContain('Truffle Hummus');
    });

    it('does not render refresh preview button in studio toolbar', () => {
      flushProfileAndMenu();
      expect(fixture.nativeElement.querySelector('[data-testid="live-preview-refresh"]')).toBeNull();
    });

    it('shows empty preview state without mock dishes', () => {
      flushProfileAndMenu();

      fixture.componentInstance['refreshPreviewMenu']();
      fixture.detectChanges();

      httpMock
        .expectOne(`${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/menu`)
        .flush({
          ...REAL_MENU_DTO,
          categories: [],
        });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="live-preview-menu-empty"]')).toBeTruthy();
      expect(fixture.nativeElement.textContent).not.toContain('Truffle Hummus');
    });

    it('shows error preview state without mock fallback', () => {
      flushProfileAndMenu();

      fixture.componentInstance['refreshPreviewMenu']();
      fixture.detectChanges();

      httpMock
        .expectOne(`${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/menu`)
        .flush('fail', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="live-preview-menu-error"]')).toBeTruthy();
      expect(fixture.nativeElement.textContent).not.toContain('Truffle Hummus');
    });
  });

  describe('RestaurantLivePreview', () => {
    let fixture: ComponentFixture<RestaurantLivePreview>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [RestaurantLivePreview],
      }).compileComponents();

      fixture = TestBed.createComponent(RestaurantLivePreview);
      fixture.componentRef.setInput('preview', PREVIEW);
    });

    afterEach(() => {
      document.querySelector('[data-testid="live-preview-overlay-host"]')?.remove();
    });

    it('inline and full preview share the same real catalog items', () => {
      fixture.componentRef.setInput('menuState', 'loaded');
      fixture.componentRef.setInput('categories', [
        { id: 'cat-real', nameAr: 'تصنيف', nameEn: 'Category', displayOrder: 0, isActive: true },
      ]);
      fixture.componentRef.setInput('items', [
        {
          id: 'item-real',
          categoryId: 'cat-real',
          nameAr: 'وجبة فعلية',
          nameEn: 'Real Dish',
          price: 42,
          isAvailable: true,
        },
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('وجبة فعلية');

      (fixture.componentInstance as RestaurantLivePreview & { openFullPreview(): void }).openFullPreview();
      fixture.detectChanges();

      expect(document.body.textContent).toContain('وجبة فعلية');
      expect(document.body.textContent).not.toContain('Truffle Hummus');
    });
  });
});

describe('MOCK_PUBLIC_MENU scope', () => {
  it('remains available for explicit demo route only', () => {
    expect(MOCK_PUBLIC_MENU.items.some((item) => item.nameEn === 'Truffle Hummus')).toBe(true);
  });
});
