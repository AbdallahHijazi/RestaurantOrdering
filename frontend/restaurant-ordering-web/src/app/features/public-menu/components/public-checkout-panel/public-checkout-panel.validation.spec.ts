import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../../../core/localization/locale';
import { PublicCartService } from '../../data-access/public-cart.service';
import { MOCK_PUBLIC_MENU } from '../../data-access/public-menu-mock.data';
import { PublicCheckoutPanel } from './public-checkout-panel';

/** BUG-012 (customer phone validation) and BUG-013 (one idempotency key per logical attempt). */
describe('PublicCheckoutPanel validation and idempotency', () => {
  let fixture: ComponentFixture<PublicCheckoutPanel>;
  let cart: PublicCartService;
  const settings = MOCK_PUBLIC_MENU.orderSettings;
  const item = MOCK_PUBLIC_MENU.items[0]!;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [PublicCheckoutPanel, FormsModule] });
    TestBed.inject(LocaleService).setLocale('en');
    cart = TestBed.inject(PublicCartService);
    cart.initForRestaurant('restaurant-a');
    cart.addMenuItem(item);
    fixture = TestBed.createComponent(PublicCheckoutPanel);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('slug', 'restaurant-a');
    fixture.componentRef.setInput('orderSettings', settings);
    fixture.detectChanges();
    fixture.componentInstance['guestName'].set('Guest');
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it.each(['abc', 'phone', '123', '123456', '12345678901234567890', '++966500000000', '0500 abc 000'])(
    'rejects the invalid phone "%s" before any request is sent',
    (phone) => {
      fixture.componentInstance['guestPhone'].set(phone);

      fixture.componentInstance['submit']();

      expect(fixture.componentInstance['errorMessage']()).toBe(
        TestBed.inject(LocaleService).uiText('publicCheckoutGuestPhoneInvalid'),
      );
      expect(fixture.componentInstance['submitting']()).toBe(false);
    },
  );

  it('keeps the submit button enabled for a non-empty invalid phone so the user receives the message', () => {
    fixture.componentInstance['guestPhone'].set('abc');
    expect(fixture.componentInstance['canSubmit']()).toBe(true);
  });

  it('asks for a phone when it is empty', () => {
    fixture.componentInstance['guestPhone'].set('   ');

    fixture.componentInstance['submit']();

    expect(fixture.componentInstance['errorMessage']()).toBe(
      TestBed.inject(LocaleService).uiText('publicCheckoutGuestPhone'),
    );
  });

  it('reuses the key for a retry of the identical request', () => {
    fixture.componentInstance['guestPhone'].set('+966500000000');

    const first = fixture.componentInstance['buildRequest']();
    const retry = fixture.componentInstance['buildRequest']();

    expect(first.idempotencyKey).toBeTruthy();
    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
  });

  it('issues a new key as soon as the request content changes', () => {
    fixture.componentInstance['guestPhone'].set('+966500000000');
    const first = fixture.componentInstance['buildRequest']();

    fixture.componentInstance['orderNotes'].set('no onions');
    const edited = fixture.componentInstance['buildRequest']();

    expect(edited.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it('uses a different key for two separate checkouts with identical content', () => {
    fixture.componentInstance['guestPhone'].set('+966500000000');
    const first = fixture.componentInstance['buildRequest']();

    // simulate a completed order: attempt state is cleared, the same cart is ordered again
    (fixture.componentInstance as unknown as { checkoutAttempt: unknown }).checkoutAttempt = null;
    const second = fixture.componentInstance['buildRequest']();

    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });
});
