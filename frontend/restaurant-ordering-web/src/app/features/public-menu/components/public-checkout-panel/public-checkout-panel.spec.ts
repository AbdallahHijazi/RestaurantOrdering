import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { vi } from 'vitest';
import { LocaleService } from '../../../../core/localization/locale';
import { PublicCartService } from '../../data-access/public-cart.service';
import { MOCK_PUBLIC_MENU } from '../../data-access/public-menu-mock.data';
import {
  ORDER_TYPE_DELIVERY,
  ORDER_TYPE_DINE_IN,
  ORDER_TYPE_PICKUP,
} from '../../models/public-menu.models';
import { PublicCheckoutPanel } from './public-checkout-panel';

describe('PublicCheckoutPanel', () => {
  let fixture: ComponentFixture<PublicCheckoutPanel>;
  let cart: PublicCartService;
  const settings = MOCK_PUBLIC_MENU.orderSettings;
  const item = MOCK_PUBLIC_MENU.items[0]!;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [PublicCheckoutPanel, FormsModule],
    });
    TestBed.inject(LocaleService).setLocale('en');
    cart = TestBed.inject(PublicCartService);
    cart.initForRestaurant('restaurant-a');
    cart.addMenuItem(item);
    fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  function typeButtons(): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="public-checkout-type-pickup"], [data-testid="public-checkout-type-dine-in"], [data-testid="public-checkout-type-delivery"]',
      ),
    );
  }

  it('uses a narrower modal width near 704px', () => {
    const css = readFileSync(resolve(__dirname, 'public-checkout-panel.scss'), 'utf8');
    expect(css).toContain('44rem');
    expect(css).toContain('calc(100vw - 2rem)');
    expect(css).toContain('repeat(3, minmax(0, 1fr))');
  });

  it('renders pickup, dine-in, and delivery cards in order', () => {
    const buttons = typeButtons();
    expect(buttons).toHaveLength(3);
    expect(buttons[0]?.getAttribute('data-testid')).toBe('public-checkout-type-pickup');
    expect(buttons[1]?.getAttribute('data-testid')).toBe('public-checkout-type-dine-in');
    expect(buttons[2]?.getAttribute('data-testid')).toBe('public-checkout-type-delivery');
  });

  it('disables dine-in and shows helper without table context', () => {
    const dineIn = fixture.nativeElement.querySelector(
      '[data-testid="public-checkout-type-dine-in"]',
    ) as HTMLButtonElement;
    expect(dineIn.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="public-checkout-dine-in-helper"]')?.textContent).toContain(
      'Scan the QR code on your table',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="public-checkout-table-badge"]')).toBeNull();
  });

  it('enables and auto-selects dine-in with table badge when QR session exists', () => {
    cart.setTableSession(
      {
        tableId: '11111111-1111-1111-1111-111111111101',
        tableName: 'Table 5',
        zone: 'Terrace',
        restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      },
      'table-token-1',
    );
    fixture.detectChanges();

    const dineIn = fixture.nativeElement.querySelector(
      '[data-testid="public-checkout-type-dine-in"]',
    ) as HTMLButtonElement;
    expect(dineIn.disabled).toBe(false);
    expect(fixture.componentInstance['orderType']()).toBe(ORDER_TYPE_DINE_IN);
    expect(fixture.nativeElement.querySelector('[data-testid="public-checkout-table-badge"]')?.textContent).toContain(
      'Ordering for Table 5',
    );
    expect(fixture.nativeElement.querySelector('[name="deliveryAddress"]')).toBeNull();
  });

  it('shows delivery address only for delivery type', () => {
    expect(fixture.nativeElement.querySelector('[name="deliveryAddress"]')).toBeNull();
    (fixture.nativeElement.querySelector('[data-testid="public-checkout-type-delivery"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[name="deliveryAddress"]')).toBeTruthy();
  });

  it('includes tableToken only for dine-in submit payload', () => {
    cart.setTableSession(
      {
        tableId: '11111111-1111-1111-1111-111111111101',
        tableName: 'Table 5',
        zone: null,
        restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      },
      'table-token-1',
    );
    fixture.detectChanges();
    fixture.componentInstance['guestName'].set('Guest');
    fixture.componentInstance['guestPhone'].set('+966500000000');

    const dineInRequest = fixture.componentInstance['buildRequest']();
    expect(dineInRequest.orderType).toBe(ORDER_TYPE_DINE_IN);
    expect(dineInRequest.tableToken).toBe('table-token-1');

    fixture.componentInstance['selectPickup']();
    const pickupRequest = fixture.componentInstance['buildRequest']();
    expect(pickupRequest.orderType).toBe(ORDER_TYPE_PICKUP);
    expect(pickupRequest.tableToken).toBeNull();

    fixture.componentInstance['selectDelivery']();
    fixture.componentInstance['deliveryAddress'].set('123 Main St');
    const deliveryRequest = fixture.componentInstance['buildRequest']();
    expect(deliveryRequest.orderType).toBe(ORDER_TYPE_DELIVERY);
    expect(deliveryRequest.tableToken).toBeNull();
    expect(deliveryRequest.deliveryAddress).toBe('123 Main St');
  });

  it('keeps sticky header, scrollable body, and footer actions', () => {
    expect(fixture.nativeElement.querySelector('.public-checkout__header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.public-checkout__body')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.public-checkout__footer')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="public-checkout-submit"]')).toBeTruthy();
  });

  it('closes on escape', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toHaveBeenCalled();
  });
});
