import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleService } from '../../core/localization/locale';
import { RestaurantLivePreview } from '../../features/admin/restaurant-profile/components/restaurant-live-preview/restaurant-live-preview';
import { PublicOrderConfirmation } from '../../features/public-menu/components/public-order-confirmation/public-order-confirmation';
import { ORDER_TYPE_PICKUP } from '../../features/public-menu/models/public-menu.models';
import { formatOrderCurrency } from '../orders/order-money.util';
import type { RestaurantProfilePreviewData } from '../../features/admin/restaurant-profile/models/restaurant-profile.models';

const PREVIEW: RestaurantProfilePreviewData = {
  slug: 'demo',
  nameAr: 'عالم النبات',
  nameEn: 'The Botanist',
  descriptionAr: 'وصف',
  descriptionEn: 'Description',
  logoUrl: null,
  coverImageUrl: null,
  primaryAccentColor: '#B8663F',
  countryCode: 'SA',
  currencyCode: 'SAR',
  timeZone: 'Asia/Riyadh',
  phoneNumber: '+966501234567',
  whatsAppNumber: '+966501234567',
  addressAr: 'الرياض',
  addressEn: 'Riyadh',
};

const PREVIEW_CATALOG = {
  categories: [
    {
      id: 'cat-preview',
      nameAr: 'تصنيف',
      nameEn: 'Category',
      displayOrder: 0,
      isActive: true,
    },
  ],
  items: [
    {
      id: 'item-preview',
      categoryId: 'cat-preview',
      nameAr: 'وجبة',
      nameEn: 'Dish',
      price: 20,
      isAvailable: true,
    },
  ],
};

function bindPreviewCatalog(
  fixture: ComponentFixture<RestaurantLivePreview>,
): void {
  fixture.componentRef.setInput('menuState', 'loaded');
  fixture.componentRef.setInput('categories', PREVIEW_CATALOG.categories);
  fixture.componentRef.setInput('items', PREVIEW_CATALOG.items);
}

function cleanupModals(): void {
  document.body.classList.remove('order-modal-scroll-lock');
  document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
}

describe('5F.6.2 modal overlay polish', () => {
  describe('modal-close-button class', () => {
    afterEach(() => {
      cleanupModals();
      TestBed.inject(LocaleService).setLocale('ar');
    });

    it('uses modal-close-button on public confirmation', () => {
      const fixture = TestBed.createComponent(PublicOrderConfirmation);
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('confirmation', baseConfirmation());
      fixture.detectChanges();

      const close = document.body.querySelector('[data-testid="order-modal-close"]');
      expect(close?.classList.contains('modal-close-button')).toBe(true);
    });

    it('uses modal-close-button on preview close', () => {
      const fixture = TestBed.createComponent(RestaurantLivePreview);
      fixture.componentRef.setInput('preview', PREVIEW);
      bindPreviewCatalog(fixture);
      fixture.detectChanges();
      (fixture.componentInstance as RestaurantLivePreview & { openFullPreview(): void }).openFullPreview();
      fixture.detectChanges();

      const close = document.body.querySelector('[data-testid="live-preview-close"]');
      expect(close?.classList.contains('modal-close-button')).toBe(true);
    });
  });

  describe('modal overlay markup', () => {
    it('renders shared modal-overlay class on backdrop', () => {
      const fixture = TestBed.createComponent(PublicOrderConfirmation);
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('confirmation', baseConfirmation());
      fixture.detectChanges();

      const backdrop = document.body.querySelector('[data-testid="order-modal-backdrop"]');
      expect(backdrop?.classList.contains('modal-overlay')).toBe(true);
    });
  });

  describe('overflow helpers', () => {
    it('hides category strip scrollbar visually while keeping overflow-x auto', () => {
      const fixture = TestBed.createComponent(RestaurantLivePreview);
      fixture.componentRef.setInput('preview', PREVIEW);
      bindPreviewCatalog(fixture);
      fixture.detectChanges();
      (fixture.componentInstance as RestaurantLivePreview & { openFullPreview(): void }).openFullPreview();
      fixture.detectChanges();

      const scroll = document.body.querySelector('.category-nav__scroll') as HTMLElement | null;
      expect(scroll).toBeTruthy();
      expect(getComputedStyle(scroll!).overflowX).toBe('auto');
      expect(getComputedStyle(scroll!).scrollbarWidth).toBe('none');
    });

    it('preview body uses overflow-x hidden', () => {
      const fixture = TestBed.createComponent(RestaurantLivePreview);
      fixture.componentRef.setInput('preview', PREVIEW);
      bindPreviewCatalog(fixture);
      fixture.detectChanges();
      (fixture.componentInstance as RestaurantLivePreview & { openFullPreview(): void }).openFullPreview();
      fixture.detectChanges();

      const body = document.body.querySelector('.live-preview__modal-body') as HTMLElement | null;
      expect(body).toBeTruthy();
      expect(getComputedStyle(body!).overflowX).toBe('hidden');
    });
  });

  describe('currency regression', () => {
    it('still formats USD with narrow symbol', () => {
      expect(formatOrderCurrency(0.1, 'USD')).toBe('$0.10');
    });
  });
});

function baseConfirmation() {
  return {
    orderId: '11111111-1111-1111-1111-111111111111',
    orderNumber: 'ORD-7F29134F948B4E60',
    orderType: ORDER_TYPE_PICKUP,
    orderStatus: 1,
    subtotal: 10,
    discountAmount: 0,
    taxAmount: 0,
    deliveryFee: 0,
    totalAmount: 10,
    currencyCode: 'USD',
    createdAt: '2026-06-04T12:23:00.000Z',
    items: [
      {
        itemNameAr: 'وجبة',
        itemNameEn: 'Meal',
        unitPrice: 10,
        quantity: 1,
        totalPrice: 10,
        notes: null,
      },
    ],
  };
}
