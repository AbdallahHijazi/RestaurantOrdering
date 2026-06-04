import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { describe, expect, it, beforeEach } from 'vitest';
import { LocaleService } from '../../../core/localization/locale';
import { PublicCheckoutPanel } from '../../public-menu/components/public-checkout-panel/public-checkout-panel';
import { PublicCartService } from '../../public-menu/data-access/public-cart.service';
import { MOCK_PUBLIC_MENU } from '../../public-menu/data-access/public-menu-mock.data';
import {
  ORDER_TYPE_DELIVERY,
  ORDER_TYPE_PICKUP,
} from '../../public-menu/models/public-menu.models';
import { estimateOrderTotals } from '../../public-menu/utils/order-estimate.util';

describe('Profile settings checkout regression', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [PublicCheckoutPanel, FormsModule],
    });
    TestBed.inject(LocaleService).setLocale('en');
  });

  it('pickup-only settings auto-select pickup', () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'demo');
    fixture.componentRef.setInput('orderSettings', {
      ...MOCK_PUBLIC_MENU.orderSettings,
      isPickupEnabled: true,
      isDeliveryEnabled: false,
    });
    fixture.detectChanges();
    expect(fixture.componentInstance['orderType']()).toBe(ORDER_TYPE_PICKUP);
  });

  it('delivery-only settings auto-select delivery and show address', () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'demo');
    fixture.componentRef.setInput('orderSettings', {
      ...MOCK_PUBLIC_MENU.orderSettings,
      isPickupEnabled: false,
      isDeliveryEnabled: true,
      deliveryFee: 9,
    });
    fixture.detectChanges();
    expect(fixture.componentInstance['orderType']()).toBe(ORDER_TYPE_DELIVERY);
    expect(fixture.nativeElement.querySelector('[name="deliveryAddress"]')).toBeTruthy();
  });

  it('minimum order blocks submit', () => {
    const cart = TestBed.inject(PublicCartService);
    cart.initForRestaurant('demo');
    cart.addMenuItem(MOCK_PUBLIC_MENU.items[0]!);

    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'demo');
    fixture.componentRef.setInput('orderSettings', {
      ...MOCK_PUBLIC_MENU.orderSettings,
      minimumOrderAmount: 10_000,
    });
    fixture.detectChanges();

    fixture.componentInstance['guestName'].set('Guest');
    fixture.componentInstance['guestPhone'].set('+966500000000');
    fixture.detectChanges();

    expect(fixture.componentInstance['canSubmit']()).toBe(false);
  });

  it('tax rate changes estimated tax', () => {
    const lines = [{ price: 25, discountPrice: 20, quantity: 2 }];
    const lowTax = estimateOrderTotals(
      lines,
      { taxRate: 5, deliveryFee: 0 },
      ORDER_TYPE_PICKUP,
    );
    const highTax = estimateOrderTotals(
      lines,
      { taxRate: 20, deliveryFee: 0 },
      ORDER_TYPE_PICKUP,
    );
    expect(highTax.estimatedTax).toBeGreaterThan(lowTax.estimatedTax);
  });

  it('delivery fee appears in estimated totals', () => {
    const result = estimateOrderTotals(
      [{ price: 30, quantity: 1 }],
      { taxRate: 10, deliveryFee: 7 },
      ORDER_TYPE_DELIVERY,
    );
    expect(result.deliveryFee).toBe(7);
  });
});
