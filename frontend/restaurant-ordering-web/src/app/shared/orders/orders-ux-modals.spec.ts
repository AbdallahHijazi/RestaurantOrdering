import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleService } from '../../core/localization/locale';
import { PublicOrderConfirmation } from '../../features/public-menu/components/public-order-confirmation/public-order-confirmation';
import {
  ORDER_TYPE_DELIVERY,
  ORDER_TYPE_PICKUP,
} from '../../features/public-menu/models/public-menu.models';

describe('Orders UX modals', () => {
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

    it('renders inside order modal shell when open', () => {
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('confirmation', baseConfirmation());
      fixture.detectChanges();

      expect(
        document.body.querySelector('[data-testid="public-order-confirmation-modal"]'),
      ).toBeTruthy();
    });

    it('shows subtotal and total with Latin currency formatting', () => {
      locale.setLocale('ar');
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('confirmation', baseConfirmation());
      fixture.detectChanges();

      const text = (document.body.textContent ?? fixture.nativeElement.textContent) ?? '';
      expect(text).toContain('$10.00');
      expect(text).not.toMatch(/[٠-٩]/);
    });

    it('hides zero discount and tax rows but shows delivery fee when > 0', () => {
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('confirmation', {
        ...baseConfirmation(),
        orderType: ORDER_TYPE_DELIVERY,
        discountAmount: 0,
        taxAmount: 0,
        deliveryFee: 5,
      });
      fixture.detectChanges();

      const labels = Array.from(
        document.body.querySelectorAll('.order-financial-summary dt'),
      ).map((element) => (element as HTMLElement).textContent?.trim());

      expect(labels).not.toContain(locale.uiText('publicConfirmationDiscount'));
      expect(labels).not.toContain(locale.uiText('publicConfirmationTax'));
      expect(labels).toContain(locale.uiText('publicConfirmationDeliveryFee'));
    });

    it('emits closed on escape via modal shell', () => {
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('confirmation', baseConfirmation());
      fixture.detectChanges();

      const closed = vi.fn();
      fixture.componentInstance.closed.subscribe(closed);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(closed).toHaveBeenCalled();
    });

    it('does not render when open is false', () => {
      fixture.componentRef.setInput('open', false);
      fixture.componentRef.setInput('confirmation', baseConfirmation());
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('[data-testid="public-order-confirmation-modal"]'),
      ).toBeNull();
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
