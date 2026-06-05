import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleService } from '../../core/localization/locale';
import { PublicOrderConfirmation } from '../../features/public-menu/components/public-order-confirmation/public-order-confirmation';
import { ORDER_TYPE_PICKUP } from '../../features/public-menu/models/public-menu.models';
import { isCurrencyCodeValid } from '../../features/admin/restaurant-profile/data-access/restaurant-profile-settings.util';
import { formatOrderCurrency } from './order-money.util';
import { shouldShowFinancialAmount } from './order-display.util';

describe('5F.6.1 UX fixes', () => {
  describe('currency formatting', () => {
    it('formats USD with narrow symbol', () => {
      expect(formatOrderCurrency(0.1, 'USD')).toBe('$0.10');
    });

    it('formats EUR with currency symbol', () => {
      const formatted = formatOrderCurrency(12, 'EUR');
      expect(formatted).toMatch(/€/);
      expect(formatted).toContain('12.00');
    });

    it('falls back safely for invalid currency codes', () => {
      expect(formatOrderCurrency(1, 'INVALID')).toBe('INVALID 1.00');
      expect(() => formatOrderCurrency(1, 'INVALID')).not.toThrow();
    });

    it('rejects currency symbols in validation', () => {
      expect(isCurrencyCodeValid('$')).toBe(false);
      expect(isCurrencyCodeValid('USD')).toBe(true);
      expect(isCurrencyCodeValid('SYP')).toBe(true);
    });
  });

  describe('zero financial rows', () => {
    it('hides discount, tax, and zero delivery fee', () => {
      expect(shouldShowFinancialAmount(0)).toBe(false);
      expect(shouldShowFinancialAmount(5)).toBe(true);
    });
  });

  describe('PublicOrderConfirmation', () => {
    let fixture: ComponentFixture<PublicOrderConfirmation>;
    let locale: LocaleService;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [PublicOrderConfirmation],
      }).compileComponents();

      locale = TestBed.inject(LocaleService);
      fixture = TestBed.createComponent(PublicOrderConfirmation);
    });

    afterEach(() => {
      document.body.classList.remove('order-modal-scroll-lock');
      document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
      locale.setLocale('ar');
    });

    it('uses order modal shell without legacy drawer wrapper', () => {
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('confirmation', baseConfirmation());
      fixture.detectChanges();

      expect(
        document.body.querySelector('[data-testid="public-order-confirmation-modal"]'),
      ).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.kitchen-details')).toBeNull();
      expect(fixture.nativeElement.querySelector('.kitchen-details__panel')).toBeNull();
    });

    it('shows USD as $ in Arabic locale', () => {
      locale.setLocale('ar');
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('confirmation', baseConfirmation());
      fixture.detectChanges();

      const text = document.body.textContent ?? '';
      expect(text).toContain('$10.00');
      expect(text).not.toMatch(/[٠-٩]/);
    });

    it('wraps order number and phone in bdi ltr when present', () => {
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('confirmation', {
        ...baseConfirmation(),
        guestPhone: '+963912345678',
      });
      fixture.detectChanges();

      const bdis = Array.from(document.body.querySelectorAll('bdi[dir="ltr"]'));
      expect(bdis.length).toBeGreaterThan(0);
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
