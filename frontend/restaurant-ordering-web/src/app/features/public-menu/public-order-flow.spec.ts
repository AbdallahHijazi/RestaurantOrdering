import { describe, expect, it, vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { API_BASE_URL } from '../../core/config/api-config';
import { LocaleService } from '../../core/localization/locale';
import { PublicCartDrawer } from './components/public-cart-drawer/public-cart-drawer';
import { PublicCheckoutPanel } from './components/public-checkout-panel/public-checkout-panel';
import { PublicOrderConfirmation } from './components/public-order-confirmation/public-order-confirmation';
import { PublicCartService } from './data-access/public-cart.service';
import { PublicOrdersApiService } from './data-access/public-orders-api.service';
import { MOCK_PUBLIC_MENU } from './data-access/public-menu-mock.data';
import {
  ORDER_TYPE_DELIVERY,
  ORDER_TYPE_PICKUP,
} from './models/public-menu.models';

describe('Public order flow', () => {
  let httpMock: HttpTestingController;
  let cart: PublicCartService;

  const settings = MOCK_PUBLIC_MENU.orderSettings;
  const item = MOCK_PUBLIC_MENU.items[0]!;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [PublicCartDrawer, PublicCheckoutPanel, PublicOrderConfirmation, FormsModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(LocaleService).setLocale('en');
    httpMock = TestBed.inject(HttpTestingController);
    cart = TestBed.inject(PublicCartService);
    cart.initForRestaurant('restaurant-a');
    cart.addMenuItem(item);
  });

  afterEach(() => {
    document.body.classList.remove('order-modal-scroll-lock');
    document.querySelectorAll('app-modal-shell, app-order-modal-shell').forEach((node) => node.remove());
    TestBed.inject(LocaleService).setLocale('ar');
    httpMock.verify();
    sessionStorage.clear();
  });

  it('opens cart drawer and shows counter via service', async () => {
    const fixture = TestBed.createComponent(PublicCartDrawer);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    expect(cart.itemCount()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Your cart');
  });

  it('updates quantity from drawer controls', async () => {
    const fixture = TestBed.createComponent(PublicCartDrawer);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    const plus = fixture.nativeElement.querySelector(
      '.public-cart-drawer__qty-btn:last-child',
    ) as HTMLButtonElement;
    plus.click();
    fixture.detectChanges();

    expect(cart.quantityFor(item.id)).toBe(2);
  });

  it('shows empty cart state', async () => {
    cart.clearCart();
    const fixture = TestBed.createComponent(PublicCartDrawer);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Your cart is empty');
  });

  it('closes drawer on escape', async () => {
    const fixture = TestBed.createComponent(PublicCartDrawer);
    const closed = vi.fn();
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.componentInstance.closed.subscribe(closed);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toHaveBeenCalled();
  });

  it('hides delivery address for pickup checkout', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[name="deliveryAddress"]')).toBeNull();
  });

  it('shows delivery address for delivery checkout', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    fixture.componentInstance['selectDelivery']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[name="deliveryAddress"]')).toBeTruthy();
  });

  it('blocks submit when phone is missing', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    fixture.componentInstance['guestName'].set('Guest');
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector(
      '.public-checkout__primary',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('blocks submit when all services are disabled', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', {
      ...settings,
      isPickupEnabled: false,
      isDeliveryEnabled: false,
    });
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector(
      '.public-checkout__primary',
    ) as HTMLButtonElement;
    expect(submit).toBeFalsy();
  });

  it('blocks submit below minimum order', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', {
      ...settings,
      minimumOrderAmount: 10_000,
    });
    fixture.detectChanges();

    fixture.componentInstance['guestName'].set('Guest');
    fixture.componentInstance['guestPhone'].set('+966500000000');
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector(
      '.public-checkout__primary',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('shows estimated totals in checkout', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Estimated total');
  });

  it('submits request without financial fields', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    const ordersApi = TestBed.inject(PublicOrdersApiService);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    fixture.componentInstance['guestName'].set('Guest');
    fixture.componentInstance['guestPhone'].set('+966500000000');
    fixture.detectChanges();

    const request = fixture.componentInstance['buildRequest']();
    expect(request).toEqual({
      guestName: 'Guest',
      guestPhone: '+966500000000',
      orderType: ORDER_TYPE_PICKUP,
      deliveryAddress: null,
      deliveryLatitude: null,
      deliveryLongitude: null,
      notes: null,
      items: [
        {
          menuItemId: item.id,
          quantity: 1,
          notes: null,
        },
      ],
    });

    ordersApi.createOrder('restaurant-a', request).subscribe();
    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/orders`,
    );
    expect(req.request.body).not.toHaveProperty('subtotal');
    expect(req.request.body).not.toHaveProperty('totalAmount');
    req.flush({
      orderId: '22222222-2222-2222-2222-222222222222',
      orderNumber: 'ORD-1',
      orderType: ORDER_TYPE_PICKUP,
      orderStatus: 1,
      subtotal: 28,
      discountAmount: 0,
      taxAmount: 4.2,
      deliveryFee: 0,
      totalAmount: 32.2,
      currencyCode: 'SAR',
      createdAt: '2026-06-04T12:00:00Z',
      items: [],
    });
  });

  it('does not send duplicate menu item ids', () => {
    cart.addMenuItem(item);
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);

    const request = fixture.componentInstance['buildRequest']();
    const ids = request.items.map((line) => line.menuItemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('disables submit while request is in flight', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    fixture.componentInstance['guestName'].set('Guest');
    fixture.componentInstance['guestPhone'].set('+966500000000');
    fixture.detectChanges();

    fixture.componentInstance['submit']();
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector(
      '.public-checkout__primary',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/orders`,
    );
    req.flush({
      orderId: '22222222-2222-2222-2222-222222222222',
      orderNumber: 'ORD-1',
      orderType: ORDER_TYPE_PICKUP,
      orderStatus: 1,
      subtotal: 28,
      discountAmount: 0,
      taxAmount: 4.2,
      deliveryFee: 0,
      totalAmount: 32.2,
      currencyCode: 'SAR',
      createdAt: '2026-06-04T12:00:00Z',
      items: [],
    });
  });

  it('maps 400 errors to safe validation message', async () => {
    const ordersApi = TestBed.inject(PublicOrdersApiService);
  let message = '';
    ordersApi
      .createOrder('restaurant-a', {
        guestName: '',
        guestPhone: '',
        orderType: ORDER_TYPE_PICKUP,
        items: [],
      })
      .subscribe({
        error: (failure) => {
          message = failure.message || TestBed.inject(LocaleService).ui().publicOrderErrorValidation;
        },
      });

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/orders`,
    );
    req.flush(
      { detail: 'Guest name is required.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(message).toContain('Guest name');
  });

  it('keeps cart after failed submit', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    fixture.componentInstance['guestName'].set('Guest');
    fixture.componentInstance['guestPhone'].set('+966500000000');
    fixture.componentInstance['submit']();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/orders`,
    );
    req.flush({ detail: 'conflict' }, { status: 409, statusText: 'Conflict' });

    expect(cart.isEmpty()).toBe(false);
    expect(fixture.componentInstance['guestName']()).toBe('Guest');
  });

  it('clears cart after successful submit emission', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    fixture.componentInstance['guestName'].set('Guest');
    fixture.componentInstance['guestPhone'].set('+966500000000');
    fixture.componentInstance['submit']();

    const req = httpMock.expectOne(
      `${API_BASE_URL}/api/v1/public/restaurants/restaurant-a/orders`,
    );
    req.flush({
      orderId: '22222222-2222-2222-2222-222222222222',
      orderNumber: 'ORD-99',
      orderType: ORDER_TYPE_DELIVERY,
      orderStatus: 1,
      subtotal: 28,
      discountAmount: 0,
      taxAmount: 4.2,
      deliveryFee: 12,
      totalAmount: 44.2,
      currencyCode: 'SAR',
      createdAt: '2026-06-04T12:00:00Z',
      items: [
        {
          menuItemId: item.id,
          itemNameAr: item.nameAr,
          itemNameEn: item.nameEn,
          unitPrice: 28,
          quantity: 1,
          totalPrice: 28,
        },
      ],
    });

    expect(cart.isEmpty()).toBe(true);
  });

  it('renders confirmation from API response', async () => {
    const fixture = TestBed.createComponent(PublicOrderConfirmation);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('confirmation', {
      orderId: '22222222-2222-2222-2222-222222222222',
      orderNumber: 'ORD-99',
      orderType: ORDER_TYPE_PICKUP,
      orderStatus: 1,
      subtotal: 28,
      discountAmount: 0,
      taxAmount: 4.2,
      deliveryFee: 0,
      totalAmount: 32.2,
      currencyCode: 'SAR',
      createdAt: '2026-06-04T12:00:00Z',
      items: [],
    });
    fixture.detectChanges();

    expect(document.body.textContent).toContain('ORD-99');
    expect(document.body.textContent).toContain('Your order will be prepared shortly');
  });

  it('demo mode does not POST orders', async () => {
    const ordersApi = TestBed.inject(PublicOrdersApiService);
    let failed = false;

    ordersApi
      .createOrder('demo', {
        guestName: 'Guest',
        guestPhone: '+966500000000',
        orderType: ORDER_TYPE_PICKUP,
        items: [{ menuItemId: item.id, quantity: 1 }],
      })
      .subscribe({
        error: () => {
          failed = true;
        },
      });

    httpMock.expectNone(`${API_BASE_URL}/api/v1/public/restaurants/demo/orders`);
    expect(failed).toBe(true);
  });

  it('demo checkout shows preview notice and blocks submit', async () => {
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'demo');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    fixture.componentInstance['guestName'].set('Guest');
    fixture.componentInstance['guestPhone'].set('+966500000000');
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector(
      '.public-checkout__primary',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Preview mode');
  });

  it('uses RTL for Arabic locale in checkout', async () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('ar');
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    expect(document.documentElement.dir).toBe('rtl');
    expect(fixture.nativeElement.textContent).toContain('إتمام الطلب');
  });

  it('uses LTR for English locale in checkout', async () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('en');
    const fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();

    expect(document.documentElement.dir).toBe('ltr');
    expect(fixture.nativeElement.textContent).toContain('Checkout');
  });
});
